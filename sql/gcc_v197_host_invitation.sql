-- GCC V19.7 durable, host-only room invitations using encrypted Supabase Vault secrets.
-- Previously issued hashes require explicit, one-time replacement if lost.
CREATE OR REPLACE FUNCTION public.gcc_v197_host_invitation(p_event_id uuid, p_issue boolean DEFAULT false, p_replace_lost boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_plan record;
  v_gate record;
  v_name text := 'gcc-v197-room-invite-' || p_event_id::text;
  v_secret text;
  v_saved jsonb;
  v_token text;
  v_code text;
  v_token_hash text;
  v_code_hash text;
  v_expiry timestamptz;
  v_has_code boolean := false;
  v_approved integer;
  v_saved_count integer;
  v_unique_count integer;
  v_draft jsonb;
  v_n bigint;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Host sign-in required'; END IF;
  PERFORM public.gcc_v6_require_host();

  SELECT p.event_id,p.revision,p.is_active,p.token_hash,e.starts_at,
         e.status,d.revision AS draft_revision,d.draft
    INTO v_plan
    FROM public.gcc_v102_shared_plans p
    JOIN public.events e ON e.id=p.event_id
    LEFT JOIN public.gcc_v91_room_drafts d ON d.event_id=p.event_id
   WHERE p.event_id=p_event_id
   FOR UPDATE OF p;
  IF NOT FOUND OR NOT v_plan.is_active THEN
    RETURN jsonb_build_object('ready',false,'not_published',true);
  END IF;

  SELECT a.event_id,a.enabled,a.expires_at,a.code_hash,a.publication_hash,a.revision
    INTO v_gate
    FROM public.gcc_v104_shared_access a
   WHERE a.event_id=p_event_id FOR UPDATE;
  v_has_code := FOUND;

  SELECT s.decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets s WHERE s.name=v_name LIMIT 1;
  IF FOUND THEN
    v_saved := v_secret::jsonb;
    v_token := v_saved->>'token';
    v_code := v_saved->>'code';
    IF v_token !~ '^[a-f0-9]{64}$' OR v_code !~ '^[0-9]{6}$'
       OR NOT v_has_code
       OR encode(sha256(convert_to(v_token,'UTF8')),'hex') IS DISTINCT FROM v_plan.token_hash
       OR encode(sha256(convert_to(v_code||':'||v_plan.token_hash,'UTF8')),'hex') IS DISTINCT FROM v_gate.code_hash
    THEN
      RAISE EXCEPTION 'Saved invitation does not match active hashes; contact an administrator';
    END IF;
    RETURN jsonb_build_object(
      'ready', v_gate.enabled AND v_gate.expires_at>now()
             AND v_plan.revision=v_plan.draft_revision
             AND v_gate.revision=v_plan.revision
             AND v_gate.publication_hash=v_plan.token_hash,
      'token',v_token, 'code',v_code, 'expires_at',v_gate.expires_at,
      'saved',true, 'disabled',NOT v_gate.enabled
    );
  END IF;

  IF NOT p_issue THEN
    RETURN jsonb_build_object(
      'ready',false,'needs_replacement',v_has_code AND v_gate.enabled AND v_gate.expires_at>now(),
      'can_issue',NOT v_has_code,
      'disabled',v_has_code AND NOT v_gate.enabled,
      'expired',v_has_code AND v_gate.expires_at<=now()
    );
  END IF;
  IF v_has_code AND (NOT v_gate.enabled OR v_gate.expires_at<=now()) THEN
    RAISE EXCEPTION 'Disabled or expired invitations cannot be reissued';
  END IF;
  IF v_has_code AND NOT p_replace_lost THEN
    RAISE EXCEPTION 'Existing invitation is not recoverable; confirm replacement';
  END IF;
  IF v_plan.status NOT IN ('published','live') OR v_plan.draft_revision IS NULL
     OR v_plan.revision<>v_plan.draft_revision THEN
    RAISE EXCEPTION 'Publish the latest saved seating plan before sharing';
  END IF;

  v_draft := v_plan.draft;
  SELECT count(*) INTO v_approved
    FROM public.gcc_session_signup_students st
    JOIN public.gcc_session_signups s ON s.id=st.signup_id
   WHERE s.event_id=p_event_id AND s.status='approved';
  SELECT count(*),count(DISTINCT member.id)
    INTO v_saved_count,v_unique_count
    FROM jsonb_array_elements(v_draft->'rooms') r(room),
         LATERAL jsonb_array_elements_text(r.room->'students') member(id);
  IF v_approved=0 OR v_approved>2000 OR v_approved<>v_saved_count
     OR v_saved_count<>v_unique_count
     OR EXISTS (
       SELECT st.id::text
       FROM public.gcc_session_signup_students st
       JOIN public.gcc_session_signups s ON s.id=st.signup_id
       WHERE s.event_id=p_event_id AND s.status='approved'
       EXCEPT
       SELECT member.id
       FROM jsonb_array_elements(v_draft->'rooms') r(room),
            LATERAL jsonb_array_elements_text(r.room->'students') member(id)
     ) THEN
    RAISE EXCEPTION 'Approved students and saved room assignments do not match';
  END IF;

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_token_hash:=encode(sha256(convert_to(v_token,'UTF8')),'hex');
  v_n:=('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint;
  v_code:=lpad((v_n%1000000)::text,6,'0');
  v_code_hash:=encode(sha256(convert_to(v_code||':'||v_token_hash,'UTF8')),'hex');
  v_expiry:=CASE WHEN v_has_code THEN v_gate.expires_at ELSE
     greatest(now()+interval '24 hours',least(now()+interval '60 days',v_plan.starts_at+interval '1 day'))
   END;

  UPDATE public.gcc_v102_shared_plans
     SET token_hash=v_token_hash
   WHERE event_id=p_event_id;

  IF v_has_code THEN
    UPDATE public.gcc_v104_shared_access
       SET publication_hash=v_token_hash, code_hash=v_code_hash,
           revision=v_plan.revision,issued_at=now(),
           failed_attempts=0,window_started_at=NULL,locked_until=NULL
     WHERE event_id=p_event_id;
  ELSE
    INSERT INTO public.gcc_v104_shared_access
      (event_id,publication_hash,revision,code_hash,enabled,expires_at,issued_at,
       failed_attempts,window_started_at,locked_until)
    VALUES (p_event_id,v_token_hash,v_plan.revision,v_code_hash,true,v_expiry,now(),0,NULL,NULL);
  END IF;

  PERFORM vault.create_secret(
    jsonb_build_object('token',v_token,'code',v_code)::text,
    v_name, 'Host-only fixed GCC room invitation (V19.7)'
  );
  RETURN jsonb_build_object(
    'ready',true,'token',v_token,'code',v_code,'expires_at',v_expiry,
    'saved',true,'newly_issued',true,'replaced_lost',v_has_code
  );
END;
$function$

REVOKE ALL ON FUNCTION public.gcc_v197_host_invitation(uuid,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v197_host_invitation(uuid,boolean,boolean) TO authenticated;
