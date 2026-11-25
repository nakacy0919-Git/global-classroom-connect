CREATE SCHEMA storage;
CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb);
CREATE FUNCTION storage.extension(path text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(path,'^.*\.','') $$;
CREATE TABLE public.gcc_v120_applications(id integer PRIMARY KEY,status text,school_website text,photo_path text);
INSERT INTO public.gcc_v120_applications VALUES (1,'draft',NULL,NULL),(2,'pending',NULL,'a.jpg'),(3,'pending','https://example.org','missing.jpg'),(4,'pending','https://example.org','valid.jpg'),(5,'approved',NULL,NULL),(6,'draft','https://example.org','valid.jpg');
INSERT INTO storage.objects VALUES('teacher-photos','valid.jpg','{"size":1500,"mimetype":"image/jpeg"}');

ALTER TABLE public.gcc_v120_applications
 ADD COLUMN user_id uuid UNIQUE,
 ADD COLUMN teacher_id uuid,
 ADD COLUMN teacher_name text,
 ADD COLUMN teacher_bio text,
 ADD COLUMN teacher_website text,
 ADD COLUMN school_name text,
 ADD COLUMN school_type text,
 ADD COLUMN school_level text,
 ADD COLUMN school_country text,
 ADD COLUMN school_country_code text,
 ADD COLUMN school_city text,
 ADD COLUMN school_region text,
 ADD COLUMN school_timezone text,
 ADD COLUMN submitted_at timestamptz,
 ADD COLUMN reviewed_at timestamptz,
 ADD COLUMN reviewed_by uuid,
 ADD COLUMN approved_teacher_id uuid;
UPDATE public.gcc_v120_applications SET status='rejected',user_id='10000000-0000-0000-0000-000000000004',teacher_name='Old profile',school_name='Old school',photo_path='old.jpg',reviewed_at=now() WHERE id=1;
-- Existing fixture users 1–3 are linked teachers. Create an unlinked confirmed applicant.
INSERT INTO auth.users(id,email_confirmed_at) VALUES('10000000-0000-0000-0000-000000000005',now());
UPDATE public.gcc_v120_applications SET user_id='10000000-0000-0000-0000-000000000005' WHERE id=1;
UPDATE public.gcc_v120_applications SET user_id='10000000-0000-0000-0000-000000000003' WHERE id=5;
INSERT INTO public.gcc_v120_applications(id,status) VALUES(7,'draft');
