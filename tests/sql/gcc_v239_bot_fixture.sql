-- CI only: extend previous disposable fixtures; no production records.
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN; END IF; END $$;
GRANT USAGE ON SCHEMA public TO service_role;
INSERT INTO public.events(id) VALUES
 ('a4000000-0000-4000-8000-000000000001'),('a4000000-0000-4000-8000-000000000002'),
 ('a4000000-0000-4000-8000-000000000003');
-- Preserve the synthetic pair-error behavior and add identity fields so that
-- stacked bot, invitation, and teacher checks can be exercised together.
CREATE OR REPLACE FUNCTION public.gcc_v165_submit_roster(p_event_id uuid,p_teacher_name text,p_school_name text,p_country_code text,p_country_name text,p_students jsonb,p_facilitators jsonb,p_pairs jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE sid uuid;
BEGIN
 INSERT INTO public.gcc_session_signups(event_id,teacher_name,school_name,country_code,country_name)
 VALUES(p_event_id,p_teacher_name,p_school_name,p_country_code,p_country_name) RETURNING id INTO sid;
 IF p_pairs='[1]'::jsonb THEN RAISE EXCEPTION 'Synthetic pair validation failure'; END IF;
 RETURN sid;
END $$;
