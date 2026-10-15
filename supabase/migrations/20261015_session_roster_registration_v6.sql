-- GCC Session Registration V6. Host-issued, per-teacher code; public may submit only via RPC.
-- Existing records/tables are left unchanged until the host explicitly approves a registration.
create table if not exists public.gcc_session_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  label text not null default '' check (char_length(label) <= 120),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table if not exists public.gcc_session_signups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  code_id uuid not null references public.gcc_session_codes(id) on delete restrict,
  teacher_name text not null check (length(btrim(teacher_name)) between 2 and 120),
  school_name text not null check (length(btrim(school_name)) between 2 and 160),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null check (length(btrim(country_name)) between 2 and 100),
  facilitators jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(event_id,code_id),
  check (jsonb_typeof(facilitators)='array')
);
create table if not exists public.gcc_session_signup_students (
  id uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.gcc_session_signups(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  grade text not null default '' check (char_length(grade) <= 40),
  sort_order integer not null,
  imported_participant_id uuid references public.participants(id),
  unique(signup_id,sort_order)
);
create table if not exists public.gcc_event_facilitators (
  event_id uuid not null references public.events(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  signup_id uuid not null references public.gcc_session_signups(id) on delete cascade,
  primary key(event_id,teacher_id)
);
create index if not exists gcc_session_signup_event_idx on public.gcc_session_signups(event_id,status);
create index if not exists gcc_session_students_signup_idx on public.gcc_session_signup_students(signup_id);

alter table public.gcc_session_codes enable row level security;
alter table public.gcc_session_signups enable row level security;
alter table public.gcc_session_signup_students enable row level security;
alter table public.gcc_event_facilitators enable row level security;
revoke all on public.gcc_session_codes,public.gcc_session_signups,
 public.gcc_session_signup_students,public.gcc_event_facilitators from anon,authenticated;

-- RLS grants to hosts, exclusively. Public teacher submissions go through the limited function below.
create policy "GCC host reads session codes" on public.gcc_session_codes
 for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'));
create policy "GCC host reads signups" on public.gcc_session_signups
 for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'));
create policy "GCC host reads signup students" on public.gcc_session_signup_students
 for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'));
create policy "GCC host reads event facilitators" on public.gcc_event_facilitators
 for select to authenticated using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='host'));
grant select on public.gcc_event_facilitators to authenticated;

create or replace function public.gcc_v6_require_host() returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or not exists(
     select 1 from public.profiles where id=auth.uid() and role='host'
  ) then raise exception 'Host access required'; end if;
end $$;

create or replace function public.gcc_v6_issue_code(p_label text default '') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare secret text:=replace(gen_random_uuid()::text,'-',''); code_id uuid;
begin
  perform public.gcc_v6_require_host();
  if char_length(coalesce(p_label,''))>120 then raise exception 'Label is too long'; end if;
  insert into public.gcc_session_codes(code_hash,label,expires_at,created_by)
    values(encode(sha256(convert_to(secret,'UTF8')),'hex'),btrim(coalesce(p_label,'')),now()+interval '14 days',auth.uid())
    returning id into code_id;
  return jsonb_build_object('id',code_id,'code',secret,'expires_in_days',14);
end $$;

create or replace function public.gcc_v6_list_codes() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare out_json jsonb;
begin
 perform public.gcc_v6_require_host();
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into out_json
 from (select id,label,expires_at,revoked_at,created_at from public.gcc_session_codes order by created_at desc limit 100) x;
 return out_json;
end $$;

create or replace function public.gcc_v6_revoke_code(p_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.gcc_v6_require_host();
 update public.gcc_session_codes set revoked_at=now() where id=p_id and revoked_at is null;
 return found;
end $$;

create or replace function public.gcc_v6_public_sessions() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare out_json jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(x) order by x.starts_at),'[]'::jsonb) into out_json
 from (select id,title,starts_at,timezone,status from public.events
       where status='published' and starts_at>now() order by starts_at limit 50) x;
 return out_json;
end $$;

