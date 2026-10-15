-- GCC V7: strict A-Z personal names and host edits, without rewriting existing records.
-- Additive; existing non-Latin records remain unchanged unless edited or approved.
create or replace function public.gcc_v7_english_name(p_name text)
returns boolean language sql immutable as $$
  select p_name is not null
    and length(btrim(p_name)) between 2 and 120
    and btrim(p_name) ~ '^[A-Za-z][A-Za-z .,''-]*$';
$$;

create or replace function public.gcc_v7_validate_signup() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare fname text;check_person boolean;check_facilitators boolean;
begin
 check_person=(tg_op='INSERT');
 check_facilitators=(tg_op='INSERT');
 if tg_op='UPDATE' then
   check_person=new.teacher_name is distinct from old.teacher_name;
   check_facilitators=new.facilitators is distinct from old.facilitators;
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
   if exists (select 1 from public.gcc_session_signup_students x
     where x.signup_id=new.id and not public.gcc_v7_english_name(x.display_name)) then
     raise exception 'Correct student names to A-Z English spelling before approving';
   end if;
 end if;
 end if;
 return new;
end $$;
drop trigger if exists gcc_v7_validate_signup_trigger on public.gcc_session_signups;
create trigger gcc_v7_validate_signup_trigger before insert or update on public.gcc_session_signups
for each row execute function public.gcc_v7_validate_signup();

create or replace function public.gcc_v7_validate_student() returns trigger
language plpgsql security invoker set search_path=public,pg_temp as $$
declare check_person boolean;
begin
 check_person=(tg_op='INSERT');
 if tg_op='UPDATE' then check_person=new.display_name is distinct from old.display_name; end if;
 if check_person then
   if not public.gcc_v7_english_name(new.display_name) then
     raise exception 'Student name must be written using English letters A-Z';
   end if;
 end if;
 return new;
end $$;
drop trigger if exists gcc_v7_validate_student_trigger on public.gcc_session_signup_students;
create trigger gcc_v7_validate_student_trigger before insert or update on public.gcc_session_signup_students
for each row execute function public.gcc_v7_validate_student();

create or replace function public.gcc_v7_update_registration_names(
 p_signup_id uuid, p_teacher_name text,p_students jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.gcc_session_signups%rowtype;
  item jsonb;sid uuid;old_name text;new_name text;new_grade text;seen uuid[]:='{}'::uuid[];
  total integer;teacher_id uuid;teacher_count integer;
begin
 perform public.gcc_v6_require_host();
 select * into s from public.gcc_session_signups where id=p_signup_id for update;
 if s.id is null or s.status not in ('pending','approved') then
   raise exception 'Only pending or approved registrations can be edited';
 end if;
 if not public.gcc_v7_english_name(p_teacher_name) then
   raise exception 'Teacher name must use English letters A-Z';
 end if;
 if p_students is null or jsonb_typeof(p_students)<>'array' then
   raise exception 'Student list must be an array';
 end if;
 select count(*) into total from public.gcc_session_signup_students where signup_id=p_signup_id;
 if jsonb_array_length(p_students)<>total then
   raise exception 'Name edits must retain the same student count';
 end if;
 for item in select value from jsonb_array_elements(p_students) loop
   if jsonb_typeof(item)<>'object' or coalesce(item->>'id','') !~ '^[0-9a-fA-F-]{36}$' then
     raise exception 'Invalid student reference';
   end if;
   sid=(item->>'id')::uuid;
   if sid=any(seen) then raise exception 'Duplicate student reference';end if;
   seen=array_append(seen,sid);
   new_name=btrim(coalesce(item->>'name',''));
   new_grade=btrim(coalesce(item->>'grade',''));
   if not public.gcc_v7_english_name(new_name) or length(new_grade)>40 then
     raise exception 'Student names must use English letters A-Z and grade must be <=40 characters';
   end if;
   update public.gcc_session_signup_students
      set display_name=new_name, grade=new_grade
      where id=sid and signup_id=p_signup_id;
   if not found then raise exception 'Student does not belong to this registration';end if;
   update public.participants p set display_name=new_name, grade=nullif(new_grade,'')
     from public.gcc_session_signup_students x where x.id=sid
       and x.imported_participant_id=p.id;
 end loop;
 if s.status='approved' then
   select count(distinct p.teacher_id),min(p.teacher_id::text)::uuid
     into teacher_count,teacher_id
     from public.gcc_session_signup_students x join public.participants p
       on p.id=x.imported_participant_id
     where x.signup_id=p_signup_id and p.teacher_id is not null;
   if teacher_count<>1 then raise exception 'Unable to safely update the approved teacher record';end if;
   update public.teachers set display_name=btrim(p_teacher_name),updated_at=now()
     where id=teacher_id and lower(btrim(display_name))=lower(btrim(s.teacher_name));
   if not found and btrim(s.teacher_name)<>btrim(p_teacher_name) then
     raise exception 'Teacher name has changed elsewhere; refresh before editing';
   end if;
 end if;
 update public.gcc_session_signups set teacher_name=btrim(p_teacher_name) where id=p_signup_id;
 return jsonb_build_object('ok',true,'updated_students',total);
end $$;
revoke all on function public.gcc_v7_update_registration_names(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.gcc_v7_update_registration_names(uuid,text,jsonb) to authenticated;
