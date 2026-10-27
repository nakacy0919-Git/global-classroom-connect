-- GCC V14.1: extend optional teacher introduction length without changing approval or ownership.
-- Only modify length 1000 -> 3000 in the production RPC; all other behavior is retained.
BEGIN;
CREATE OR REPLACE FUNCTION public.gcc_v120_submit_application(p_data jsonb, p_photo_path text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 IF char_length(n) NOT BETWEEN 2 AND 120 OR char_length(bio) NOT BETWEEN 20 AND 3000 OR
  char_length(sn) NOT BETWEEN 2 AND 160 OR char_length(city) NOT BETWEEN 2 AND 120 OR
  (reg<>'' AND char_length(reg) NOT BETWEEN 2 AND 120) OR char_length(country) NOT BETWEEN 2 AND 120 OR
  code !~ '^[A-Z]{2}$' OR length(zone)<3 OR level NOT IN ('Elementary','Junior high','High school','University','Other') OR
  kind NOT IN ('Public','Private','Independent / individual','Other')
 THEN RAISE EXCEPTION 'Please complete all mandatory teacher and school information';END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=zone) THEN RAISE EXCEPTION 'Choose a valid school time zone'; END IF;
 IF (website<>'' AND (
  char_length(website)>240 OR website !~* '^https://[a-z0-9][a-z0-9.-]+(/[[:graph:]]*)?$'
  OR website ~ '[<>"''\\]'
 )) OR (site<>'' AND (
  char_length(site)>240 OR site !~* '^https://[a-z0-9][a-z0-9.-]+(/[[:graph:]]*)?$'
  OR site ~ '[<>"''\\]'
 )) THEN RAISE EXCEPTION 'Provided website URLs must be valid HTTPS addresses';END IF;
 IF NOT public.gcc_v120_can_upload_photo(p_photo_path) OR split_part(p_photo_path,'/',1)<>a.teacher_id::text
 THEN RAISE EXCEPTION 'Please upload your own photo';END IF;
 SELECT metadata INTO photo FROM storage.objects WHERE bucket_id='teacher-photos' AND name=p_photo_path;
 IF NOT FOUND THEN RAISE EXCEPTION 'Uploaded WebP photo not found';END IF;
 IF COALESCE((photo.metadata->>'size')::bigint,99999999)>300000 OR
 COALESCE(photo.metadata->>'mimetype','')<>'image/webp' THEN RAISE EXCEPTION 'Photo must be a valid WebP under 300 KB';END IF;
 IF EXISTS(SELECT 1 FROM public.teachers WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'This account is already an approved teacher';END IF;
 UPDATE public.gcc_v120_applications SET teacher_name=n,teacher_bio=bio,teacher_website=nullif(website,''),
 photo_path=p_photo_path,school_name=sn,school_type=kind,school_level=level,
 school_country=country,school_country_code=code,school_city=city,school_region=nullif(reg,''),
 school_website=nullif(site,''),school_timezone=zone,status='pending',submitted_at=now()
 WHERE id=a.id;
 RETURN jsonb_build_object('status','pending','id',a.id);
END $function$;
COMMIT;
