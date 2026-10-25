-- GCC V11.7: public gateway, opt-in socials and Global Classroom volunteer offers.
-- This is additive. It does NOT change roles, events, signups, room plans or teacher invitations.
BEGIN;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS instagram_url text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS facebook_url text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS other_social_url text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS volunteer_facilitator boolean NOT NULL DEFAULT false;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS volunteer_host boolean NOT NULL DEFAULT false;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS volunteer_note text;
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS volunteer_updated_at timestamptz;

-- Only a verified, active teacher can read or update their own opt-in details.
CREATE OR REPLACE FUNCTION public.gcc_v117_my_details()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE t record;
BEGIN
 SELECT website_url, instagram_url, facebook_url, other_social_url,
  volunteer_facilitator, volunteer_host, volunteer_note INTO t
 FROM public.teachers WHERE id=public.gcc_current_teacher_id();
 RETURN jsonb_build_object('website_url',t.website_url,'instagram_url',t.instagram_url,
  'facebook_url',t.facebook_url,'other_social_url',t.other_social_url,
  'volunteer_facilitator',t.volunteer_facilitator,'volunteer_host',t.volunteer_host,
  'volunteer_note',t.volunteer_note);
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v117_my_details() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v117_my_details() TO authenticated;

CREATE OR REPLACE FUNCTION public.gcc_v117_save_socials(
 p_website text,p_instagram text,p_facebook text,p_other text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_urls text[]:=ARRAY[
 NULLIF(btrim(COALESCE(p_website,'')),''),NULLIF(btrim(COALESCE(p_instagram,'')),''),
 NULLIF(btrim(COALESCE(p_facebook,'')),''),NULLIF(btrim(COALESCE(p_other,'')),'')];
 u text;tid uuid;
BEGIN
 tid:=public.gcc_current_teacher_id();
 FOREACH u IN ARRAY v_urls LOOP
  IF u IS NOT NULL AND (char_length(u)>240 OR u !~* '^https://[a-z0-9][a-z0-9.-]+(/[[:graph:]]*)?$'
      OR u ~ '[<>"''\\]') THEN
   RAISE EXCEPTION 'Use HTTPS website links only, maximum 240 characters';
  END IF;
 END LOOP;
 IF v_urls[2] IS NOT NULL AND v_urls[2] !~* '^https://(www\.)?instagram\.com/' THEN
   RAISE EXCEPTION 'Instagram link must use instagram.com'; END IF;
 IF v_urls[3] IS NOT NULL AND v_urls[3] !~* '^https://(www\.)?(facebook\.com|fb\.com)/' THEN
   RAISE EXCEPTION 'Facebook link must use facebook.com'; END IF;
 UPDATE public.teachers SET website_url=v_urls[1],instagram_url=v_urls[2],
  facebook_url=v_urls[3],other_social_url=v_urls[4],updated_at=now()
 WHERE id=tid;
 RETURN public.gcc_v117_my_details();
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v117_save_socials(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v117_save_socials(text,text,text,text) TO authenticated;

-- Volunteer is an expression of interest for GC-hosted events only: no privilege grants.
CREATE OR REPLACE FUNCTION public.gcc_v117_save_volunteer(
 p_facilitator boolean,p_host boolean,p_note text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid;
BEGIN
 tid:=public.gcc_current_teacher_id();
 IF char_length(COALESCE(p_note,''))>600 THEN
  RAISE EXCEPTION 'Availability note must be 600 characters or fewer';END IF;
 UPDATE public.teachers
 SET volunteer_facilitator=COALESCE(p_facilitator,false),
  volunteer_host=COALESCE(p_host,false),volunteer_note=NULLIF(btrim(COALESCE(p_note,'')),''),
  volunteer_updated_at=now(),updated_at=now()
 WHERE id=tid;
 RETURN public.gcc_v117_my_details();
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v117_save_volunteer(boolean,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v117_save_volunteer(boolean,boolean,text) TO authenticated;

-- Existing opt-in visibility is honored for the public-to-approved-teachers directory.
CREATE OR REPLACE FUNCTION public.gcc_v117_teacher_directory()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE tid uuid; v jsonb;
BEGIN
 tid:=public.gcc_current_teacher_id();
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',t.id,'name',t.display_name,'job_title',t.job_title,'bio',t.bio,
  'languages',COALESCE(to_jsonb(t.languages),'[]'::jsonb),'photo_path',t.photo_path,
  'school',s.name,'school_level',s.school_level,'country_code',s.country_code,
  'country_name',s.country_name,'city',s.city,
  'website_url',t.website_url,'instagram_url',t.instagram_url,
  'facebook_url',t.facebook_url,'other_social_url',t.other_social_url)
 ORDER BY s.country_name,s.name,t.display_name),'[]'::jsonb) INTO v
 FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
 WHERE t.directory_visible=true AND t.is_active=true AND s.is_active=true;
 RETURN v;
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v117_teacher_directory() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v117_teacher_directory() TO authenticated;

-- Private host-facing coordination list. Never used for automatic host permissions.
CREATE OR REPLACE FUNCTION public.gcc_v117_host_volunteers()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v jsonb;
BEGIN
 PERFORM public.gcc_v6_require_host();
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',t.id,'name',t.display_name,'school',s.name,'country',s.country_name,
  'school_level',s.school_level,'timezone',s.timezone,
  'email',t.email,'facilitator',t.volunteer_facilitator,'host',t.volunteer_host,
  'note',t.volunteer_note,'photo_path',t.photo_path,'updated_at',t.volunteer_updated_at)
 ORDER BY s.country_name,t.display_name),'[]'::jsonb) INTO v
 FROM public.teachers t JOIN public.schools s ON s.id=t.school_id
 WHERE t.is_active AND s.is_active AND (t.volunteer_host OR t.volunteer_facilitator);
 RETURN v;
END $fn$;
REVOKE ALL ON FUNCTION public.gcc_v117_host_volunteers() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v117_host_volunteers() TO authenticated;
COMMIT;
