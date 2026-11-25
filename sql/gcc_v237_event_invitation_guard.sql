-- V23.7 staged optional invitation-only roster admission. No live migration.
BEGIN;
CREATE TABLE IF NOT EXISTS gcc_roster_guard.invite_required (
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS gcc_roster_guard.invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL,
 redeemed_at timestamptz,
 revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS gcc_roster_guard.admission_permits (
 transaction_id bigint NOT NULL,
 event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
 PRIMARY KEY(transaction_id,event_id)
);
ALTER TABLE gcc_roster_guard.invite_required ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_roster_guard.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_roster_guard.admission_permits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gcc_roster_guard.invite_required,gcc_roster_guard.invitations,gcc_roster_guard.admission_permits FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v237_invite_status(p_event_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 PERFORM public.gcc_v6_require_host();
 RETURN EXISTS(SELECT 1 FROM gcc_roster_guard.invite_required WHERE event_id=p_event_id);
END $$;
-- Issuing the first code is an explicit transition to invitation-only.
-- Host UI must explain old public links will require a code.
CREATE OR REPLACE FUNCTION public.gcc_v237_issue_invite(p_event_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_start timestamptz; v_token text;
BEGIN
 PERFORM public.gcc_v6_require_host();
 SELECT starts_at INTO v_start FROM public.events
 WHERE id=p_event_id AND status='published' AND starts_at>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Choose an upcoming published session'; END IF;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 INSERT INTO gcc_roster_guard.invite_required(event_id) VALUES(p_event_id) ON CONFLICT DO NOTHING;
 INSERT INTO gcc_roster_guard.invitations(event_id,token_hash,expires_at)
 VALUES(p_event_id,encode(sha256(convert_to(v_token,'UTF8')),'hex'),least(v_start,now()+interval '7 days'));
 RETURN v_token;
END $$;
CREATE OR REPLACE FUNCTION public.gcc_v237_revoke_invites(p_event_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE n integer;
BEGIN
 PERFORM public.gcc_v6_require_host();
 PERFORM 1 FROM public.events WHERE id=p_event_id FOR UPDATE;
 UPDATE gcc_roster_guard.invitations SET revoked_at=now()
 WHERE event_id=p_event_id AND redeemed_at IS NULL AND revoked_at IS NULL;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n;
END $$;

-- All roster INSERT paths share this gate, including older V6/V8/V165 calls.
-- Private single-use transaction permit cannot be forged by a REST caller.
CREATE OR REPLACE FUNCTION gcc_roster_guard.require_invitation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 PERFORM 1 FROM public.events WHERE id=NEW.event_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.invite_required WHERE event_id=NEW.event_id) THEN
  DELETE FROM gcc_roster_guard.admission_permits
   WHERE event_id=NEW.event_id AND transaction_id=txid_current();
  IF NOT FOUND THEN RAISE EXCEPTION 'GCC_INVITE_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION gcc_roster_guard.require_invitation() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gcc_v237_invitation_gate ON public.gcc_session_signups;
CREATE TRIGGER gcc_v237_invitation_gate BEFORE INSERT ON public.gcc_session_signups
 FOR EACH ROW EXECUTE FUNCTION gcc_roster_guard.require_invitation();

-- Only a valid token grants a one-insert permit. Original V165 owns validation,
-- capacity and pair handling; failed submissions roll back redemption and permit.
CREATE OR REPLACE FUNCTION public.gcc_v237_submit_invited_roster(
 p_event_id uuid,p_invite text,p_teacher_name text,p_school_name text,
 p_country_code text,p_country_name text,p_students jsonb,p_facilitators jsonb,p_pairs jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE sid uuid;
BEGIN
 IF p_invite IS NULL OR p_invite !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'GCC_INVITE_INVALID'; END IF;
 PERFORM 1 FROM public.events WHERE id=p_event_id AND status='published' AND starts_at>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'GCC_INVITE_INVALID'; END IF;
 IF NOT EXISTS(SELECT 1 FROM gcc_roster_guard.invite_required WHERE event_id=p_event_id) THEN
  RAISE EXCEPTION 'GCC_INVITE_INVALID';
 END IF;
 UPDATE gcc_roster_guard.invitations SET redeemed_at=now()
 WHERE event_id=p_event_id AND token_hash=encode(sha256(convert_to(p_invite,'UTF8')),'hex')
 AND expires_at>now() AND revoked_at IS NULL AND redeemed_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GCC_INVITE_INVALID'; END IF;
 INSERT INTO gcc_roster_guard.admission_permits(transaction_id,event_id) VALUES(txid_current(),p_event_id);
 sid:=public.gcc_v165_submit_roster(p_event_id,p_teacher_name,p_school_name,p_country_code,p_country_name,p_students,p_facilitators,p_pairs);
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.admission_permits WHERE transaction_id=txid_current() AND event_id=p_event_id)
 THEN RAISE EXCEPTION 'Registration did not complete'; END IF;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v237_invite_status(uuid),public.gcc_v237_issue_invite(uuid),public.gcc_v237_revoke_invites(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v237_invite_status(uuid),public.gcc_v237_issue_invite(uuid),public.gcc_v237_revoke_invites(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.gcc_v237_submit_invited_roster(uuid,text,text,text,text,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v237_submit_invited_roster(uuid,text,text,text,text,text,jsonb,jsonb,jsonb) TO anon,authenticated;
COMMIT;
