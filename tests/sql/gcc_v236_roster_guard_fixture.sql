-- CI-only schema stubs. Test the real V23.6 trigger, not the full legacy RPCs.
CREATE TABLE public.events(id uuid PRIMARY KEY);
CREATE TABLE public.gcc_session_signups(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),event_id uuid NOT NULL REFERENCES public.events(id),
 code_id uuid, status text DEFAULT 'pending', created_at timestamptz DEFAULT now()
);
REVOKE ALL ON public.gcc_session_signups FROM PUBLIC,anon,authenticated;
ALTER TABLE public.gcc_session_signups ENABLE ROW LEVEL SECURITY;
INSERT INTO public.events(id) VALUES
 ('a1000000-0000-4000-8000-000000000001'),('a1000000-0000-4000-8000-000000000002'),
 ('a1000000-0000-4000-8000-000000000003'),('a1000000-0000-4000-8000-000000000004');
-- Simulates all registration RPCs reaching the same INSERT, including an invitation
-- code_id and a pair-validation failure AFTER the signup has been inserted.
CREATE FUNCTION public.gcc_test_roster_write(p_event uuid,p_code uuid DEFAULT NULL,p_fail boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE sid uuid;
BEGIN
 INSERT INTO public.gcc_session_signups(event_id,code_id) VALUES(p_event,p_code) RETURNING id INTO sid;
 IF p_fail THEN RAISE EXCEPTION 'Synthetic pair validation failure'; END IF;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.gcc_test_roster_write(uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gcc_test_roster_write(uuid,uuid,boolean) TO anon,authenticated;
