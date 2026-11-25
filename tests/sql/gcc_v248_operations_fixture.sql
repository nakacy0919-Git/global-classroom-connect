-- Disposable CI database only. No production identifiers or records.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
GRANT USAGE ON SCHEMA auth TO authenticated,anon;
CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false,deleted_at timestamptz,banned_until timestamptz);
CREATE TABLE public.schools(id uuid PRIMARY KEY,name text,country_code text,is_active boolean);
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text);
CREATE TABLE public.teachers(id uuid PRIMARY KEY,school_id uuid REFERENCES public.schools,auth_user_id uuid,display_name text,is_active boolean);
CREATE TABLE public.exchange_availability(id uuid PRIMARY KEY,teacher_id uuid REFERENCES public.teachers,country_code text,timezone text,starts_at timestamptz,ends_at timestamptz,student_count integer,room_count integer,age_band text,topic text,notes text,status text,created_by uuid,created_at timestamptz,updated_at timestamptz,session_details jsonb);
CREATE TABLE public.session_join_requests(id uuid PRIMARY KEY,offer_id uuid REFERENCES public.exchange_availability,requesting_teacher_id uuid REFERENCES public.teachers,status text,requested_students integer,reconfirmation_required boolean,created_at timestamptz);
CREATE FUNCTION public.gcc_current_teacher_id() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp' AS $$
DECLARE tid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required';END IF;
 SELECT t.id INTO tid FROM public.teachers t JOIN public.profiles p ON p.id=t.auth_user_id WHERE t.auth_user_id=auth.uid() AND t.is_active=true AND p.role IN ('teacher','host') LIMIT 1;
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher access pending approval';END IF;
 RETURN tid;
END $$;
INSERT INTO public.schools SELECT ('00000000-0000-0000-0000-00000000000'||i)::uuid,'School '||i,CASE WHEN i=1 THEN 'JP' ELSE 'PH' END,true FROM generate_series(1,4) i;
INSERT INTO auth.users(id,email_confirmed_at) SELECT ('10000000-0000-0000-0000-00000000000'||i)::uuid,CASE WHEN i=4 THEN NULL ELSE now() END FROM generate_series(1,4) i;
INSERT INTO public.profiles SELECT id,'teacher' FROM auth.users;
INSERT INTO public.teachers SELECT ('20000000-0000-0000-0000-00000000000'||i)::uuid,('00000000-0000-0000-0000-00000000000'||i)::uuid,('10000000-0000-0000-0000-00000000000'||i)::uuid,'Teacher '||i,true FROM generate_series(1,4) i;
INSERT INTO public.exchange_availability(id,teacher_id,country_code,timezone,starts_at,ends_at,student_count,room_count,topic,status,session_details)
VALUES ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','JP','Asia/Tokyo',now()+interval '1 day',now()+interval '1 day 1 hour',2,2,'Synthetic session','open','{"session_name":"Synthetic session","max_participants":4}');
INSERT INTO public.session_join_requests VALUES ('40000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','approved',2,false,now());
