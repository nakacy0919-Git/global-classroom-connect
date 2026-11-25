-- Disposable local Auth/PostgREST fixture; auth.users is owned by the real Auth service.
-- Do not execute against hosted Supabase.
CREATE SCHEMA IF NOT EXISTS gcc_roster_guard;
REVOKE ALL ON SCHEMA gcc_roster_guard FROM PUBLIC,anon,authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY,role text NOT NULL);
CREATE TABLE public.schools(id uuid PRIMARY KEY,name text NOT NULL,country_code text NOT NULL,country_name text NOT NULL,is_active boolean NOT NULL);
CREATE TABLE public.teachers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),auth_user_id uuid UNIQUE,display_name text NOT NULL,school_id uuid REFERENCES public.schools(id),is_active boolean NOT NULL);
CREATE TABLE public.events(id uuid PRIMARY KEY,status text NOT NULL,starts_at timestamptz NOT NULL);
CREATE TABLE public.gcc_session_signups(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid REFERENCES public.events(id),teacher_name text NOT NULL,school_name text NOT NULL,country_code text NOT NULL,country_name text NOT NULL);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_session_signups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.schools,public.teachers,public.events,public.gcc_session_signups FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.gcc_v6_require_host() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='host') THEN RAISE EXCEPTION 'Host access required'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v6_require_host() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.gcc_ci_register(p_event uuid,p_teacher text,p_school text,p_country text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE id_ uuid;
BEGIN
 INSERT INTO public.gcc_session_signups(event_id,teacher_name,school_name,country_code,country_name)
 VALUES(p_event,p_teacher,p_school,p_country,'Synthetic') RETURNING id INTO id_;
 RETURN id_;
END $$;
REVOKE ALL ON FUNCTION public.gcc_ci_register(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_ci_register(uuid,text,text,text) TO anon,authenticated;
INSERT INTO public.schools VALUES ('ba000000-0000-4000-8000-000000000001','Test Philippines School','PH','Philippines',true);
INSERT INTO public.events VALUES ('ba000000-0000-4000-8000-000000000002','published',now()+interval '1 day');
