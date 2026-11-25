-- GCC V24.1: staged legacy V6 capacity parity. Preserve original public contract.
-- Review against live definition immediately before any authorized deployment.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v6_submit_signup(p_code text, p_event_id uuid, p_teacher_name text, p_school_name text, p_country_code text, p_country_name text, p_students jsonb, p_facilitators jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cid uuid; sid uuid;student jsonb;fac jsonb;row_idx integer:=0;existing record; settings_max integer; students_total integer;
begin
if p_code is null or p_code !~ '^[a-f0-9]{32} raise exception 'Invalid invitation code';end if;
-- Match the V8 event lock before taking the code lock or reading capacity.
perform 1 from public.events where id=p_event_id and status='published' and starts_at>clock_timestamp() for update;
if not found then raise exception 'Choose an upcoming published session';end if;
select id into cid from public.gcc_session_codes
where code_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex')
and expires_at>clock_timestamp() and revoked_at is null for update;
if cid is null then raise exception 'Invitation code has expired or is invalid';end if;
if length(btrim(coalesce(p_teacher_name,''))) not between 2 and 120
or length(btrim(coalesce(p_school_name,''))) not between 2 and 160
or length(btrim(coalesce(p_country_name,''))) not between 2 and 100
or coalesce(p_country_code,'') !~ '^[A-Z]{2}
then raise exception 'Teacher, school, and country must all be provided';end if;
select s.teacher_name,s.school_name,s.country_code into existing
from public.gcc_session_signups s where s.code_id=cid limit 1;
if found and (lower(btrim(existing.teacher_name))<>lower(btrim(p_teacher_name))
or lower(btrim(existing.school_name))<>lower(btrim(p_school_name))
or existing.country_code<>p_country_code)
then raise exception 'This invitation code is already associated with another teacher or school';end if;
if p_students is null or jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students) not between 1 and 500
then raise exception 'Please provide 1 to 500 students';end if;
if p_facilitators is null or jsonb_typeof(p_facilitators)<>'array' or jsonb_array_length(p_facilitators)>50
then raise exception 'Provide at most 50 facilitators';end if;
for student in select value from jsonb_array_elements(p_students) loop
if jsonb_typeof(student)<>'object' or
length(btrim(coalesce(student->>'name',''))) not between 1 and 120 or
length(coalesce(student->>'grade',''))>40
then raise exception 'Each student needs a valid name and optional grade';end if;
end loop;
for fac in select value from jsonb_array_elements(p_facilitators) loop
if jsonb_typeof(fac)<>'string' or length(btrim(trim(both '"' from fac::text))) not between 2 and 120
then raise exception 'Invalid facilitator name';end if;
end loop;
-- Keep the legacy invitation association rule; also enforce modern V8 capacity/duplicate limits.
if exists(select 1 from public.gcc_session_signups s where s.event_id=p_event_id and s.status in ('pending','approved')
 and lower(btrim(s.teacher_name))=lower(btrim(p_teacher_name)) and lower(btrim(s.school_name))=lower(btrim(p_school_name)) and s.country_code=p_country_code)
then raise exception 'This teacher and school already registered for this session. Contact the host to make changes.';end if;
select max_students into settings_max from public.gcc_session_settings where event_id=p_event_id;
settings_max:=coalesce(settings_max,150);
select count(*)::integer into students_total from public.gcc_session_signup_students st join public.gcc_session_signups s on st.signup_id=s.id
 where s.event_id=p_event_id and s.status in ('pending','approved');
if students_total+jsonb_array_length(p_students)>settings_max then raise exception 'This session has reached its registration capacity';end if;
if (select count(*) from public.gcc_session_signups where event_id=p_event_id and status='pending')>=120 then raise exception 'Registration queue is temporarily full. Please contact the host.';end if;
insert into public.gcc_session_signups(event_id,code_id,teacher_name,school_name,country_code,country_name,facilitators)
values(p_event_id,cid,btrim(p_teacher_name),btrim(p_school_name),p_country_code,btrim(p_country_name),p_facilitators)
returning id into sid;
for student in select value from jsonb_array_elements(p_students) loop
row_idx:=row_idx+1;
insert into public.gcc_session_signup_students(signup_id,display_name,grade,sort_order)
values(sid,btrim(student->>'name'),btrim(coalesce(student->>'grade','')),row_idx);
end loop;
return sid;
end $function$
 then raise exception 'Invalid invitation code';end if;