-- No personal data is returned to unauthenticated users. Each code is unique to a teacher,
-- may be used for multiple published sessions, but only once per session.
create or replace function public.gcc_v6_submit_signup(
 p_code text,p_event_id uuid,p_teacher_name text,p_school_name text,
 p_country_code text,p_country_name text,p_students jsonb,p_facilitators jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare cid uuid; sid uuid; student jsonb; fac jsonb; row_idx integer:=0; existing record;
begin
 if p_code !~ '^[a-f0-9]{32}$' then raise exception 'Invalid invitation code'; end if;
 select id into cid from public.gcc_session_codes where
   code_hash=encode(sha256(convert_to(p_code,'UTF8')),'hex')
   and expires_at>now() and revoked_at is null;
 if cid is null then raise exception 'Invitation code has expired or is invalid'; end if;
 if not exists(select 1 from public.events where id=p_event_id and status='published' and starts_at>now())
 then raise exception 'Choose an upcoming published session'; end if;
 if length(btrim(coalesce(p_teacher_name,''))) not between 2 and 120
    or length(btrim(coalesce(p_school_name,''))) not between 2 and 160
    or length(btrim(coalesce(p_country_name,''))) not between 2 and 100
    or coalesce(p_country_code,'') !~ '^[A-Z]{2}$'
 then raise exception 'Teacher, school, and country must all be provided'; end if;
 -- Prevent changing the teacher/school identity across sessions when using the same code.
 select s.teacher_name,s.school_name,s.country_code into existing
 from public.gcc_session_signups s where s.code_id=cid limit 1;
 if found and (lower(btrim(existing.teacher_name))<>lower(btrim(p_teacher_name))
   or lower(btrim(existing.school_name))<>lower(btrim(p_school_name))
   or existing.country_code<>p_country_code)
 then raise exception 'This invitation code is already associated with another teacher or school'; end if;
 if p_students is null or jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students) not between 1 and 500
 then raise exception 'Please provide 1 to 500 students'; end if;
 if p_facilitators is null or jsonb_typeof(p_facilitators)<>'array' or jsonb_array_length(p_facilitators)>50
 then raise exception 'Provide at most 50 facilitators'; end if;
 for student in select value from jsonb_array_elements(p_students) loop
   if jsonb_typeof(student)<>'object' or
      length(btrim(coalesce(student->>'name',''))) not between 1 and 120 or
      length(coalesce(student->>'grade',''))>40
   then raise exception 'Each student needs a valid name and optional grade'; end if;
 end loop;
 for fac in select value from jsonb_array_elements(p_facilitators) loop
   if jsonb_typeof(fac)<>'string' or length(btrim(trim(both '"' from fac::text))) not between 2 and 120
   then raise exception 'Invalid facilitator name'; end if;
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
end $$;

create or replace function public.gcc_v6_host_signups() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare out_json jsonb;
begin
 perform public.gcc_v6_require_host();
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into out_json
 from (select s.id,s.event_id,e.title as event_title,s.teacher_name,s.school_name,s.country_code,s.country_name,
 s.facilitators,s.status,s.created_at,
 (select coalesce(jsonb_agg(jsonb_build_object('id',st.id,'name',st.display_name,'grade',st.grade) order by st.sort_order),'[]'::jsonb)
 from public.gcc_session_signup_students st where st.signup_id=s.id) as students
 from public.gcc_session_signups s join public.events e on e.id=s.event_id
 order by s.created_at desc limit 500) x;
 return out_json;
end $$;

-- Approval imports registered students into the existing Participant Pool / Event Participants.
-- The new school and teacher are reviewed by the host before import, never anonymously created.
create or replace function public.gcc_v6_review_signup(p_signup_id uuid,p_approve boolean) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare signup public.gcc_session_signups%rowtype; schid uuid; leadid uuid;
 facilitator text; facilitator_id uuid; student record; participant_id uuid;
begin
 perform public.gcc_v6_require_host();
 select * into signup from public.gcc_session_signups where id=p_signup_id for update;
 if signup.id is null or signup.status<>'pending' then raise exception 'Pending registration not found'; end if;
 if not p_approve then
   update public.gcc_session_signups set status='declined',reviewed_by=auth.uid(),reviewed_at=now() where id=p_signup_id;
   return true;
 end if;
 select id into schid from public.schools where lower(btrim(name))=lower(btrim(signup.school_name))
   and country_code=signup.country_code order by created_at asc limit 1;
 if schid is null then
   insert into public.schools(name,country_code,country_name,is_active)
   values(signup.school_name,signup.country_code,signup.country_name,true) returning id into schid;
 end if;
 select id into leadid from public.teachers where school_id=schid
   and lower(btrim(display_name))=lower(btrim(signup.teacher_name)) and is_active=true
   order by created_at asc limit 1;
 if leadid is null then
   insert into public.teachers(school_id,display_name,can_facilitate,is_active)
   values(schid,signup.teacher_name,false,true) returning id into leadid;
 end if;
 for facilitator in select jsonb_array_elements_text(signup.facilitators) loop
   select id into facilitator_id from public.teachers where school_id=schid
      and lower(btrim(display_name))=lower(btrim(facilitator)) and is_active=true
      order by created_at asc limit 1;
   if facilitator_id is null then
     insert into public.teachers(school_id,display_name,can_facilitate,is_active)
       values(schid,facilitator,true,true) returning id into facilitator_id;
   else
     update public.teachers set can_facilitate=true where id=facilitator_id;
   end if;
   insert into public.gcc_event_facilitators(event_id,teacher_id,signup_id)
     values(signup.event_id,facilitator_id,signup.id) on conflict(event_id,teacher_id) do nothing;
 end loop;
 for student in select * from public.gcc_session_signup_students where signup_id=signup.id order by sort_order loop
   insert into public.participants(school_id,teacher_id,display_name,grade,is_active)
   values(schid,leadid,student.display_name,nullif(student.grade,''),true) returning id into participant_id;
   insert into public.event_participants(event_id,participant_id,role)
     values(signup.event_id,participant_id,'participant');
   update public.gcc_session_signup_students set imported_participant_id=participant_id where id=student.id;
 end loop;
 update public.gcc_session_signups set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=p_signup_id;
 return true;
