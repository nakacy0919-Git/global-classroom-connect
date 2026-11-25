-- V23.9 staged Turnstile receipt gate. Requires V236/V237/V238.
-- Activation is operator-only after a real isolated-provider test; default off.
BEGIN;
CREATE TABLE IF NOT EXISTS gcc_roster_guard.bot_required (
 event_id uuid PRIMARY KEY REFERENCES public.events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS gcc_roster_guard.bot_receipts (
 event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
 receipt_hash text PRIMARY KEY CHECK(receipt_hash ~ '^[a-f0-9]{64}$'),
 challenge_hash text NOT NULL UNIQUE CHECK(challenge_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL,
 used_at timestamptz
);
CREATE INDEX IF NOT EXISTS gcc_v239_receipt_expiry ON gcc_roster_guard.bot_receipts(expires_at);
CREATE TABLE IF NOT EXISTS gcc_roster_guard.bot_permits (
 transaction_id bigint NOT NULL,event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
 PRIMARY KEY(transaction_id,event_id)
);
ALTER TABLE gcc_roster_guard.bot_required ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_roster_guard.bot_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcc_roster_guard.bot_permits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON gcc_roster_guard.bot_required,gcc_roster_guard.bot_receipts,gcc_roster_guard.bot_permits FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v239_bot_policy(p_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
 SELECT EXISTS(SELECT 1 FROM gcc_roster_guard.bot_required r JOIN public.events e ON e.id=r.event_id
 WHERE e.id=p_event_id AND e.status='published' AND e.starts_at>now())
$$;
-- Called only by the trusted verifier after provider success; never by a browser.
CREATE OR REPLACE FUNCTION public.gcc_v239_issue_bot_receipt(p_event_id uuid,p_challenge_hash text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE v_token text;
BEGIN
 IF p_challenge_hash IS NULL OR p_challenge_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'GCC_BOT_INVALID'; END IF;
 PERFORM 1 FROM public.events WHERE id=p_event_id AND status='published' AND starts_at>clock_timestamp() FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM gcc_roster_guard.bot_required WHERE event_id=p_event_id)
 THEN RAISE EXCEPTION 'GCC_BOT_INVALID'; END IF;
 -- Retain challenge digests beyond the provider's five-minute validity window.
 DELETE FROM gcc_roster_guard.bot_receipts WHERE expires_at<clock_timestamp()-interval '10 minutes';
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 INSERT INTO gcc_roster_guard.bot_receipts(event_id,receipt_hash,challenge_hash,expires_at)
 VALUES(p_event_id,encode(sha256(convert_to(v_token,'UTF8')),'hex'),p_challenge_hash,clock_timestamp()+interval '2 minutes');
 RETURN v_token;
END $$;
CREATE OR REPLACE FUNCTION gcc_roster_guard.enforce_bot_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
 PERFORM 1 FROM public.events WHERE id=NEW.event_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.bot_required WHERE event_id=NEW.event_id) THEN
  DELETE FROM gcc_roster_guard.bot_permits WHERE transaction_id=txid_current() AND event_id=NEW.event_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'GCC_BOT_REQUIRED'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION gcc_roster_guard.enforce_bot_receipt() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS gcc_v239_bot_gate ON public.gcc_session_signups;
CREATE TRIGGER gcc_v239_bot_gate BEFORE INSERT ON public.gcc_session_signups
 FOR EACH ROW EXECUTE FUNCTION gcc_roster_guard.enforce_bot_receipt();

CREATE OR REPLACE FUNCTION public.gcc_v239_submit_protected_roster(
 p_event_id uuid,p_receipt text,p_invite text,p_teacher_name text,p_school_name text,
 p_country_code text,p_country_name text,p_students jsonb,p_facilitators jsonb,p_pairs jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE sid uuid;
BEGIN
 IF p_receipt IS NULL OR p_receipt !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'GCC_BOT_INVALID'; END IF;
 PERFORM 1 FROM public.events WHERE id=p_event_id AND status='published' AND starts_at>clock_timestamp() FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM gcc_roster_guard.bot_required WHERE event_id=p_event_id)
 THEN RAISE EXCEPTION 'GCC_BOT_INVALID'; END IF;
 UPDATE gcc_roster_guard.bot_receipts SET used_at=clock_timestamp()
 WHERE event_id=p_event_id AND receipt_hash=encode(sha256(convert_to(p_receipt,'UTF8')),'hex')
 AND expires_at>clock_timestamp() AND used_at IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'GCC_BOT_INVALID'; END IF;
 INSERT INTO gcc_roster_guard.bot_permits(transaction_id,event_id) VALUES(txid_current(),p_event_id);
 -- Preserve the caller JWT and all other gates, including teacher identity and invitation.
 IF nullif(p_invite,'') IS NOT NULL THEN
  sid:=public.gcc_v237_submit_invited_roster(p_event_id,p_invite,p_teacher_name,p_school_name,p_country_code,p_country_name,p_students,p_facilitators,p_pairs);
 ELSE
  sid:=public.gcc_v165_submit_roster(p_event_id,p_teacher_name,p_school_name,p_country_code,p_country_name,p_students,p_facilitators,p_pairs);
 END IF;
 IF EXISTS(SELECT 1 FROM gcc_roster_guard.bot_permits WHERE transaction_id=txid_current() AND event_id=p_event_id)
 THEN RAISE EXCEPTION 'Registration did not complete'; END IF;
 RETURN sid;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v239_issue_bot_receipt(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v239_issue_bot_receipt(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.gcc_v239_bot_policy(uuid),public.gcc_v239_submit_protected_roster(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v239_bot_policy(uuid),public.gcc_v239_submit_protected_roster(uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb) TO anon,authenticated;
COMMIT;