select id into cid from public.gcc_session_codes
where code_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex')
and expires_at>now() and revoked_at is null;
if cid is null then raise exception 'Invitation code has expired or is invalid';end if;
if not exists(select 1 from public.events where id=p_event_id and status='published' and starts_at>now())
then raise exception 'Choose an upcoming published session';end if;
if length(btrim(coalesce(p_teacher_name,''))) not between 2 and 120
or length(btrim(coalesce(p_school_name,''))) not between 2 and 160
or length(btrim(coalesce(p_country_name,''))) not between 2 and 100
or coalesce(p_country_code,'') !~ '^[A-Z]{2}$'
then raise exception 'Teacher, school, and country must all be provided';end if;
select s.teacher_name,s.school_name,s.country_code into existing
from public.gcc_session_signups s where s.code_id=cid limit 1;
if found and (lower(btrim(existing.teacher_name))<>lower(btrim(p_teacher_name))
or lower(btrim(existing.school_name))<>lower(btrim(p_school_name))
or existing.country_code<>p_country_code)
then raise exception 'This invitation code is already associated with another teacher or school';end if;
if p_students is null or jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students) not between 1 and 500
then raise exception 'Please provide 1 to 500 students';end if;
if p_facilitators is null or jsonb_typeof(p_facilitators)<>'array' or jsonb_array_length(p_facilitators)>50
then raise exception 'Provide at most 50 facilitators';end if;
for student in select value from jsonb_array_elements(p_students) loop
if jsonb_typeof(student)<>'object' or
length(btrim(coalesce(student->>'name',''))) not between 1 and 120 or
length(coalesce(student->>'grade',''))>40
then raise exception 'Each student needs a valid name and optional grade';end if;
end loop;
for fac in select value from jsonb_array_elements(p_facilitators) loop
if jsonb_typeof(fac)<>'string' or length(btrim(trim(both '"' from fac::text))) not between 2 and 120
then raise exception 'Invalid facilitator name';end if;
end loop;
insert into public.gcc_session_signups(event_id,code_id,teacher_name,school_name,country_code,country_name,facilitators)
values(p_event_id,cid,btrim(p_teacher_name),btrim(p_school_name),p_country_code,btrim(p_country_name),p_facilitators)
returning id into sid;
for student in select value from jsonb_array_elements(p_students) loop
row_idx:=row_idx+1;
insert into public.gcc_session_signup_students(signup_id,display_name,grade,sort_order)
values(sid,btrim(student->>'name'),btrim(coalesce(student->>'grade','')),row_idx);
end loop;
return sid;
end $function$

