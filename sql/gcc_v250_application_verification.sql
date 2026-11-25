-- V25.0: prevent stale clients from approving incomplete teacher applications.
BEGIN;
CREATE FUNCTION public.gcc_v250_check_application_verification()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status NOT IN ('pending','approved') THEN RETURN NEW; END IF;
 IF coalesce(btrim(NEW.school_website),'') !~* '^https://[a-z0-9][a-z0-9.-]+(/[[:graph:]]*)?$'
 OR NEW.school_website ~ '[<>"''\\]' THEN
  RAISE EXCEPTION 'Provide a valid official school website before submitting or approving this application';
 END IF;
 IF NEW.status='approved' AND NOT EXISTS(
  SELECT 1 FROM storage.objects o WHERE o.bucket_id='teacher-photos' AND o.name=NEW.photo_path
   AND COALESCE(o.metadata->>'size','') ~ '^[0-9]{1,9}$'
   AND (o.metadata->>'size')::bigint BETWEEN 1 AND 300000
   AND ((lower(storage.extension(NEW.photo_path))='webp' AND o.metadata->>'mimetype'='image/webp')
    OR (lower(storage.extension(NEW.photo_path))='jpg' AND o.metadata->>'mimetype'='image/jpeg'))
 ) THEN RAISE EXCEPTION 'Applicant photograph is missing or invalid; verify it before approval';END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.gcc_v250_check_application_verification() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER gcc_v250_check_application_verification BEFORE UPDATE OF status ON public.gcc_v120_applications
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v250_check_application_verification();
COMMIT;
