-- GCC V20.7 — All *new* flyer uploads must be optimized WebP <= 800 KiB.
-- Existing JPEG and PNG flyers remain readable; no objects or URLs are deleted.
BEGIN;
DO $migration$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM storage.buckets WHERE id='gcc-session-flyers') THEN
   RAISE EXCEPTION 'GCC flyer bucket does not exist; refusing a silent migration';
 END IF;
 UPDATE storage.buckets
 SET allowed_mime_types=ARRAY['image/webp']::text[],
     file_size_limit=819200
 WHERE id='gcc-session-flyers';
END $migration$;
COMMIT;
