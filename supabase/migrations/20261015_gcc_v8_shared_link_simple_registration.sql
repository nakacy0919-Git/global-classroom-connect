-- V8: public submit-only registration without per-teacher invite codes.
-- Existing V6 invitation flows and approved participant data are retained.
alter table public.gcc_session_signups alter column code_id drop not null;

create table if not exists public.gcc_session_settings (
 event_id uuid primary key references public.events(id) on delete cascade,
 breakout_rooms integer not null default 10 check (breakout_rooms between 1 and 60),
 max_students integer not null default 150 check (max_students between 1 and 2000),
 facilitators_per_room integer not null default 1 check (facilitators_per_room between 0 and 2),
 updated_at timestamptz not null default now()
);
alter table public.gcc_session_settings enable row level security;
revoke all on public.gcc_session_settings from anon,authenticated;

create or replace function public.gcc_v8_get_session_settings()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 perform public.gcc_v6_require_host();
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result
 from (select event_id,breakout_rooms,max_students,facilitators_per_room from public.gcc_session_settings) x;
 return result;
end $$;

create or replace function public.gcc_v8_save_session_settings(
 p_event_id uuid,p_breakout_rooms integer,p_max_students integer,p_facilitators_per_room integer
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.gcc_v6_require_host();
 if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Unknown session';end if;
 if p_breakout_rooms not between 1 and 60 or p_max_students not between 1 and 2000
    or p_facilitators_per_room not between 0 and 2 then raise exception 'Invalid session settings';end if;
 insert into public.gcc_session_settings(event_id,breakout_rooms,max_students,facilitators_per_room)
 values(p_event_id,p_breakout_rooms,p_max_students,p_facilitators_per_room)
 on conflict(event_id) do update set breakout_rooms=excluded.breakout_rooms,
 max_students=excluded.max_students,facilitators_per_room=excluded.facilitators_per_room,updated_at=now();
 return true;
end $$;

create or replace function public.gcc_v8_submit_roster(
 p_event_id uuid,p_teacher_name text,p_school_name text,p_country_code text,p_country_name text,
 p_students jsonb,p_facilitators jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare sid uuid; students_total integer; event_record record;settings_max integer; person jsonb; fac jsonb; count_students integer:=0;
begin
 -- A public link can submit a private registration, but cannot read or edit any existing one.
 select id,status,starts_at into event_record from public.events
 where id=p_event_id for update;
 if event_record.id is null or event_record.status<>'published' or event_record.starts_at<=now()
 then raise exception 'Registration is closed for this session'; end if;
 if coalesce(p_country_code,'') !~ '^[A-Z]{2}$' or
 not exists(select 1 from public.gcc_v6_country_codes where code=p_country_code) or
 length(btrim(coalesce(p_school_name,''))) not between 2 and 160 or
 length(btrim(coalesce(p_country_name,''))) not between 2 and 100 or
 not public.gcc_v7_english_name(p_teacher_name)
 then raise exception 'Please enter a valid country, school, and English teacher name';end if;
 if p_students is null or jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students) not between 1 and 500
 then raise exception 'A registration needs 1 to 500 students';end if;
 if p_facilitators is null or jsonb_typeof(p_facilitators)<>'array' or jsonb_array_length(p_facilitators)>50
 then raise exception 'Invalid facilitator list';end if;
 for person in select value from jsonb_array_elements(p_students) loop
   if jsonb_typeof(person)<>'object' or not public.gcc_v7_english_name(person->>'name')
     or char_length(coalesce(person->>'grade',''))>40
   then raise exception 'Student names must use English letters (A-Z)';end if;
 end loop;
 for fac in select value from jsonb_array_elements(p_facilitators) loop
   if jsonb_typeof(fac)<>'string' or not public.gcc_v7_english_name(fac #>> '{}')
   then raise exception 'Facilitator names must use English letters (A-Z)';end if;
 end loop;
 -- One application from one teacher at a school per session, regardless of invite source.
 if exists (select 1 from public.gcc_session_signups s
   where s.event_id=p_event_id and s.status in ('pending','approved')
   and lower(btrim(s.teacher_name))=lower(btrim(p_teacher_name))
   and lower(btrim(s.school_name))=lower(btrim(p_school_name))
   and s.country_code=p_country_code)
 then raise exception 'This teacher and school already registered for this session. Contact the host to make changes.';end if;
 select coalesce(max_students,150) into settings_max from public.gcc_session_settings where event_id=p_event_id;
 settings_max=coalesce(settings_max,150);
 select count(*)::integer into students_total
 from public.gcc_session_signup_students st join public.gcc_session_signups s on st.signup_id=s.id
 where s.event_id=p_event_id and s.status in ('pending','approved');
 if students_total+jsonb_array_length(p_students)>settings_max then
   raise exception 'This session has reached its registration capacity';end if;
 -- A conservative submission cap limits accidental excessive submissions. Strong anti-bot controls
 -- (e.g. verified Turnstile via an Edge Function) are required before broad public rollout.
 if (select count(*) from public.gcc_session_signups where event_id=p_event_id and status='pending')>=120
 then raise exception 'Registration queue is temporarily full. Please contact the host.';end if;
 insert into public.gcc_session_signups(event_id,code_id,teacher_name,school_name,country_code,country_name,facilitators,status)
 values(p_event_id,null,btrim(p_teacher_name),btrim(p_school_name),p_country_code,btrim(p_country_name),p_facilitators,'pending')
 returning id into sid;
 for person in select value from jsonb_array_elements(p_students) loop
   count_students=count_students+1;
   insert into public.gcc_session_signup_students(signup_id,display_name,grade,sort_order)
   values(sid,btrim(person->>'name'),btrim(coalesce(person->>'grade','')),count_students);
 end loop;
 return sid;
end $$;

revoke all on function public.gcc_v8_get_session_settings() from public,anon,authenticated;
revoke all on function public.gcc_v8_save_session_settings(uuid,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.gcc_v8_submit_roster(uuid,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.gcc_v8_get_session_settings() to authenticated;
grant execute on function public.gcc_v8_save_session_settings(uuid,integer,integer,integer) to authenticated;
grant execute on function public.gcc_v8_submit_roster(uuid,text,text,text,text,jsonb,jsonb) to anon,authenticated;
