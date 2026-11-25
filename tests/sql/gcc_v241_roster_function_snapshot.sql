-- CI ONLY: production function definitions read 2026-11-25, no production rows or credentials.
-- Actual registration/validation bodies on synthetic schema; not a complete production schema.
CREATE OR REPLACE FUNCTION public.gcc_v165_store_pair_requests(p_signup uuid, p_pairs jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE p jsonb;a uuid;b uuid;seen uuid[]:=ARRAY[]::uuid[];n integer;room_count integer;
BEGIN
 IF p_pairs IS NULL OR jsonb_typeof(p_pairs)<>'array' OR jsonb_array_length(p_pairs)>100
 THEN RAISE EXCEPTION 'Invalid pair requests';END IF;
 SELECT count(*) INTO room_count FROM public.gcc_v91_room_drafts d WHERE d.event_id=(SELECT event_id FROM public.gcc_session_signups WHERE id=p_signup);
 FOR p IN SELECT value FROM jsonb_array_elements(p_pairs) LOOP
   IF jsonb_typeof(p)<>'object' OR (p->>'a')!~'^[0-9]+$' OR (p->>'b')!~'^[0-9]+$'
    OR (p->>'room')!~'^[0-9]+$' THEN RAISE EXCEPTION 'Invalid pair details';END IF;
   IF (p->>'a')::integer<0 OR (p->>'b')::integer<0 OR (p->>'a')::integer>499 OR (p->>'b')::integer>499
    OR (p->>'room')::integer NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Invalid pair selection';END IF;
   SELECT id INTO a FROM public.gcc_session_signup_students WHERE signup_id=p_signup AND sort_order=(p->>'a')::integer+1;
   SELECT id INTO b FROM public.gcc_session_signup_students WHERE signup_id=p_signup AND sort_order=(p->>'b')::integer+1;
   IF a IS NULL OR b IS NULL OR a=b OR a=ANY(seen) OR b=ANY(seen) THEN
     RAISE EXCEPTION 'Pair members must be different students and cannot belong to another pair';END IF;
   seen:=seen||a||b;
   INSERT INTO public.gcc_v165_pair_requests(signup_id,student_a,student_b,target_room)
   VALUES(p_signup,least(a,b),greatest(a,b),(p->>'room')::integer);
 END LOOP;
END $function$;

CREATE OR REPLACE FUNCTION public.gcc_v165_submit_roster(p_event_id uuid, p_teacher_name text, p_school_name text, p_country_code text, p_country_name text, p_students jsonb, p_facilitators jsonb, p_pairs jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE sid uuid;
BEGIN
 sid:=public.gcc_v8_submit_roster(p_event_id,p_teacher_name,p_school_name,p_country_code,p_country_name,p_students,p_facilitators);
 PERFORM public.gcc_v165_store_pair_requests(sid,p_pairs);
 RETURN sid;
END $function$;

CREATE OR REPLACE FUNCTION public.gcc_v203_enforce_event_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE d jsonb; begins timestamptz;
BEGIN
 SELECT session_details,starts_at INTO d,begins FROM public.events WHERE id=NEW.event_id;
 IF (d->>'registration_closes_at') IS NOT NULL AND
    ((d->>'registration_closes_at')::timestamptz<=now() OR begins<=now()) THEN
  RAISE EXCEPTION 'Registration is closed for this session';
 END IF;
 RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.gcc_v6_submit_signup(p_code text, p_event_id uuid, p_teacher_name text, p_school_name text, p_country_code text, p_country_name text, p_students jsonb, p_facilitators jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare cid uuid; sid uuid;student jsonb;fac jsonb;row_idx integer:=0;existing record;
begin
if p_code !~ '^[a-f0-9]{32}$' then raise exception 'Invalid invitation code';end if;
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

CREATE OR REPLACE FUNCTION public.gcc_v7_english_name(p_name text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
 select p_name is not null and length(btrim(p_name)) between 2 and 120
 and btrim(p_name) ~ '^[A-Za-z][A-Za-z .,''-]*$';
$function$;

CREATE OR REPLACE FUNCTION public.gcc_v7_validate_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare fname text; check_person boolean; check_facilitators boolean;
begin
 check_person=(tg_op='INSERT');
 check_facilitators=(tg_op='INSERT');
 if tg_op='UPDATE' then
   check_person = new.teacher_name is distinct from old.teacher_name;
   check_facilitators = new.facilitators is distinct from old.facilitators;
 end if;
 if check_person and not public.gcc_v7_english_name(new.teacher_name) then
   raise exception 'Teacher name must be written using English letters A-Z';
 end if;
 if check_facilitators then
   if jsonb_typeof(new.facilitators)<>'array' then raise exception 'Facilitators must be a list'; end if;
   for fname in select jsonb_array_elements_text(new.facilitators) loop
     if not public.gcc_v7_english_name(fname) then
       raise exception 'Facilitator names must be written using English letters A-Z';
     end if;
   end loop;
 end if;
 if tg_op='UPDATE' then
   if new.status='approved' and old.status is distinct from new.status then
     if not public.gcc_v7_english_name(new.teacher_name) then
       raise exception 'Correct the teacher name before approving this registration';
     end if;
     if exists(select 1 from public.gcc_session_signup_students x
       where x.signup_id=new.id and not public.gcc_v7_english_name(x.display_name)) then
       raise exception 'Correct student names to A-Z English spelling before approving';
     end if;
   end if;
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.gcc_v7_validate_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare check_person boolean;
begin
 check_person=(tg_op='INSERT');
 if tg_op='UPDATE' then check_person = new.display_name is distinct from old.display_name; end if;
 if check_person and not public.gcc_v7_english_name(new.display_name) then
   raise exception 'Student name must be written using English letters A-Z';
 end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.gcc_v8_submit_roster(p_event_id uuid, p_teacher_name text, p_school_name text, p_country_code text, p_country_name text, p_students jsonb, p_facilitators jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare sid uuid; students_total integer; event_record record;settings_max integer; person jsonb; fac jsonb; count_students integer:=0;
begin
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
end $function$;
