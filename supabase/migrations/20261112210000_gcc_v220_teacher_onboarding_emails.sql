-- GCC V22.0: reliable, English-only teacher onboarding notification jobs.
-- Pending application -> founder notification; approved application -> teacher email.
-- Existing applications are deliberately not backfilled, preventing surprise mail.
create table if not exists public.gcc_v220_teacher_mail_jobs (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.gcc_v120_applications(id) on delete cascade,
  event_type text not null check (event_type in ('admin_new_application','teacher_approved')),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','sending','retry','sent','failed','skipped')),
  attempts smallint not null default 0 check (attempts between 0 and 5),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  provider_email_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (application_id,event_type,recipient_user_id)
);
create index if not exists gcc_v220_teacher_mail_due_idx
  on public.gcc_v220_teacher_mail_jobs(next_attempt_at,created_at)
  where status in ('pending','retry','sending') and attempts<5;
alter table public.gcc_v220_teacher_mail_jobs enable row level security;
revoke all on public.gcc_v220_teacher_mail_jobs from public,anon,authenticated;

create or replace function public.gcc_v220_enqueue_teacher_emails()
returns trigger language plpgsql security definer set search_path=''
as $trigger$
declare founder_user uuid;
begin
  if old.status is not distinct from new.status then return new; end if;
  if new.status='pending' and old.status='draft' then
    -- A founder-admin receives the application, not all hosts/co-hosts.
    select t.auth_user_id into founder_user
    from public.teachers t
    join public.profiles p on p.id=t.auth_user_id and p.role='host'
    join auth.users u on u.id=t.auth_user_id
    where t.gcc_founder is true and t.is_active is true
      and u.email_confirmed_at is not null and nullif(btrim(u.email),'') is not null
    order by t.created_at, t.id limit 1;
    if founder_user is not null then
      insert into public.gcc_v220_teacher_mail_jobs(application_id,event_type,recipient_user_id)
      values(new.id,'admin_new_application',founder_user)
      on conflict (application_id,event_type,recipient_user_id) do nothing;
    end if;
  elsif new.status='approved' and old.status='pending' then
    if exists(select 1 from auth.users u where u.id=new.user_id
       and u.email_confirmed_at is not null and nullif(btrim(u.email),'') is not null) then
      insert into public.gcc_v220_teacher_mail_jobs(application_id,event_type,recipient_user_id)
      values(new.id,'teacher_approved',new.user_id)
      on conflict (application_id,event_type,recipient_user_id) do nothing;
    end if;
  elsif new.status='rejected' then
    -- Suppress stale pending notices if an application was rejected quickly.
    update public.gcc_v220_teacher_mail_jobs
    set status='skipped',failure_code='application_rejected'
    where application_id=new.id and event_type='admin_new_application'
      and status in ('pending','retry');
  end if;
  return new;
end
$trigger$;
revoke all on function public.gcc_v220_enqueue_teacher_emails() from public,anon,authenticated;
drop trigger if exists gcc_v220_application_mail_on_transition on public.gcc_v120_applications;
create trigger gcc_v220_application_mail_on_transition
  after update of status on public.gcc_v120_applications
  for each row execute function public.gcc_v220_enqueue_teacher_emails();

create or replace function public.gcc_v220_claim_teacher_emails(p_limit integer default 5)
returns table(
  job_id uuid, lease_id uuid, event_type text, recipient_email text,
  teacher_name text, school_name text, country_name text, applicant_email text
)
language plpgsql security definer set search_path=''
as $claim$
begin
  if p_limit is null or p_limit not between 1 and 10 then
    raise exception 'Invalid mail batch size';
  end if;
  return query
    with due as (
      select j.id from public.gcc_v220_teacher_mail_jobs j
      join public.gcc_v120_applications a on a.id=j.application_id
      where j.attempts<5 and j.next_attempt_at<=now()
        and (j.status in ('pending','retry')
             or (j.status='sending' and j.lease_expires_at<now()))
        and ((j.event_type='admin_new_application' and a.status in ('pending','approved'))
             or (j.event_type='teacher_approved' and a.status='approved'))
      order by j.created_at,j.id
      for update of j skip locked
      limit p_limit
    ),
    claimed as (
      update public.gcc_v220_teacher_mail_jobs j
      set status='sending',attempts=j.attempts+1,
          lease_token=gen_random_uuid(),
          lease_expires_at=now()+interval '2 minutes'
      from due where due.id=j.id
      returning j.id,j.lease_token,j.event_type,j.recipient_user_id,j.application_id
    )
    select c.id,c.lease_token,c.event_type,u.email::text,
      a.teacher_name,a.school_name,a.school_country,au.email::text
    from claimed c
    join public.gcc_v120_applications a on a.id=c.application_id
    join auth.users u on u.id=c.recipient_user_id and u.email_confirmed_at is not null
    join auth.users au on au.id=a.user_id;
end
$claim$;
revoke all on function public.gcc_v220_claim_teacher_emails(integer) from public,anon,authenticated;
grant execute on function public.gcc_v220_claim_teacher_emails(integer) to service_role;

create or replace function public.gcc_v220_finish_teacher_email(
 p_job_id uuid,p_lease_id uuid,p_outcome text,
 p_provider_email_id text default null,p_failure_code text default null
) returns boolean language plpgsql security definer set search_path=''
as $finish$
declare updated_count integer;
begin
  if p_outcome not in ('sent','retry','failed') then raise exception 'Invalid email outcome';end if;
  update public.gcc_v220_teacher_mail_jobs j
  set status=case when p_outcome='retry' and j.attempts>=5 then 'failed'
                  else p_outcome end,
      sent_at=case when p_outcome='sent' then now() else j.sent_at end,
      provider_email_id=case when p_outcome='sent'
                      then left(coalesce(p_provider_email_id,''),160) else j.provider_email_id end,
      failure_code=case when p_outcome='sent' then null
                  else left(coalesce(p_failure_code,'provider_error'),80) end,
      next_attempt_at=case when p_outcome='retry'
         then now()+make_interval(mins=>case j.attempts
             when 1 then 1 when 2 then 2 when 3 then 4 else 8 end)
         else j.next_attempt_at end,
      lease_token=null,lease_expires_at=null
  where j.id=p_job_id and j.lease_token=p_lease_id and j.status='sending';
  get diagnostics updated_count=row_count;
  return updated_count=1;
end
$finish$;
revoke all on function public.gcc_v220_finish_teacher_email(uuid,uuid,text,text,text)
  from public,anon,authenticated;
grant execute on function public.gcc_v220_finish_teacher_email(uuid,uuid,text,text,text) to service_role;

-- A cheap conditional one-minute scheduler. Webhook secret stays in Supabase Vault.
select cron.schedule(
  'gcc-v220-teacher-onboarding-email',
  '* * * * *',
  $schedule$
  select net.http_post(
    url:='https://ayrflycncfbvizlfchce.supabase.co/functions/v1/gcc-teacher-onboarding-email',
    headers:=jsonb_build_object(
       'Content-Type','application/json',
       'Authorization','Bearer '||(select decrypted_secret
         from vault.decrypted_secrets where name='gcc_mail_webhook_token')
    ),
    body:='{"event":"process"}'::jsonb,
    timeout_milliseconds:=12000
  ) as request_id
  where exists(
    select 1 from public.gcc_v220_teacher_mail_jobs j
    where j.attempts<5 and j.next_attempt_at<=now()
      and (j.status in ('pending','retry')
           or (j.status='sending' and j.lease_expires_at<now()))
  );
  $schedule$
);
