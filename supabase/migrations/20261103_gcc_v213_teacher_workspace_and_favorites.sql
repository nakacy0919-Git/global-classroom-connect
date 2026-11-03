-- GCC V21.3 Phase 2: private teacher draft and favorite sessions.
-- Depends on GCC V21.2 teacher identity setup; does not change published sessions,
-- registrations, room plans, meeting links or permanent invitations.
BEGIN;

CREATE TABLE IF NOT EXISTS public.gcc_teacher_workspace_v213(
  teacher_id uuid PRIMARY KEY REFERENCES public.teachers(id) ON DELETE CASCADE,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft_updated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gcc_v213_draft_object CHECK (jsonb_typeof(draft)='object'),
  CONSTRAINT gcc_v213_draft_limit CHECK (octet_length(draft::text)<=24000)
);
CREATE TABLE IF NOT EXISTS public.gcc_teacher_favorites_v213(
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  source text NOT NULL CHECK(source IN ('offer','event')),
  session_id uuid NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(teacher_id,source,session_id)
);
CREATE INDEX IF NOT EXISTS gcc_teacher_favorites_v213_teacher_idx
 ON public.gcc_teacher_favorites_v213(teacher_id,saved_at DESC);

ALTER TABLE public.gcc_teacher_workspace_v213 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_teacher_favorites_v213 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_teacher_workspace_v213 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON TABLE public.gcc_teacher_favorites_v213 FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v213_teacher_workspace()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); result jsonb;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in is required';END IF;
 SELECT jsonb_build_object(
  'draft',coalesce((SELECT w.draft FROM public.gcc_teacher_workspace_v213 w WHERE w.teacher_id=tid),'{}'::jsonb),
  'draft_updated_at',(SELECT w.draft_updated_at FROM public.gcc_teacher_workspace_v213 w WHERE w.teacher_id=tid),
  'favorites',coalesce((
    SELECT jsonb_agg(jsonb_build_object('source',f.source,'id',f.session_id)
      ORDER BY f.saved_at DESC)
    FROM public.gcc_teacher_favorites_v213 f WHERE f.teacher_id=tid
  ),'[]'::jsonb)
 ) INTO result;
 RETURN result;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v213_save_teacher_draft(p_draft jsonb)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); stamp timestamptz:=clock_timestamp();
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in is required';END IF;
 IF p_draft IS NULL OR jsonb_typeof(p_draft)<>'object'
  OR (p_draft->>'version') IS DISTINCT FROM '1' OR jsonb_typeof(p_draft->'fields') IS DISTINCT FROM 'object'
  OR octet_length(p_draft::text)>24000
  OR (SELECT count(*) FROM jsonb_object_keys(p_draft->'fields'))>80
  OR EXISTS (
    SELECT 1 FROM jsonb_each(p_draft->'fields') AS field(k,v)
    WHERE field.k !~ '^(gctp-[a-z0-9-]{1,45}|gctp-mode|gctp-target-level)$'
    OR (jsonb_typeof(field.v) NOT IN ('string','array'))
    OR octet_length(field.v::text)>4800
  ) THEN
  RAISE EXCEPTION 'Invalid session draft contents';END IF;
 INSERT INTO public.gcc_teacher_workspace_v213(teacher_id,draft,draft_updated_at,updated_at)
 VALUES(tid,p_draft,stamp,stamp)
 ON CONFLICT(teacher_id) DO UPDATE SET draft=EXCLUDED.draft,
 draft_updated_at=EXCLUDED.draft_updated_at,updated_at=EXCLUDED.updated_at;
 RETURN stamp;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v213_clear_teacher_draft()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id();
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in is required';END IF;
 UPDATE public.gcc_teacher_workspace_v213 SET draft='{}'::jsonb,
 draft_updated_at=NULL,updated_at=now() WHERE teacher_id=tid;
 RETURN true;
END $fn$;

CREATE OR REPLACE FUNCTION public.gcc_v213_set_teacher_favorite(
  p_source text,p_session_id uuid,p_saved boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid:=public.gcc_current_teacher_id(); max_count integer;
BEGIN
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher sign-in is required';END IF;
 IF p_source NOT IN ('offer','event') OR p_session_id IS NULL
  OR p_saved IS NULL THEN RAISE EXCEPTION 'Invalid favorite session';END IF;
 IF p_saved THEN
  IF p_source='offer' AND NOT EXISTS(
    SELECT 1 FROM public.exchange_availability a WHERE a.id=p_session_id
      AND a.ends_at>now() AND a.status='open'
  ) THEN RAISE EXCEPTION 'This session is no longer available';END IF;
  IF p_source='event' AND NOT EXISTS(
    SELECT 1 FROM public.events e WHERE e.id=p_session_id
      AND e.ends_at>now() AND e.status='published'
  ) THEN RAISE EXCEPTION 'This published event is not available';END IF;
  SELECT count(*) INTO max_count FROM public.gcc_teacher_favorites_v213
   WHERE teacher_id=tid;
  IF max_count>=100 AND NOT EXISTS(
    SELECT 1 FROM public.gcc_teacher_favorites_v213
    WHERE teacher_id=tid AND source=p_source AND session_id=p_session_id)
  THEN RAISE EXCEPTION 'Save up to 100 favorite sessions';END IF;
  INSERT INTO public.gcc_teacher_favorites_v213(teacher_id,source,session_id)
  VALUES(tid,p_source,p_session_id) ON CONFLICT DO NOTHING;
 ELSE
  DELETE FROM public.gcc_teacher_favorites_v213
  WHERE teacher_id=tid AND source=p_source AND session_id=p_session_id;
 END IF;
 RETURN true;
END $fn$;

REVOKE ALL ON FUNCTION public.gcc_v213_teacher_workspace() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v213_save_teacher_draft(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v213_clear_teacher_draft() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v213_set_teacher_favorite(text,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v213_teacher_workspace() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v213_save_teacher_draft(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v213_clear_teacher_draft() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v213_set_teacher_favorite(text,uuid,boolean) TO authenticated;
COMMIT;
