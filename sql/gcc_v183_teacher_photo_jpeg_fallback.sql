-- GCC V18.3: JPEG fallback for browser environments without WebP canvas export.
-- Keep applicant ownership, confirmed auth, draft state, private bucket and <=300 KB validation.
-- Preserve the installed submit RPC's latest 3000-character biography and URL rules.
BEGIN;

CREATE OR REPLACE FUNCTION public.gcc_v120_can_upload_photo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $function$
 SELECT COALESCE(auth.uid() IS NOT NULL
 AND p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(webp|jpg)$'
 AND EXISTS(
  SELECT 1 FROM public.gcc_v120_applications a
  WHERE a.user_id=auth.uid() AND a.status='draft'
   AND split_part(p_path,'/',1)=a.teacher_id::text
 ),false);
$function$;
REVOKE ALL ON FUNCTION public.gcc_v120_can_upload_photo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_can_upload_photo(text) TO authenticated;

DROP POLICY IF EXISTS "GCC V120 applicant upload" ON storage.objects;
CREATE POLICY "GCC V120 applicant upload"
 ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (
  bucket_id='teacher-photos'
  AND public.gcc_v120_can_upload_photo(name)
  AND lower(storage.extension(name)) IN ('webp','jpg')
 );

-- Modify only the format-specific condition in the current secure RPC.
-- Do not revert subsequent fixes to biography length or HTTPS fields.
DO $migration$
DECLARE
 ddl text;
 old_check text:=$old$COALESCE(photo.metadata->>'mimetype','')<>'image/webp'$old$;
 new_check text:=$new$COALESCE(photo.metadata->>'mimetype','') <> CASE lower(storage.extension(p_photo_path))
  WHEN 'webp' THEN 'image/webp'
  WHEN 'jpg' THEN 'image/jpeg'
  ELSE 'unsupported'
 END$new$;
BEGIN
 SELECT pg_catalog.pg_get_functiondef('public.gcc_v120_submit_application(jsonb,text)'::regprocedure) INTO ddl;
 IF ddl IS NULL OR pg_catalog.strpos(ddl,old_check)=0 THEN
  RAISE EXCEPTION 'GCC photo format migration: the installed submit function has changed; review before applying';
 END IF;
 ddl=pg_catalog.replace(ddl,old_check,new_check);
 ddl=pg_catalog.replace(ddl,'Uploaded WebP photo not found','Uploaded photo not found');
 ddl=pg_catalog.replace(ddl,'Photo must be a valid WebP under 300 KB','Photo must be a valid WebP or JPEG under 300 KB');
 EXECUTE ddl || ';';
END $migration$;

-- Same executable permissions, no anonymous writes and no other storage policies changed.
REVOKE ALL ON FUNCTION public.gcc_v120_submit_application(jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_submit_application(jsonb,text) TO authenticated;
COMMIT;
