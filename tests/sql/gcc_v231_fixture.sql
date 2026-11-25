-- Disposable PostgreSQL 17 fixture. Never execute against a real Supabase project.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $uid$
 SELECT COALESCE(
  NULLIF(current_setting('request.jwt.claim.sub',true),''),
  NULLIF(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'
 )::uuid;
$uid$;
CREATE TABLE auth.users (
 id uuid PRIMARY KEY,email text,created_at timestamptz NOT NULL,
 email_confirmed_at timestamptz,raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE public.profiles (id uuid PRIMARY KEY,role text NOT NULL);
CREATE TABLE public.schools (
 id uuid PRIMARY KEY,name text NOT NULL,country_name text,country_code text
);
CREATE TABLE public.teachers (
 id uuid PRIMARY KEY,auth_user_id uuid,display_name text,school_id uuid,
 is_active boolean,created_at timestamptz
);
CREATE TABLE public.gcc_v120_applications (
 user_id uuid,status text,teacher_name text,school_name text,
 school_country_code text,school_country text
);
CREATE TABLE public.exchange_availability (
 id uuid PRIMARY KEY,teacher_id uuid NOT NULL,
 starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,timezone text,
 student_count integer,room_count integer,age_band text,topic text,status text,
 session_details jsonb
);
CREATE TABLE public.session_join_requests (
 id uuid PRIMARY KEY,offer_id uuid,requested_students integer,status text
);
CREATE FUNCTION public.gcc_current_teacher_id() RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE tid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required'; END IF;
 SELECT t.id INTO tid FROM public.teachers t
 JOIN public.profiles p ON p.id=t.auth_user_id
 WHERE t.auth_user_id=auth.uid() AND t.is_active=true
  AND p.role IN ('teacher','host') LIMIT 1;
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher access denied'; END IF;
 RETURN tid;
END
$$;
CREATE FUNCTION public.gcc_v6_require_host() RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
  SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='host'
 ) THEN RAISE EXCEPTION 'Host access required'; END IF;
END
$$;
CREATE FUNCTION public.gcc_v7_english_name(p_name text) RETURNS boolean
 LANGUAGE sql IMMUTABLE AS $$ SELECT length(p_name)>1 $$;
INSERT INTO auth.users(id,email,created_at,email_confirmed_at) VALUES
 ('10000000-0000-4000-8000-000000000001','host@example.invalid',now(),now()),
 ('10000000-0000-4000-8000-000000000002','guest@example.invalid',now(),now());
INSERT INTO public.profiles(id,role) VALUES
 ('10000000-0000-4000-8000-000000000001','host'),
 ('10000000-0000-4000-8000-000000000002','teacher');
INSERT INTO public.schools(id,name,country_name,country_code) VALUES
 ('30000000-0000-4000-8000-000000000001','Test Japan School','Japan','JP'),
 ('30000000-0000-4000-8000-000000000002','Test Philippines School','Philippines','PH');
INSERT INTO public.teachers(id,auth_user_id,display_name,school_id,is_active,created_at) VALUES
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',
 'Host Teacher','30000000-0000-4000-8000-000000000001',true,now()),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',
 'Guest Teacher','30000000-0000-4000-8000-000000000002',true,now());
-- 250 additional unapproved accounts for more-than-200 paging checks.
INSERT INTO auth.users(id,email,created_at,email_confirmed_at,raw_user_meta_data)
SELECT ('40000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 'demo'||n||'@example.invalid',now()-n*interval '1 minute',now(),
 '{"gcc_registration_source":"global-classroom-connect"}'::jsonb
FROM generate_series(1,250) AS n;
-- Unrelated authentication account must NEVER appear in GCC host analytics.
INSERT INTO auth.users(id,email,created_at,email_confirmed_at)
VALUES ('70000000-0000-4000-8000-000000000001',
 'unrelated@example.invalid',now(),now());
-- 325 genuine open future offers created by the same approved teacher.
INSERT INTO public.exchange_availability
 (id,teacher_id,starts_at,ends_at,timezone,student_count,room_count,
  age_band,topic,status,session_details)
SELECT ('50000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 '20000000-0000-4000-8000-000000000002'::uuid,
 '2027-02-01T00:00:00Z'::timestamptz+n*interval '1 minute',
 '2027-02-01T01:00:00Z'::timestamptz+n*interval '1 minute',
 'Asia/Manila',20,4,'Upper Secondary','Global culture','open',
 jsonb_build_object('session_name','School Exchange','max_participants',80,
   'registration_closes_at','2027-01-31T00:00:00Z','meeting_url','https://private.example.invalid/')
FROM generate_series(1,325) AS n;
-- Own closed session remains manageable, but is invisible to other schools.
INSERT INTO public.exchange_availability
 (id,teacher_id,starts_at,ends_at,timezone,student_count,room_count,
 age_band,topic,status,session_details)
VALUES
 ('60000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '2027-01-01T00:00:00Z','2027-01-01T01:00:00Z',
  'Asia/Tokyo',10,2,'Upper Secondary','Private plan','closed',
  '{"session_name":"Private host session","max_participants":20}');
-- Invalid and expired deadlines must be ignored instead of breaking entire browse.
INSERT INTO public.exchange_availability
 (id,teacher_id,starts_at,ends_at,timezone,student_count,room_count,
 age_band,topic,status,session_details)
VALUES
 ('60000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000002',
  '2027-01-02T00:00:00Z','2027-01-02T01:00:00Z',
  'Asia/Manila',10,2,'Upper Secondary','Invalid deadline','open',
  '{"registration_closes_at":"not-a-date"}'),
 ('60000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000002',
  '2027-01-03T00:00:00Z','2027-01-03T01:00:00Z',
  'Asia/Manila',10,2,'Upper Secondary','Closed deadline','open',
  '{"registration_closes_at":"2025-01-01T00:00:00Z"}');