or not exists(select 1 from public.gcc_v6_country_codes where code=p_country_code)
then raise exception 'Teacher, school, and country must all be provided';end if;
select s.teacher_name,s.school_name,s.country_code into existing
from public.gcc_session_signups s where s.code_id=cid limit 1;
if found and (lower(btrim(existing.teacher_name))<>lower(btrim(p_teacher_name))
or lower(btrim(existing.school_name))<>lower(btrim(p_school_name))
or existing.country_code<>p_country_code)
then raise exception 'This invitation code is already associated with another teacher or school';end if;
if p_students is null or jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students) not between 1 and 500
then raise exception 'Please provide 1 to 500 students';end if;
if p_facilitators is null or jsonb_typeof(p_facilitators)<>'array' or jsonb_array_length(p_facilitators)>50
then raise exception 'Provide at most 50 facilitators';end if;
for student in select value from jsonb_array_elements(p_students) loop
if jsonb_typeof(student)<>'object' or
length(btrim(coalesce(student->>'name',''))) not between 1 and 120 or
length(coalesce(student->>'grade',''))>40
then raise exception 'Each student needs a valid name and optional grade';end if;
end loop;
for fac in select value from jsonb_array_elements(p_facilitators) loop
if jsonb_typeof(fac)<>'string' or length(btrim(trim(both '"' from fac::text))) not between 2 and 120
then raise exception 'Invalid facilitator name';end if;
end loop;
insert into public.gcc_session_signups(event_id,code_id,teacher_name,school_name,country_code,country_name,facilitators)
values(p_event_id,cid,btrim(p_teacher_name),btrim(p_school_name),p_country_code,btrim(p_country_name),p_facilitators)
returning id into sid;
for student in select value from jsonb_array_elements(p_students) loop
row_idx:=row_idx+1;
insert into public.gcc_session_signup_students(signup_id,display_name,grade,sort_order)
values(sid,btrim(student->>'name'),btrim(coalesce(student->>'grade','')),row_idx);
end loop;
return sid;
end $function$
 then raise exception 'Invalid invitation code';end if;
select id into cid from public.gcc_session_codes
where code_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex')
and expires_at>now() and revoked_at is null;
if cid is null then raise exception 'Invitation code has expired or is invalid';end if;
if not exists(select 1 from public.events where id=p_event_id and status='published' and starts_at>now())
then raise exception 'Choose an upcoming published session';end if;
if length(btrim(coalesce(p_teacher_name,''))) not between 2 and 120
or length(btrim(coalesce(p_school_name,''))) not between 2 and 160
or length(btrim(coalesce(p_country_name,''))) not between 2 and 100
or coalesce(p_country_code,'') !~ '^[A-Z]{2}$'
then raise exception 'Teacher, school, and country must all be provided';end if;
select s.teacher_name,s.school_name,s.country_code into existing
from public.gcc_session_signups s where s.code_id=cid limit 1;
if found and (lower(btrim(existing.teacher_name))<>lower(btrim(p_teacher_name))
or lower(btrim(existing.school_name))<>lower(btrim(p_school_name))
or existing.country_code<>p_country_code)
then raise exception 'This invitation code is already associated with another teacher or school';end if;
if p_students is null or jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students) not between 1 and 500
then raise exception 'Please provide 1 to 500 students';end if;
if p_facilitators is null or jsonb_typeof(p_facilitators)<>'array' or jsonb_array_length(p_facilitators)>50
then raise exception 'Provide at most 50 facilitators';end if;
for student in select value from jsonb_array_elements(p_students) loop
if jsonb_typeof(student)<>'object' or
length(btrim(coalesce(student->>'name',''))) not between 1 and 120 or
length(coalesce(student->>'grade',''))>40
then raise exception 'Each student needs a valid name and optional grade';end if;
end loop;
for fac in select value from jsonb_array_elements(p_facilitators) loop
if jsonb_typeof(fac)<>'string' or length(btrim(trim(both '"' from fac::text))) not between 2 and 120
then raise exception 'Invalid facilitator name';end if;
end loop;
insert into public.gcc_session_signups(event_id,code_id,teacher_name,school_name,country_code,country_name,facilitators)
values(p_event_id,cid,btrim(p_teacher_name),btrim(p_school_name),p_country_code,btrim(p_country_name),p_facilitators)
returning id into sid;
for student in select value from jsonb_array_elements(p_students) loop
row_idx:=row_idx+1;
insert into public.gcc_session_signup_students(signup_id,display_name,grade,sort_order)
values(sid,btrim(student->>'name'),btrim(coalesce(student->>'grade','')),row_idx);
end loop;
return sid;
end $function$;
REVOKE ALL ON FUNCTION public.gcc_v6_submit_signup(text,uuid,text,text,text,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v6_submit_signup(text,uuid,text,text,text,text,jsonb,jsonb) TO anon,authenticated;
COMMIT;
