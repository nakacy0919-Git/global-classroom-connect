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


-- The age range is supplied by the applying teacher, NOT guessed from school type.
ALTER TABLE public.session_join_requests
  ADD COLUMN IF NOT EXISTS students_min_age integer,
  ADD COLUMN IF NOT EXISTS students_max_age integer;
ALTER TABLE public.session_join_requests
  DROP CONSTRAINT IF EXISTS gcc_v218_request_age_range;
ALTER TABLE public.session_join_requests
  ADD CONSTRAINT gcc_v218_request_age_range CHECK (
    (students_min_age IS NULL AND students_max_age IS NULL)
    OR (
      students_min_age BETWEEN 3 AND 99
      AND students_max_age BETWEEN 3 AND 99
      AND students_min_age <= students_max_age
    )
  );

-- Keep the proven V21.2 capacity-locking and duplicate-request handling intact.
CREATE OR REPLACE FUNCTION public.gcc_v218_teacher_apply_to_session(
 p_offer_id uuid,p_message text,p_students integer,p_age_min integer,p_age_max integer
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE
  request_id uuid;
BEGIN
  IF p_age_min IS NULL OR p_age_max IS NULL OR
     p_age_min NOT BETWEEN 3 AND 99 OR p_age_max NOT BETWEEN 3 AND 99 OR
     p_age_min > p_age_max THEN
    RAISE EXCEPTION 'Enter the youngest and oldest participating student ages (3-99)';
  END IF;
  request_id:=public.gcc_v212_teacher_apply_to_session(p_offer_id,p_message,p_students);
  UPDATE public.session_join_requests AS r
    SET students_min_age=p_age_min,students_max_age=p_age_max
    WHERE r.id=request_id AND r.requesting_teacher_id=public.gcc_current_teacher_id();
  RETURN request_id;
END $$;

-- Only the approved teacher's own incoming/outgoing requests, never the world directory.
CREATE OR REPLACE FUNCTION public.gcc_teacher_list_requests()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE tid uuid:=public.gcc_current_teacher_id(); result jsonb;
BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC),'[]'::jsonb)
 INTO result FROM (
  SELECT r.id,r.offer_id,r.status,r.message,r.created_at,r.requesting_teacher_id,
   r.requested_students,r.students_min_age,r.students_max_age,
   r.reconfirmation_required,a.teacher_id AS host_teacher_id,
   h.display_name AS host_name,g.display_name AS guest_name,
   a.starts_at,a.ends_at,a.timezone,a.topic,
   sh.country_code AS host_country,
   sh.name AS host_school_name,
   sg.name AS guest_school_name,
   sg.country_code AS guest_country_code,
   sg.country_name AS guest_country_name,
   sg.school_level AS guest_school_level,
   CASE WHEN a.teacher_id=tid THEN 'incoming' ELSE 'outgoing' END AS direction
  FROM public.session_join_requests r
  JOIN public.exchange_availability a ON a.id=r.offer_id
  JOIN public.teachers h ON h.id=a.teacher_id
  JOIN public.teachers g ON g.id=r.requesting_teacher_id
  LEFT JOIN public.schools sh ON sh.id=h.school_id
  LEFT JOIN public.schools sg ON sg.id=g.school_id
  WHERE r.requesting_teacher_id=tid OR a.teacher_id=tid
  ORDER BY r.created_at DESC LIMIT 200
 ) x;
 RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.gcc_v218_teacher_apply_to_session(uuid,text,integer,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v218_teacher_apply_to_session(uuid,text,integer,integer,integer) TO authenticated;
