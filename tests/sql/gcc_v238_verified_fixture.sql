-- Disposable fixture only. Extend earlier schema stubs.
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS banned_until timestamptz;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.gcc_session_signups ADD COLUMN teacher_name text;
ALTER TABLE public.gcc_session_signups ADD COLUMN school_name text;
ALTER TABLE public.gcc_session_signups ADD COLUMN country_code text;
ALTER TABLE public.gcc_session_signups ADD COLUMN country_name text;
INSERT INTO public.events(id) VALUES ('a3000000-0000-4000-8000-000000000001'),('a3000000-0000-4000-8000-000000000002');
CREATE FUNCTION public.gcc_test_verified_write(p_event uuid,p_teacher text,p_school text,p_country text,p_code uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE sid uuid;
BEGIN
 INSERT INTO public.gcc_session_signups(event_id,teacher_name,school_name,country_code,country_name,code_id)
 VALUES(p_event,p_teacher,p_school,p_country,'Synthetic label',p_code) RETURNING id INTO sid;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.gcc_test_verified_write(uuid,text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gcc_test_verified_write(uuid,text,text,text,uuid) TO anon,authenticated;