end $$;

-- Lock down default PUBLIC execution permissions before explicitly granting narrow API access.
revoke all on function public.gcc_v6_require_host() from public,anon,authenticated;
revoke all on function public.gcc_v6_issue_code(text) from public,anon,authenticated;
revoke all on function public.gcc_v6_list_codes() from public,anon,authenticated;
revoke all on function public.gcc_v6_revoke_code(uuid) from public,anon,authenticated;
revoke all on function public.gcc_v6_public_sessions() from public,anon,authenticated;
revoke all on function public.gcc_v6_submit_signup(text,uuid,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.gcc_v6_host_signups() from public,anon,authenticated;
revoke all on function public.gcc_v6_review_signup(uuid,boolean) from public,anon,authenticated;
grant execute on function public.gcc_v6_issue_code(text) to authenticated;
grant execute on function public.gcc_v6_list_codes() to authenticated;
grant execute on function public.gcc_v6_revoke_code(uuid) to authenticated;
grant execute on function public.gcc_v6_host_signups() to authenticated;
grant execute on function public.gcc_v6_review_signup(uuid,boolean) to authenticated;
grant execute on function public.gcc_v6_public_sessions() to anon,authenticated;
grant execute on function public.gcc_v6_submit_signup(text,uuid,text,text,text,text,jsonb,jsonb) to anon,authenticated;

-- Server-side 197-country validation (same codes as public/country-master.json).
create table if not exists public.gcc_v6_country_codes (code text primary key check (code ~ '^[A-Z]{2}$'));
insert into public.gcc_v6_country_codes(code)
select unnest(string_to_array('AD,AE,AF,AG,AL,AM,AO,AR,AT,AU,AZ,BA,BB,BD,BE,BF,BG,BH,BI,BJ,BN,BO,BR,BS,BT,BW,BY,BZ,CA,CD,CF,CG,CH,CI,CL,CM,CN,CO,CR,CU,CV,CY,CZ,DE,DJ,DK,DM,DO,DZ,EC,EE,EG,ER,ES,ET,FI,FJ,FM,FR,GA,GB,GD,GE,GH,GM,GN,GQ,GR,GT,GW,GY,HN,HR,HT,HU,ID,IE,IL,IN,IQ,IR,IS,IT,JM,JO,JP,KE,KG,KH,KI,KM,KN,KP,KR,KW,KZ,LA,LB,LC,LI,LK,LR,LS,LT,LU,LV,LY,MA,MC,MD,ME,MG,MH,MK,ML,MM,MN,MR,MT,MU,MV,MW,MX,MY,MZ,NA,NE,NG,NI,NL,NO,NP,NR,NZ,OM,PA,PE,PG,PH,PK,PL,PS,PT,PW,PY,QA,RO,RS,RU,RW,SA,SB,SC,SD,SE,SG,SI,SK,SL,SM,SN,SO,SR,SS,ST,SV,SY,SZ,TD,TG,TH,TJ,TL,TM,TN,TO,TR,TT,TV,TW,TZ,UA,UG,US,UY,UZ,VA,VC,VE,VN,VU,WS,XK,YE,ZA,ZM,ZW',',')) on conflict(code) do nothing;
revoke all on public.gcc_v6_country_codes from anon,authenticated;
alter table public.gcc_session_signups add constraint gcc_v6_country_fk foreign key(country_code) references public.gcc_v6_country_codes(code);

-- Keep legacy Room Builder behavior for events without V6-approved registrations.
create or replace function public.gcc_v6_event_uses_registrations(p_event_id uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform public.gcc_v6_require_host();
 return exists(select 1 from public.gcc_session_signups s where s.event_id=p_event_id and s.status='approved');
end $$;
revoke all on function public.gcc_v6_event_uses_registrations(uuid) from public,anon,authenticated;
grant execute on function public.gcc_v6_event_uses_registrations(uuid) to authenticated;
