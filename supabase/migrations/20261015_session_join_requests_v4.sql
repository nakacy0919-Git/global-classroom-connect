-- GCC V4: host-assisted join requests. No existing tables or rows modified.
-- Host-only RLS: do not make anonymous or unapproved teachers able to read/write.
create table if not exists public.session_join_requests (
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null references public.exchange_availability(id) on delete restrict,
 requesting_teacher_id uuid not null references public.teachers(id) on delete restrict,
 status text not null default 'pending' check(status in ('pending','approved','declined')),
 message text not null default '' check(char_length(message)<=500),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 constraint session_join_requests_one_per_teacher unique(offer_id,requesting_teacher_id)
);
create index if not exists session_join_requests_status_idx on public.session_join_requests(status,created_at desc);
create index if not exists session_join_requests_offer_idx on public.session_join_requests(offer_id);
alter table public.session_join_requests enable row level security;

-- Guard invariants in database, even if a malicious host client bypasses form validation.
create or replace function public.gcc_guard_join_request() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare host_teacher uuid; closing_at timestamptz; offer_status text;
begin
 if tg_op='INSERT' then
   select e.teacher_id,e.ends_at,e.status into host_teacher,closing_at,offer_status
     from public.exchange_availability e where e.id=new.offer_id;
   if host_teacher is null then raise exception 'Session does not exist'; end if;
   if new.requesting_teacher_id=host_teacher then raise exception 'A teacher cannot join their own session'; end if;
   if offer_status<>'open' or closing_at<=now() then
      raise exception 'This session is no longer accepting requests';
   end if;
   if new.status<>'pending' then raise exception 'New requests must be pending'; end if;
   if new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'New requests cannot have a decision';
   end if;
 elsif tg_op='UPDATE' then
   if (new.offer_id,new.requesting_teacher_id,new.created_by,new.created_at)
      is distinct from (old.offer_id,old.requesting_teacher_id,old.created_by,old.created_at)
      then raise exception 'Join request identities are immutable'; end if;
   if old.status<>'pending' and new.status is distinct from old.status then
      raise exception 'A reviewed request cannot be changed';
   end if;
   if new.status is distinct from old.status then
      if new.status not in ('approved','declined') then raise exception 'Invalid decision'; end if;
      if new.reviewed_by is null then raise exception 'Reviewing user required'; end if;
      new.reviewed_at=now();
   end if;
 end if;
 return new;
end $$;
drop trigger if exists gcc_guard_join_request_trigger on public.session_join_requests;
create trigger gcc_guard_join_request_trigger before insert or update on public.session_join_requests
 for each row execute function public.gcc_guard_join_request();

drop policy if exists "Hosts manage session join requests" on public.session_join_requests;
create policy "Hosts manage session join requests" on public.session_join_requests
 for all to authenticated
 using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='host'))
 with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='host'));
grant select,insert,update,delete on public.session_join_requests to authenticated;
