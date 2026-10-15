-- Global Classroom Connect V5 - invite-gated, independently authenticated teacher workspace.
-- All existing host-only policies remain intact. No email addresses are exposed in teacher-facing feeds.
create table if not exists public.gcc_teacher_invites (
  teacher_id uuid primary key references public.teachers(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.gcc_teacher_invites enable row level security;
-- Deliberately no RLS policies or direct grants on invite secrets.
revoke all on public.gcc_teacher_invites from anon, authenticated;

-- Host generates a single-use secret; the plaintext is shown only at issuance.
create or replace function public.gcc_issue_teacher_invite(p_teacher_id uuid)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare token text; teacher_email text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host') then
   raise exception 'Host permission required';
 end if;
 select t.email into teacher_email from public.teachers t
  where t.id=p_teacher_id and t.is_active=true and t.auth_user_id is null;
 if teacher_email is null or btrim(teacher_email)='' then
   raise exception 'Choose an active, unlinked teacher with a registered email address';
 end if;
 token=replace(gen_random_uuid()::text,'-','');
 insert into public.gcc_teacher_invites(teacher_id,token_hash,expires_at,created_at,used_at,used_by)
   values(p_teacher_id,encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '7 days',now(),null,null)
   on conflict(teacher_id) do update set
     token_hash=excluded.token_hash, expires_at=excluded.expires_at,
     created_at=now(),used_at=null,used_by=null;
 return token;
end $$;

-- Signing in alone never grants teacher access. Claim requires BOTH a host-issued secret and
-- a verified email match to the approved teachers record; the code is consumed atomically.
create or replace function public.gcc_claim_teacher_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid:=auth.uid(); email_address text; linked_id uuid; matched uuid;
begin
 if uid is null then raise exception 'Sign in before using your invite'; end if;
 if p_token !~ '^[a-f0-9]{32}$' then raise exception 'Invalid invite code'; end if;
 select lower(email) into email_address from auth.users where id=uid and email_confirmed_at is not null;
 if email_address is null then raise exception 'Confirm your email address before activating teacher access'; end if;
 if exists(select 1 from public.profiles where id=uid and role='host') then
   raise exception 'Host accounts cannot claim teacher invitations';
 end if;
 select i.teacher_id into matched
 from public.gcc_teacher_invites i join public.teachers t on t.id=i.teacher_id
 where i.token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex')
   and i.expires_at>now() and i.used_at is null
   and t.is_active=true and lower(btrim(t.email))=email_address
   and (t.auth_user_id is null or t.auth_user_id=uid)
 for update of i;
 if matched is null then raise exception 'Invite expired, already used, or not associated with this verified email'; end if;
 if exists(select 1 from public.teachers t where t.auth_user_id=uid and t.id<>matched) then
   raise exception 'Account already linked to a different teacher';
 end if;
 update public.teachers set auth_user_id=uid where id=matched;
 insert into public.profiles(id,display_name,role)
   select uid,t.display_name,'teacher' from public.teachers t where t.id=matched
   on conflict(id) do update set display_name=excluded.display_name
     where public.profiles.role='teacher';
 update public.gcc_teacher_invites set used_at=now(),used_by=uid where teacher_id=matched;
 return matched;
end $$;

-- Internal actor validation shared by RPCs. No grant to clients; SECURITY DEFINER callers only.
create or replace function public.gcc_current_teacher_id()
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid;
begin
 if auth.uid() is null then raise exception 'Teacher sign-in required'; end if;
 select t.id into tid from public.teachers t join public.profiles p on p.id=t.auth_user_id
  where t.auth_user_id=auth.uid() and t.is_active=true and p.role='teacher';
 if tid is null then raise exception 'Teacher account not activated. Enter the invite code provided by your host.'; end if;
 return tid;
end $$;

create or replace function public.gcc_teacher_identity()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid:=public.gcc_current_teacher_id(); payload jsonb;
begin
 select jsonb_build_object('id',t.id,'name',t.display_name,'school',s.name,
   'country',s.country_name,'country_code',s.country_code,'timezone',coalesce(s.timezone,'Asia/Tokyo'))
 into payload from public.teachers t join public.schools s on s.id=t.school_id where t.id=tid;
 if payload is null then raise exception 'Please ask the host to link your school'; end if;
 return payload;
end $$;

-- Expose only non-sensitive session listing fields, never teachers.email or private notes.
create or replace function public.gcc_teacher_browse_sessions()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid:=public.gcc_current_teacher_id(); items jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at),'[]'::jsonb) into items
 from (select a.id,a.teacher_id,t.display_name as teacher_name,s.name as school_name,
   s.country_name,s.country_code,a.starts_at,a.ends_at,a.timezone,a.student_count,
   a.room_count,a.age_band,a.topic,a.status,(a.teacher_id=tid) as is_mine
   from public.exchange_availability a
   join public.teachers t on t.id=a.teacher_id and t.is_active=true
   join public.schools s on s.id=t.school_id
   where a.ends_at>now() and (a.status='open' or a.teacher_id=tid)
   order by a.starts_at asc limit 300) x;
 return items;
end $$;

