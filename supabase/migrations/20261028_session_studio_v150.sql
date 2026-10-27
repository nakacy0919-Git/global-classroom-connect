-- GCC V15.0: expanded classroom exchange offers. Existing V5 RPCs remain callable.
-- Only approved teachers can register or browse offers; no direct table grants.
alter table public.exchange_availability
 add column if not exists session_details jsonb not null default '{}'::jsonb;

create or replace function public.gcc_v150_teacher_register_session(
 p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,
 p_student_count integer,p_room_count integer,p_age_band text,
 p_topic text default '',p_notes text default '',p_details jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 tid uuid:=public.gcc_current_teacher_id();
 offer uuid;
 cleaned jsonb;
 levels jsonb;
begin
 if p_details is null or jsonb_typeof(p_details)<>'object' then
   raise exception 'Invalid session details';
 end if;
 if octet_length(p_details::text)>3500 then raise exception 'Session details are too long'; end if;
 if jsonb_typeof(p_details->'session_name')<>'string'
    or char_length(btrim(p_details->>'session_name')) not between 3 and 120 then
   raise exception 'Session name must be 3 to 120 characters';
 end if;
 if coalesce(p_details->>'mode','') not in ('device','classroom','hybrid') then
   raise exception 'Select a session format';
 end if;
 levels:=p_details->'target_levels';
 if jsonb_typeof(levels)<>'array' or jsonb_array_length(levels) not between 1 and 5
    or exists (select 1 from jsonb_array_elements_text(levels) as t(level)
     where t.level not in ('Primary','Lower Secondary','Upper Secondary','University','Mixed')) then
   raise exception 'Select valid partner school levels';
 end if;
 if p_details ? 'sdg' and p_details->>'sdg' is not null
    and (p_details->>'sdg' !~ '^([1-9]|1[0-7])$') then
   raise exception 'Invalid SDG goal';
 end if;
 if char_length(coalesce(p_details->>'language',''))>100
  or char_length(coalesce(p_details->>'english_level',''))>80
  or char_length(coalesce(p_details->>'goals',''))>400 then
   raise exception 'One or more description fields are too long';
 end if;
 cleaned:=jsonb_build_object(
  'session_name',btrim(p_details->>'session_name'),
  'mode',p_details->>'mode',
  'target_levels',levels,
  'sdg',case when p_details->>'sdg' ~ '^([1-9]|1[0-7])$' then (p_details->>'sdg')::int else null end,
  'language',btrim(coalesce(p_details->>'language','')),
  'english_level',btrim(coalesce(p_details->>'english_level','')),
  'goals',btrim(coalesce(p_details->>'goals',''))
 );
 -- Keep the existing ownership checks and session-window/participant validation.
 offer:=public.gcc_teacher_register_session(
  p_starts_at,p_ends_at,p_timezone,p_student_count,p_room_count,p_age_band,p_topic,p_notes);
 update public.exchange_availability
    set session_details=cleaned
  where id=offer and teacher_id=tid;
 if not found then raise exception 'Unable to save session details'; end if;
 return offer;
end $$;

revoke all on function public.gcc_v150_teacher_register_session(
 timestamptz,timestamptz,text,integer,integer,text,text,text,jsonb) from public,anon;
grant execute on function public.gcc_v150_teacher_register_session(
 timestamptz,timestamptz,text,integer,integer,text,text,text,jsonb) to authenticated;

-- Preserve the established teacher-scoped search and avoid returning private notes.
create or replace function public.gcc_teacher_browse_sessions()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare tid uuid:=public.gcc_current_teacher_id(); items jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at),'[]'::jsonb) into items
 from (select a.id,a.teacher_id,t.display_name as teacher_name,s.name as school_name,
   s.country_name,s.country_code,a.starts_at,a.ends_at,a.timezone,a.student_count,
   a.room_count,a.age_band,a.topic,a.status,a.session_details,(a.teacher_id=tid) as is_mine
   from public.exchange_availability a
   join public.teachers t on t.id=a.teacher_id and t.is_active=true
   join public.schools s on s.id=t.school_id
   where a.ends_at>now() and (a.status='open' or a.teacher_id=tid)
   order by a.starts_at asc limit 300) x;
 return items;
end $$;

-- Host identity is taken from approved records, never from form-supplied identity.
create or replace function public.gcc_teacher_identity()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare tid uuid:=public.gcc_current_teacher_id(); payload jsonb;
begin
 select jsonb_build_object('id',t.id,'name',t.display_name,'school',s.name,
  'country',s.country_name,'country_code',s.country_code,
  'school_level',s.school_level,'timezone',coalesce(s.timezone,'Asia/Tokyo'))
 into payload from public.teachers t join public.schools s on s.id=t.school_id where t.id=tid;
 if payload is null then raise exception 'Please ask the host to link your school'; end if;
 return payload;
end $$;
