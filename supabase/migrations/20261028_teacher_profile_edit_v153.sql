-- GCC V15.3: Self-service editing for approved teachers; verified school edits require host review.
-- Photo Storage remains a private bucket and all changes are scoped to the signed-in teacher.
CREATE OR REPLACE FUNCTION public.gcc_v116_save_my_profile(
 p_name text,p_job_title text,p_bio text,p_languages text[],p_visible boolean)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tid uuid;clean_name text:=btrim(coalesce(p_name,''));
BEGIN
 tid:=public.gcc_current_teacher_id();
 IF char_length(clean_name) NOT BETWEEN 2 AND 120 OR clean_name ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Enter a valid name (2-120 characters)'; END IF;
 IF char_length(coalesce(p_job_title,''))>120 OR char_length(coalesce(p_bio,''))>3000 THEN
  RAISE EXCEPTION 'Profile text is too long'; END IF;
 IF coalesce(array_length(p_languages,1),0)>8 OR EXISTS
 (SELECT 1 FROM unnest(coalesce(p_languages,ARRAY[]::text[])) x WHERE char_length(x)>40 OR char_length(x)<1)
 THEN RAISE EXCEPTION 'Choose up to eight short language names'; END IF;
 UPDATE public.teachers SET display_name=clean_name,
 job_title=nullif(btrim(coalesce(p_job_title,'')),''),
 bio=nullif(btrim(coalesce(p_bio,'')),''),
 languages=coalesce(p_languages,ARRAY[]::text[]),
 directory_visible=coalesce(p_visible,false),updated_at=now()
 WHERE id=tid;
 RETURN public.gcc_v116_my_profile();
END $$;
REVOKE ALL ON FUNCTION public.gcc_v116_save_my_profile(text,text,text,text[],boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v116_save_my_profile(text,text,text,text[],boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v153_clear_my_photo()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tid uuid:=public.gcc_current_teacher_id(); old_path text;
BEGIN
 SELECT photo_path INTO old_path FROM public.teachers WHERE id=tid FOR UPDATE;
 UPDATE public.teachers SET photo_path=null,updated_at=now() WHERE id=tid;
 RETURN old_path;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v153_clear_my_photo() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v153_clear_my_photo() TO authenticated;

-- Existing owner-only check validates that the path belongs to the approved teacher.
-- SELECT is required for Storage removal alongside DELETE.
DROP POLICY IF EXISTS "GCC V153 teacher own-photo read" ON storage.objects;
CREATE POLICY "GCC V153 teacher own-photo read" ON storage.objects
 FOR SELECT TO authenticated
 USING (bucket_id='teacher-photos' AND public.gcc_v116_can_upload_photo(name));
DROP POLICY IF EXISTS "GCC V153 teacher own-photo cleanup" ON storage.objects;
CREATE POLICY "GCC V153 teacher own-photo cleanup" ON storage.objects
 FOR DELETE TO authenticated
 USING (bucket_id='teacher-photos' AND public.gcc_v116_can_upload_photo(name));

-- School identity is shared by teachers at a school; corrections are approved by a Host.
CREATE TABLE IF NOT EXISTS public.gcc_v153_school_edit_requests(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 teacher_id uuid NOT NULL REFERENCES public.teachers(id),
 school_id uuid NOT NULL REFERENCES public.schools(id),
 requested jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewed_by uuid
);
ALTER TABLE public.gcc_v153_school_edit_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gcc_v153_school_edit_requests FROM PUBLIC,anon,authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS gcc_v153_school_edit_pending_unique
ON public.gcc_v153_school_edit_requests(teacher_id) WHERE status='pending';

CREATE OR REPLACE FUNCTION public.gcc_v153_request_school_edit(p_changes jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tid uuid:=public.gcc_current_teacher_id(); sid uuid; req uuid; x jsonb;
BEGIN
 SELECT school_id INTO sid FROM public.teachers WHERE id=tid;
 IF sid IS NULL OR p_changes IS NULL OR jsonb_typeof(p_changes)<>'object'
 OR (SELECT count(*) FROM jsonb_object_keys(p_changes))<>6
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_changes) AS k
   WHERE k NOT IN ('name','city','region','school_type','school_level','website_url')) THEN
   RAISE EXCEPTION 'Invalid school correction request'; END IF;
 IF length(btrim(coalesce(p_changes->>'name',''))) NOT BETWEEN 2 AND 160
  OR length(coalesce(p_changes->>'city',''))>120
  OR length(coalesce(p_changes->>'region',''))>120
  OR length(coalesce(p_changes->>'school_type',''))>80
  OR length(coalesce(p_changes->>'school_level',''))>80
  OR length(coalesce(p_changes->>'website_url',''))>240 THEN
  RAISE EXCEPTION 'Some school details are invalid or too long'; END IF;
 IF coalesce(p_changes->>'website_url','')<>'' AND
  (p_changes->>'website_url' !~ '^https://[^ /?#@]+(\.[^ /?#@]+)+([^ ]*)?$') THEN
   RAISE EXCEPTION 'School website must be an HTTPS URL'; END IF;
 -- Do not allow teachers to change the school's verified country or time zone.
 x=jsonb_build_object('name',btrim(p_changes->>'name'),
   'city',btrim(coalesce(p_changes->>'city','')),
   'region',btrim(coalesce(p_changes->>'region','')),
   'school_type',btrim(coalesce(p_changes->>'school_type','')),
   'school_level',btrim(coalesce(p_changes->>'school_level','')),
   'website_url',btrim(coalesce(p_changes->>'website_url','')));
 INSERT INTO public.gcc_v153_school_edit_requests(teacher_id,school_id,requested)
 VALUES(tid,sid,x)
 ON CONFLICT (teacher_id) WHERE status='pending'
 DO UPDATE SET requested=excluded.requested,school_id=excluded.school_id,created_at=now()
 RETURNING id INTO req;
 RETURN req;
END $$;

CREATE OR REPLACE FUNCTION public.gcc_v153_my_school_edit()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tid uuid:=public.gcc_current_teacher_id(); v jsonb;
BEGIN
 SELECT jsonb_build_object('id',r.id,'status',r.status,'requested',r.requested,'created_at',r.created_at)
 INTO v FROM public.gcc_v153_school_edit_requests r WHERE teacher_id=tid
 ORDER BY created_at DESC LIMIT 1;
 RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.gcc_v153_host_school_edits()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE out jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='host') THEN
  RAISE EXCEPTION 'Host access required';END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at),'[]'::jsonb) INTO out FROM (
 SELECT r.id,r.created_at,r.requested,r.school_id,s.name AS school_name,
 t.display_name AS teacher_name,t.id AS teacher_id,
 jsonb_build_object('name',s.name,'city',s.city,'region',s.region,
 'school_type',s.school_type,'school_level',s.school_level,'website_url',s.website_url) AS current
 FROM public.gcc_v153_school_edit_requests r
 JOIN public.teachers t ON t.id=r.teacher_id
 JOIN public.schools s ON s.id=r.school_id
 WHERE r.status='pending' ORDER BY r.created_at LIMIT 200) q;
 RETURN out;