create or replace function public.gcc_teacher_register_session(
 p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,
 p_student_count integer,p_room_count integer,p_age_band text,p_topic text default '',p_notes text default ''
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid:=public.gcc_current_teacher_id(); code text; offer uuid;
begin
 if p_starts_at<=now() or p_ends_at<=p_starts_at or p_ends_at>p_starts_at+interval '6 hours'
    or p_ends_at<p_starts_at+interval '30 minutes' then raise exception 'Choose a future window of 30 minutes to 6 hours'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then
   raise exception 'Invalid IANA time zone'; end if;
 select s.country_code into code from public.teachers t join public.schools s on t.school_id=s.id
   where t.id=tid and s.is_active=true;
 if code is null or code !~ '^[A-Z]{2}$' then raise exception 'School must have a valid country code'; end if;
 insert into public.exchange_availability(teacher_id,country_code,timezone,starts_at,ends_at,
   student_count,room_count,age_band,topic,notes,status,created_by)
 values(tid,code,p_timezone,p_starts_at,p_ends_at,p_student_count,p_room_count,p_age_band,
  btrim(coalesce(p_topic,'')),btrim(coalesce(p_notes,'')),'open',auth.uid()) returning id into offer;
 return offer;
end $$;

create or replace function public.gcc_teacher_close_session(p_offer_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid:=public.gcc_current_teacher_id(); changed integer;
begin
 update public.exchange_availability set status='closed',updated_at=now()
  where id=p_offer_id and teacher_id=tid and status='open';
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Only your own open sessions can be closed'; end if;
 return true;
end $$;

create or replace function public.gcc_teacher_apply_to_session(p_offer_id uuid,p_message text default '')
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid:=public.gcc_current_teacher_id(); target uuid; request_id uuid;
begin
 if char_length(coalesce(p_message,''))>500 then raise exception 'Message is too long'; end if;
 select a.teacher_id into target from public.exchange_availability a
   where a.id=p_offer_id and a.status='open' and a.ends_at>now();
 if target is null then raise exception 'Session is no longer open'; end if;
 if target=tid then raise exception 'You cannot request your own session'; end if;
 insert into public.session_join_requests(offer_id,requesting_teacher_id,status,message,created_by)
  values(p_offer_id,tid,'pending',btrim(coalesce(p_message,'')),auth.uid())
  returning id into request_id;
 return request_id;
end $$;

create or replace function public.gcc_teacher_list_requests()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid:=public.gcc_current_teacher_id(); result jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result
 from (select r.id,r.offer_id,r.status,r.message,r.created_at,r.requesting_teacher_id,
     a.teacher_id as host_teacher_id,h.display_name as host_name,g.display_name as guest_name,
     a.starts_at,a.timezone,a.topic,sh.country_code as host_country,
     case when a.teacher_id=tid then 'incoming' else 'outgoing' end as direction
     from public.session_join_requests r
     join public.exchange_availability a on a.id=r.offer_id
     join public.teachers h on h.id=a.teacher_id
     join public.teachers g on g.id=r.requesting_teacher_id
     left join public.schools sh on sh.id=h.school_id
     where r.requesting_teacher_id=tid or a.teacher_id=tid
     order by r.created_at desc limit 200) x;
 return result;
end $$;

create or replace function public.gcc_teacher_review_request(p_request_id uuid,p_decision text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare tid uuid:=public.gcc_current_teacher_id(); changed integer;
begin
 if p_decision not in ('approved','declined') then raise exception 'Invalid review decision'; end if;
 update public.session_join_requests r set status=p_decision,reviewed_by=auth.uid(),reviewed_at=now()
 from public.exchange_availability a
 where r.id=p_request_id and r.offer_id=a.id and a.teacher_id=tid and r.status='pending';
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Only the session owner can review a pending application'; end if;
 return true;
end $$;

-- Explicitly grant only callable RPCs. Private invite table is never REST-accessible.
revoke all on function public.gcc_issue_teacher_invite(uuid) from public;
revoke all on function public.gcc_claim_teacher_invite(text) from public;
revoke all on function public.gcc_current_teacher_id() from public;
revoke all on function public.gcc_teacher_identity() from public;
revoke all on function public.gcc_teacher_browse_sessions() from public;
revoke all on function public.gcc_teacher_register_session(timestamptz,timestamptz,text,integer,integer,text,text,text) from public;
revoke all on function public.gcc_teacher_close_session(uuid) from public;
revoke all on function public.gcc_teacher_apply_to_session(uuid,text) from public;
revoke all on function public.gcc_teacher_list_requests() from public;
revoke all on function public.gcc_teacher_review_request(uuid,text) from public;
grant execute on function public.gcc_issue_teacher_invite(uuid) to authenticated;
grant execute on function public.gcc_claim_teacher_invite(text) to authenticated;
grant execute on function public.gcc_teacher_identity() to authenticated;
grant execute on function public.gcc_teacher_browse_sessions() to authenticated;
grant execute on function public.gcc_teacher_register_session(timestamptz,timestamptz,text,integer,integer,text,text,text) to authenticated;
grant execute on function public.gcc_teacher_close_session(uuid) to authenticated;
grant execute on function public.gcc_teacher_apply_to_session(uuid,text) to authenticated;
grant execute on function public.gcc_teacher_list_requests() to authenticated;
grant execute on function public.gcc_teacher_review_request(uuid,text) to authenticated;
-- Prevent direct RPC enumeration of current teacher id; used only by controlled definer functions.
revoke all on function public.gcc_current_teacher_id() from authenticated;
