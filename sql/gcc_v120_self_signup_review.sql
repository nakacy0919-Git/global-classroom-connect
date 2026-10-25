-- GCC V12.0 teacher self-registration and multi-role host approval.
-- Migration is additive: preserves historical registration, student, session, and invitation records.
BEGIN;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS region text;
CREATE TABLE IF NOT EXISTS public.gcc_v120_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected')),
  teacher_name text, teacher_bio text, teacher_website text, photo_path text,
  school_name text, school_type text, school_level text,
  school_country text, school_country_code text, school_city text,
  school_region text, school_website text, school_timezone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz, reviewed_at timestamptz, reviewed_by uuid,
  approved_teacher_id uuid, approved_school_id uuid
);
ALTER TABLE public.gcc_v120_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_v120_applications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.gcc_v120_applications TO authenticated;
DROP POLICY IF EXISTS "GCC V120 read own signup" ON public.gcc_v120_applications;
CREATE POLICY "GCC V120 read own signup" ON public.gcc_v120_applications FOR SELECT TO authenticated USING (user_id=auth.uid());

-- A signed-in, email-verified person gets a draft linked only to their auth uid.
CREATE OR REPLACE FUNCTION public.gcc_v120_begin_application()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE a public.gcc_v120_applications%rowtype;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in';END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Please confirm your email address first';END IF;
 SELECT * INTO a FROM public.gcc_v120_applications WHERE user_id=auth.uid();
 IF NOT FOUND THEN
  INSERT INTO public.gcc_v120_applications(user_id) VALUES(auth.uid()) RETURNING * INTO a;
 END IF;
 RETURN jsonb_build_object('id',a.id,'teacher_id',a.teacher_id,'status',a.status,
  'photo_path',a.photo_path,'name',a.teacher_name,'bio',a.teacher_bio,'website',a.teacher_website,
  'school_name',a.school_name,'school_type',a.school_type,'school_level',a.school_level,
  'country',a.school_country,'country_code',a.school_country_code,'city',a.school_city,
  'region',a.school_region,'school_website',a.school_website,'timezone',a.school_timezone);
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v120_begin_application() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_begin_application() TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v120_can_upload_photo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT COALESCE(auth.uid() IS NOT NULL AND p_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' AND
 EXISTS(SELECT 1 FROM public.gcc_v120_applications a WHERE a.user_id=auth.uid() AND a.status='draft'
  AND split_part(p_path,'/',1)=a.teacher_id::text),false);
$fn$;
REVOKE ALL ON FUNCTION public.gcc_v120_can_upload_photo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_can_upload_photo(text) TO authenticated;
DROP POLICY IF EXISTS "GCC V120 applicant upload" ON storage.objects;
CREATE POLICY "GCC V120 applicant upload" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='teacher-photos' AND public.gcc_v120_can_upload_photo(name) AND lower(storage.extension(name))='webp'
 AND coalesce((metadata->>'size')::bigint,99999999)<=300000
 AND coalesce(metadata->>'mimetype','')='image/webp');

CREATE OR REPLACE FUNCTION public.gcc_v120_can_read_photo(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM public.gcc_v120_applications a WHERE a.user_id=auth.uid() AND a.photo_path=p_path
 ),false);
