-- GCC V13.5: restore draft teacher photo uploads blocked by premature storage metadata checks.
-- Keep the original owner-only, draft-only server function and WebP extension checks.
-- Storage may not populate size and MIME metadata at INSERT policy evaluation time.
-- gcc_v120_submit_application still validates actual stored metadata before accepting any application.
BEGIN;
DROP POLICY IF EXISTS "GCC V120 applicant upload" ON storage.objects;
CREATE POLICY "GCC V120 applicant upload"
 ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (
  bucket_id='teacher-photos'
  AND public.gcc_v120_can_upload_photo(name)
  AND lower(storage.extension(name))='webp'
 );
COMMIT;
