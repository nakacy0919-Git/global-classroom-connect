-- V23.8: optional verified GCC teacher admission for managed events.
-- Staged; review pilot policy, do not apply to production automatically.
BEGIN;
CREATE TABLE IF NOT EXISTS gcc_roster_guard.verified_required (
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE
);
ALTER TABLE gcc_roster_guard.verified_required ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gcc_roster_guard.verified_required FROM PUBLIC,anon,authenticated;

-- Returns only the caller's own eligible identity, never other accounts or email.
CREATE OR REPLACE FUNCTION gcc_roster_guard.verified_identity()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_identity jsonb; v_count bigint;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NULL; END IF;
 SELECT count(*),jsonb_agg(jsonb_build_object('teacher',t.display_name,'school',s.name,
 'country_code',s.country_code,'country_name',s.country_name))->0
 INTO v_count,v_identity
 FROM public.teachers t JOIN public.profiles p ON p.id=t.auth_user_id
 JOIN public.schools s ON s.id=t.school_id
 JOIN auth.users u ON u.id=t.auth_user_id
 WHERE t.auth_user_id=auth.uid() AND t.is_active=true AND s.is_active=true
 AND p.role IN ('teacher','host') AND u.email_confirmed_at IS NOT NULL
 AND coalesce(u.is_anonymous,false)=false AND u.deleted_at IS NULL
 AND (u.banned_until IS NULL OR u.banned_until<=now());
 IF v_count<>1 OR nullif(btrim(v_identity->>'teacher'),'') IS NULL
 OR nullif(btrim(v_identity->>'school'),'') IS NULL
 OR coalesce(v_identity->>'country_code','') !~ '^[A-Z]{2}$'
 OR nullif(btrim(v_identity->>'country_name'),'') IS NULL THEN RETURN NULL; END IF;
 RETURN v_identity;
END $$;
REVOKE ALL ON FUNCTION gcc_roster_guard.verified_identity() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v238_my_roster_identity()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
 SELECT gcc_roster_guard.verified_identity()
$$;
CREATE OR REPLACE FUNCTION public.gcc_v238_roster_policy(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
 SELECT EXISTS(SELECT 1 FROM gcc_roster_guard.verified_required r JOIN public.events e ON e.id=r.event_id
 WHERE e.id=p_event_id AND e.status='published' AND e.starts_at>now())
$$;
CREATE OR REPLACE FUNCTION public.gcc_v238_require_verified(p_event_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 PERFORM public.gcc_v6_require_host();
 PERFORM 1 FROM public.events WHERE id=p_event_id AND status='published' AND starts_at>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose an upcoming published session'; END IF;
 INSERT INTO gcc_roster_guard.verified_required(event_id) VALUES(p_event_id) ON CONFLICT DO NOTHING;
 RETURN true;
END $$;
CREATE OR REPLACE FUNCTION gcc_roster_guard.enforce_verified_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_identity jsonb;
BEGIN
 PERFORM 1 FROM public.events WHERE id=NEW.event_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM gcc_roster_guard.verified_required WHERE event_id=NEW.event_id) THEN RETURN NEW; END IF;
 v_identity:=gcc_roster_guard.verified_identity();
 IF v_identity IS NULL THEN RAISE EXCEPTION 'GCC_VERIFIED_TEACHER_REQUIRED'; END IF;
 IF lower(btrim(coalesce(NEW.teacher_name,'')))<>lower(btrim(v_identity->>'teacher'))
 OR lower(btrim(coalesce(NEW.school_name,'')))<>lower(btrim(v_identity->>'school'))
 OR coalesce(NEW.country_code,'')<>v_identity->>'country_code'
 THEN RAISE EXCEPTION 'GCC_ROSTER_IDENTITY_MISMATCH'; END IF;
 -- Preserve legacy duplicate checks while normalizing the country label.
 NEW.country_name:=v_identity->>'country_name';
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION gcc_roster_guard.enforce_verified_identity() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gcc_v238_verified_identity_gate ON public.gcc_session_signups;
CREATE TRIGGER gcc_v238_verified_identity_gate BEFORE INSERT ON public.gcc_session_signups
 FOR EACH ROW EXECUTE FUNCTION gcc_roster_guard.enforce_verified_identity();
REVOKE ALL ON FUNCTION public.gcc_v238_my_roster_identity(),public.gcc_v238_roster_policy(uuid),public.gcc_v238_require_verified(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v238_my_roster_identity(),public.gcc_v238_require_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v238_roster_policy(uuid) TO anon,authenticated;
COMMIT;