$fn$;
REVOKE ALL ON FUNCTION public.gcc_v120_can_read_photo(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_can_read_photo(text) TO authenticated;
DROP POLICY IF EXISTS "GCC V120 applicant photo read" ON storage.objects;
CREATE POLICY "GCC V120 applicant photo read" ON storage.objects FOR SELECT TO authenticated
USING(bucket_id='teacher-photos' AND public.gcc_v120_can_read_photo(name));

CREATE OR REPLACE FUNCTION public.gcc_v120_submit_application(p_data jsonb,p_photo_path text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE a public.gcc_v120_applications%rowtype;
  n text:=btrim(coalesce(p_data->>'name','')); bio text:=btrim(coalesce(p_data->>'bio',''));
  website text:=btrim(coalesce(p_data->>'website','')); sn text:=btrim(coalesce(p_data->>'school_name',''));
  site text:=btrim(coalesce(p_data->>'school_website','')); city text:=btrim(coalesce(p_data->>'city',''));
  reg text:=btrim(coalesce(p_data->>'region','')); country text:=btrim(coalesce(p_data->>'country',''));
  code text:=upper(btrim(coalesce(p_data->>'country_code',''))); zone text:=btrim(coalesce(p_data->>'timezone',''));
  kind text:=btrim(coalesce(p_data->>'school_type',''));level text:=btrim(coalesce(p_data->>'school_level',''));
  photo record;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in';END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Please confirm your email';END IF;
 SELECT * INTO a FROM public.gcc_v120_applications WHERE user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND OR a.status<>'draft' THEN RAISE EXCEPTION 'Application is not editable';END IF;
 IF char_length(n) NOT BETWEEN 2 AND 120 OR char_length(bio) NOT BETWEEN 20 AND 1000 OR
  char_length(sn) NOT BETWEEN 2 AND 160 OR char_length(city) NOT BETWEEN 2 AND 120 OR
  char_length(reg) NOT BETWEEN 2 AND 120 OR char_length(country) NOT BETWEEN 2 AND 120 OR
  code !~ '^[A-Z]{2}$' OR length(zone)<3 OR level NOT IN ('Elementary','Junior high','High school','University','Other') OR
  kind NOT IN ('Public','Private','Independent / individual','Other')
 THEN RAISE EXCEPTION 'Please complete all mandatory teacher and school information';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Choose a valid school time zone'; END IF;
 IF char_length(website)>240 OR website !~* '^https://[a-z0-9][a-z0-9.-]+(/[[:graph:]]*)?$' OR
  char_length(site)>240 OR site !~* '^https://[a-z0-9][a-z0-9.-]+(/[[:graph:]]*)?$' OR
  website ~ '[<>"''\\]' OR site ~ '[<>"''\\]' THEN RAISE EXCEPTION 'Both website URLs must be valid HTTPS addresses';END IF;
 IF NOT public.gcc_v120_can_upload_photo(p_photo_path) OR split_part(p_photo_path,'/',1)<>a.teacher_id::text
 THEN RAISE EXCEPTION 'Please upload your own photo';END IF;
 SELECT metadata INTO photo FROM storage.objects WHERE bucket_id='teacher-photos' AND name=p_photo_path;
 IF NOT FOUND THEN RAISE EXCEPTION 'Uploaded WebP photo not found';END IF;
 IF COALESCE((photo.metadata->>'size')::bigint,99999999)>300000 OR
 COALESCE(photo.metadata->>'mimetype','')<>'image/webp' THEN RAISE EXCEPTION 'Photo must be a valid WebP under 300 KB';END IF;
 IF EXISTS(SELECT 1 FROM public.teachers WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'This account is already an approved teacher';END IF;
 UPDATE public.gcc_v120_applications SET teacher_name=n,teacher_bio=bio,teacher_website=website,
 photo_path=p_photo_path,school_name=sn,school_type=kind,school_level=level,
 school_country=country,school_country_code=code,school_city=city,school_region=reg,
 school_website=site,school_timezone=zone,status='pending',submitted_at=now()
 WHERE id=a.id;
 RETURN jsonb_build_object('status','pending','id',a.id);
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v120_submit_application(jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_submit_application(jsonb,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v120_admin_applications()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE result jsonb;
BEGIN
 PERFORM public.gcc_v6_require_host();
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'status',a.status,'name',a.teacher_name,
  'email',u.email,'bio',a.teacher_bio,'website',a.teacher_website,'photo_path',a.photo_path,
  'school',a.school_name,'school_type',a.school_type,'school_level',a.school_level,
  'country',a.school_country,'city',a.school_city,'region',a.school_region,
  'school_website',a.school_website,'timezone',a.school_timezone,'submitted_at',a.submitted_at)
  ORDER BY a.submitted_at DESC),'[]'::jsonb) INTO result
 FROM public.gcc_v120_applications a JOIN auth.users u ON u.id=a.user_id WHERE a.status='pending';
 RETURN result;
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v120_admin_applications() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_admin_applications() TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v120_review_application(p_id uuid,p_decision text,p_grant_host boolean DEFAULT false,p_existing_school_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE a public.gcc_v120_applications%rowtype;sid uuid;approved_role text;linked_id uuid;previous_sid uuid;
BEGIN
 PERFORM public.gcc_v6_require_host();
 IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid decision';END IF;
 SELECT * INTO a FROM public.gcc_v120_applications WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.status<>'pending' THEN RAISE EXCEPTION 'Pending application not found';END IF;
 IF p_decision='rejected' THEN
  UPDATE public.gcc_v120_applications SET status='rejected',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=p_id;
  RETURN jsonb_build_object('status','rejected');
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=a.user_id AND email_confirmed_at IS NOT NULL)
 THEN RAISE EXCEPTION 'Teacher must verify email';END IF;
 IF EXISTS(SELECT 1 FROM public.teachers WHERE auth_user_id=a.user_id) THEN RAISE EXCEPTION 'Account is already linked to a teacher';END IF;
 -- Reuse historical teacher and school records where possible.
 SELECT t.id,t.school_id INTO linked_id,previous_sid FROM public.teachers t JOIN auth.users u
 ON lower(btrim(t.email))=lower(btrim(u.email))
 WHERE u.id=a.user_id AND t.auth_user_id IS NULL AND t.is_active=true
 ORDER BY t.created_at DESC LIMIT 1 FOR UPDATE OF t;
 IF p_existing_school_id IS NOT NULL THEN
  SELECT id INTO sid FROM public.schools WHERE id=p_existing_school_id AND is_active=true;
  IF sid IS NULL THEN RAISE EXCEPTION 'Selected school is not active';END IF;
 ELSIF linked_id IS NOT NULL AND previous_sid IS NOT NULL THEN
  sid:=previous_sid;
 ELSE
  INSERT INTO public.schools(name,country_code,country_name,city,region,school_type,school_level,timezone,
  website_url,verification_url,is_public,is_active)
  VALUES(a.school_name,a.school_country_code,a.school_country,a.school_city,a.school_region,a.school_type,
   a.school_level,a.school_timezone,a.school_website,a.school_website,true,true) RETURNING id INTO sid;
 END IF;
 IF linked_id IS NOT NULL THEN
  UPDATE public.teachers SET auth_user_id=a.user_id,school_id=sid,
   display_name=a.teacher_name,bio=a.teacher_bio,website_url=a.teacher_website,
   photo_path=a.photo_path,updated_at=now() WHERE id=linked_id;
 ELSE
  INSERT INTO public.teachers(id,school_id,display_name,email,bio,website_url,photo_path,
    auth_user_id,is_active,directory_visible)
  SELECT a.teacher_id,sid,a.teacher_name,u.email,a.teacher_bio,a.teacher_website,a.photo_path,
    a.user_id,true,false FROM auth.users u WHERE u.id=a.user_id;
  linked_id:=a.teacher_id;
 END IF;
 SELECT role INTO approved_role FROM public.profiles WHERE id=a.user_id;
 INSERT INTO public.profiles(id,display_name,role)
 VALUES(a.user_id,a.teacher_name,CASE WHEN p_grant_host THEN 'host' ELSE 'teacher' END)
 ON CONFLICT(id) DO UPDATE SET display_name=excluded.display_name,
 role=CASE WHEN public.profiles.role='host' THEN 'host' ELSE excluded.role END;
 UPDATE public.gcc_v120_applications SET status='approved',reviewed_by=auth.uid(),reviewed_at=now(),
 approved_teacher_id=linked_id,approved_school_id=sid WHERE id=a.id;
 RETURN jsonb_build_object('status','approved','teacher_id',linked_id,'school_id',sid,
   'host_admin',CASE WHEN approved_role='host' THEN true ELSE p_grant_host END);
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v120_review_application(uuid,text,boolean,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v120_review_application(uuid,text,boolean,uuid) TO authenticated;

-- Existing host remains host; linked hosts may also enter the teacher workspace.
CREATE OR REPLACE FUNCTION public.gcc_current_teacher_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_temp' AS $fn$
DECLARE tid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Teacher sign-in required';END IF;
 SELECT t.id INTO tid FROM public.teachers t JOIN public.profiles p ON p.id=t.auth_user_id
 WHERE t.auth_user_id=auth.uid() AND t.is_active=true AND p.role IN ('teacher','host') LIMIT 1;
 IF tid IS NULL THEN RAISE EXCEPTION 'Teacher access pending approval. Please complete your school profile or contact your admin.';END IF;
 RETURN tid;
END $fn$;
-- Preserve original executable grants (function CREATE OR REPLACE preserves ACL).
COMMIT;