END $$;

CREATE OR REPLACE FUNCTION public.gcc_v153_review_school_edit(p_id uuid,p_accept boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='host') THEN
  RAISE EXCEPTION 'Host access required';END IF;
 SELECT * INTO r FROM public.gcc_v153_school_edit_requests WHERE id=p_id AND status='pending' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'This request has already been reviewed';END IF;
 IF p_accept THEN
   UPDATE public.schools SET
    name=r.requested->>'name',
    city=nullif(r.requested->>'city',''),
    region=nullif(r.requested->>'region',''),
    school_type=nullif(r.requested->>'school_type',''),
    school_level=nullif(r.requested->>'school_level',''),
    website_url=nullif(r.requested->>'website_url','')
   WHERE id=r.school_id;
 END IF;
 UPDATE public.gcc_v153_school_edit_requests SET
 status=CASE WHEN p_accept THEN 'approved' ELSE 'rejected' END,
 reviewed_at=now(),reviewed_by=auth.uid() WHERE id=r.id;
 RETURN jsonb_build_object('ok',true,'status',CASE WHEN p_accept THEN 'approved' ELSE 'rejected' END);
END $$;
REVOKE ALL ON FUNCTION public.gcc_v153_request_school_edit(jsonb) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v153_my_school_edit() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v153_host_school_edits() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.gcc_v153_review_school_edit(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v153_request_school_edit(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v153_my_school_edit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v153_host_school_edits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v153_review_school_edit(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v153_my_school_details()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE tid uuid:=public.gcc_current_teacher_id(); v jsonb;
BEGIN
 SELECT jsonb_build_object('name',s.name,'city',s.city,'region',s.region,
 'country_name',s.country_name,'country_code',s.country_code,
 'school_type',s.school_type,'school_level',s.school_level,
 'timezone',s.timezone,'website_url',s.website_url)
 INTO v FROM public.teachers t JOIN public.schools s ON s.id=t.school_id WHERE t.id=tid;
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v153_my_school_details() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.gcc_v153_my_school_details() TO authenticated;
