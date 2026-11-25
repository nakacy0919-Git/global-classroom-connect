CREATE SCHEMA storage;
CREATE TABLE storage.objects(bucket_id text,name text,metadata jsonb);
CREATE FUNCTION storage.extension(path text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT regexp_replace(path,'^.*\.','') $$;
CREATE TABLE public.gcc_v120_applications(id integer PRIMARY KEY,status text,school_website text,photo_path text);
INSERT INTO public.gcc_v120_applications VALUES (1,'draft',NULL,NULL),(2,'pending',NULL,'a.jpg'),(3,'pending','https://example.org','missing.jpg'),(4,'pending','https://example.org','valid.jpg'),(5,'approved',NULL,NULL),(6,'draft','https://example.org','valid.jpg');
INSERT INTO storage.objects VALUES('teacher-photos','valid.jpg','{"size":1500,"mimetype":"image/jpeg"}');
