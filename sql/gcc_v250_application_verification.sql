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

-- Reapply using the same verified identity, not by deleting or duplicating Auth.
CREATE FUNCTION public.gcc_v250_restart_application()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.gcc_v120_applications%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(
  SELECT 1 FROM auth.users u WHERE u.id=auth.uid() AND u.email_confirmed_at IS NOT NULL
  AND NOT coalesce(u.is_anonymous,false) AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())
 ) THEN RAISE EXCEPTION 'Sign in with your confirmed teacher email';END IF;
 SELECT * INTO a FROM public.gcc_v120_applications WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR a.status IS DISTINCT FROM 'rejected' OR a.approved_teacher_id IS NOT NULL
 OR EXISTS(SELECT 1 FROM public.teachers WHERE auth_user_id=auth.uid())
 OR EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='host')
 THEN RAISE EXCEPTION 'Only your own rejected teacher application can be restarted';END IF;
 UPDATE public.gcc_v120_applications SET status='draft',
 teacher_name=NULL,teacher_bio=NULL,teacher_website=NULL,photo_path=NULL,
 school_name=NULL,school_type=NULL,school_level=NULL,school_country=NULL,school_country_code=NULL,
 school_city=NULL,school_region=NULL,school_website=NULL,school_timezone=NULL,
 submitted_at=NULL,reviewed_at=NULL,reviewed_by=NULL
 WHERE id=a.id;
 RETURN jsonb_build_object('status','draft');
END $$;
REVOKE ALL ON FUNCTION public.gcc_v250_restart_application() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v250_restart_application() TO authenticated;
COMMIT;
