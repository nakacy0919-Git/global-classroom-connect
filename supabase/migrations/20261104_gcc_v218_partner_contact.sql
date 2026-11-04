-- GCC V21.8: share a chosen contact method ONLY with an approved session partner.
-- No chat, no polling, no public phone numbers; direct table access is forbidden.
CREATE TABLE IF NOT EXISTS public.gcc_v218_partner_contacts (
  request_id uuid NOT NULL REFERENCES public.session_join_requests(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('email','whatsapp','line','messenger','other')),
  contact_value text NOT NULL CHECK (char_length(btrim(contact_value)) BETWEEN 3 AND 180),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, teacher_id)
);

ALTER TABLE public.gcc_v218_partner_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v218_partner_contacts FROM PUBLIC, anon, authenticated;

-- Authenticated host or applicant may retrieve ONLY their own approved pairing.
-- Separate table prevents accidental PII leakage through existing requests APIs.
CREATE OR REPLACE FUNCTION public.gcc_v218_partner_contacts(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  tid uuid := public.gcc_current_teacher_id();
  host_tid uuid;
  guest_tid uuid;
  result jsonb;
BEGIN
  SELECT a.teacher_id, r.requesting_teacher_id INTO host_tid, guest_tid
  FROM public.session_join_requests AS r
  JOIN public.exchange_availability AS a ON a.id = r.offer_id
  WHERE r.id = p_request_id
    AND r.status = 'approved'
    AND a.ends_at >= now() - INTERVAL '14 days';
  IF NOT FOUND OR tid IS NULL OR (tid <> host_tid AND tid <> guest_tid) THEN
    RAISE EXCEPTION 'Approved session partner access required';
  END IF;

  SELECT jsonb_build_object(
    'mine', (SELECT jsonb_build_object('channel',c.channel,'value',c.contact_value)
       FROM public.gcc_v218_partner_contacts AS c
       WHERE c.request_id=p_request_id AND c.teacher_id=tid),
    'partner', (SELECT jsonb_build_object('channel',c.channel,'value',c.contact_value)
       FROM public.gcc_v218_partner_contacts AS c
       WHERE c.request_id=p_request_id AND c.teacher_id=
          CASE WHEN tid=host_tid THEN guest_tid ELSE host_tid END)
  ) INTO result;
  RETURN result;
END $$;

-- Teachers voluntarily share or clear their contact on a per-approved-request basis.
CREATE OR REPLACE FUNCTION public.gcc_v218_set_partner_contact(
  p_request_id uuid,
  p_channel text,
  p_value text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  tid uuid := public.gcc_current_teacher_id();
  host_tid uuid;
  guest_tid uuid;
  chosen_channel text := lower(btrim(coalesce(p_channel,'')));
  chosen_value text := btrim(coalesce(p_value,''));
BEGIN
  SELECT a.teacher_id, r.requesting_teacher_id INTO host_tid, guest_tid
  FROM public.session_join_requests AS r
  JOIN public.exchange_availability AS a ON a.id = r.offer_id
  WHERE r.id = p_request_id
    AND r.status = 'approved'
    AND a.ends_at >= now() - INTERVAL '14 days';
  IF NOT FOUND OR tid IS NULL OR (tid <> host_tid AND tid <> guest_tid) THEN
    RAISE EXCEPTION 'Approved session partner access required';
  END IF;

  -- Empty channel + empty value = explicit revocation by the data owner.
  IF chosen_channel='' AND chosen_value='' THEN
    DELETE FROM public.gcc_v218_partner_contacts AS c
    WHERE c.request_id=p_request_id AND c.teacher_id=tid;
    RETURN true;
  END IF;
  IF chosen_channel NOT IN ('email','whatsapp','line','messenger','other')
     OR char_length(chosen_value) NOT BETWEEN 3 AND 180
     OR chosen_value ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Choose a valid contact method and contact detail (3-180 characters)';
  END IF;
  IF chosen_channel='email'
    AND chosen_value !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address';
  END IF;

  INSERT INTO public.gcc_v218_partner_contacts
      (request_id, teacher_id, channel, contact_value, updated_at)
  VALUES (p_request_id, tid, chosen_channel, chosen_value, now())
  ON CONFLICT (request_id, teacher_id)
  DO UPDATE SET channel=excluded.channel,
                contact_value=excluded.contact_value,
                updated_at=now();
  RETURN true;
END $$;

-- SECURITY DEFINER RPCs are callable ONLY by authenticated users.
REVOKE ALL ON FUNCTION public.gcc_v218_partner_contacts(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.gcc_v218_set_partner_contact(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gcc_v218_partner_contacts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v218_set_partner_contact(uuid,text,text) TO authenticated;

COMMENT ON TABLE public.gcc_v218_partner_contacts IS
  'Per-approved-join-request voluntary teacher contact; no direct API reads; secure RPC only.';
