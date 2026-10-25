-- GCC V11.6: private teacher network + opt-in member directory; no roster/event modification.
BEGIN;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS directory_visible boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.gcc_v116_my_profile()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid;v jsonb;
BEGIN
 tid:=public.gcc_current_teacher_id();
 SELECT jsonb_build_object('id',t.id,'name',t.display_name,'job_title',t.job_title,
 'bio',t.bio,'languages',COALESCE(to_jsonb(t.languages),'[]'::jsonb),
 'directory_visible',t.directory_visible,'photo_path',t.photo_path,
 'school_id',s.id,'school',s.name,'country_code',s.country_code,
 'country_name',s.country_name,'school_level',s.school_level,
 'city',s.city,'timezone',s.timezone)
 INTO v FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
 WHERE t.id=tid;
 IF v IS NULL THEN RAISE EXCEPTION 'Teacher school assignment is missing';END IF;
 RETURN v;
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v116_my_profile() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v116_my_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v116_save_my_profile(
 p_name text,p_job_title text,p_bio text,p_languages text[],p_visible boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid;clean_name text:=btrim(COALESCE(p_name,''));
BEGIN
 tid:=public.gcc_current_teacher_id();
 IF char_length(clean_name) NOT BETWEEN 2 AND 120 OR clean_name ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Enter a valid name (2-120 characters)';END IF;
 IF char_length(COALESCE(p_job_title,''))>120 OR char_length(COALESCE(p_bio,''))>1000 THEN
  RAISE EXCEPTION 'Profile text is too long'; END IF;
 IF COALESCE(array_length(p_languages,1),0)>8 OR EXISTS
 (SELECT 1 FROM unnest(COALESCE(p_languages,ARRAY[]::text[])) x WHERE char_length(x)>40 OR char_length(x)<1)
 THEN RAISE EXCEPTION 'Choose up to eight short language names';END IF;
 UPDATE public.teachers SET display_name=clean_name,job_title=NULLIF(btrim(COALESCE(p_job_title,'')),''),
 bio=NULLIF(btrim(COALESCE(p_bio,'')),''),languages=COALESCE(p_languages,ARRAY[]::text[]),
 directory_visible=COALESCE(p_visible,false),updated_at=now() WHERE id=tid;
 RETURN public.gcc_v116_my_profile();
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v116_save_my_profile(text,text,text,text[],boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v116_save_my_profile(text,text,text,text[],boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v116_can_upload_photo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT COALESCE(auth.uid() IS NOT NULL AND p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
 AND EXISTS(SELECT 1 FROM public.teachers t JOIN public.profiles p ON p.id=t.auth_user_id
 WHERE t.id::text=split_part(p_path,'/',1) AND t.auth_user_id=auth.uid()
 AND t.is_active AND p.role='teacher'),false);
$fn$;
REVOKE ALL ON FUNCTION public.gcc_v116_can_upload_photo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v116_can_upload_photo(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v116_can_read_photo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT COALESCE(auth.uid() IS NOT NULL AND (
   EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=auth.uid() AND p.role='host')
   OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.auth_user_id=auth.uid()
      AND t.is_active AND t.photo_path=p_path)
   OR (EXISTS(SELECT 1 FROM public.teachers reader JOIN public.profiles pr ON reader.auth_user_id=pr.id
      WHERE reader.auth_user_id=auth.uid() AND reader.is_active AND pr.role='teacher')
     AND EXISTS(SELECT 1 FROM public.teachers subject WHERE subject.photo_path=p_path
      AND subject.directory_visible AND subject.is_active))
 ),false);
$fn$;
REVOKE ALL ON FUNCTION public.gcc_v116_can_read_photo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v116_can_read_photo(text) TO authenticated;

DROP POLICY IF EXISTS "GCC V116 teacher WebP upload" ON storage.objects;
CREATE POLICY "GCC V116 teacher WebP upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='teacher-photos' AND public.gcc_v116_can_upload_photo(name)
 AND lower(storage.extension(name))='webp');
DROP POLICY IF EXISTS "GCC V116 teacher signed photo read" ON storage.objects;
CREATE POLICY "GCC V116 teacher signed photo read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='teacher-photos' AND public.gcc_v116_can_read_photo(name));

CREATE OR REPLACE FUNCTION public.gcc_v116_save_my_photo(p_path text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid;obj record;
BEGIN
 tid:=public.gcc_current_teacher_id();
 IF NOT public.gcc_v116_can_upload_photo(p_path) OR split_part(p_path,'/',1)<>tid::text THEN
  RAISE EXCEPTION 'Photo path is not permitted';END IF;
 SELECT name,metadata INTO obj FROM storage.objects
 WHERE bucket_id='teacher-photos' AND name=p_path;
 IF NOT FOUND THEN RAISE EXCEPTION 'Upload the photo first';END IF;
 IF COALESCE((obj.metadata->>'size')::bigint,999999999)>300000 OR
  COALESCE(obj.metadata->>'mimetype','')<>'image/webp' THEN
  RAISE EXCEPTION 'Photo must be a WebP image under 300 KB';END IF;
 UPDATE public.teachers SET photo_path=p_path,updated_at=now() WHERE id=tid;
 RETURN jsonb_build_object('ok',true,'photo_path',p_path);
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v116_save_my_photo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v116_save_my_photo(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v116_teacher_directory()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid;v jsonb;
BEGIN
 tid:=public.gcc_current_teacher_id();
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.display_name,
  'job_title',t.job_title,'bio',t.bio,'languages',COALESCE(to_jsonb(t.languages),'[]'::jsonb),
  'photo_path',t.photo_path,'school',s.name,'school_level',s.school_level,
  'country_code',s.country_code,'country_name',s.country_name,'city',s.city)
 ORDER BY s.country_name,s.name,t.display_name),'[]'::jsonb) INTO v
 FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
 WHERE t.directory_visible=true AND t.is_active=true AND s.is_active=true;
 RETURN v;
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v116_teacher_directory() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v116_teacher_directory() TO authenticated;
COMMIT;
