-- Disposable CI extension to the V23.1 fixture; never run in production.
CREATE ROLE service_role NOLOGIN;
GRANT USAGE ON SCHEMA public TO service_role;
ALTER TABLE public.session_join_requests ADD COLUMN requesting_teacher_id uuid;
INSERT INTO auth.users(id,email,created_at,email_confirmed_at) VALUES
 ('10000000-0000-4000-8000-000000000003','third@example.invalid',now(),now());
INSERT INTO public.profiles(id,role) VALUES ('10000000-0000-4000-8000-000000000003','teacher');
INSERT INTO public.teachers(id,auth_user_id,display_name,school_id,is_active,created_at) VALUES
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','Third Teacher','30000000-0000-4000-8000-000000000001',true,now());
-- A past session to prove contact access expires.
INSERT INTO public.exchange_availability(id,teacher_id,starts_at,ends_at,status,session_details)
VALUES ('80000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002',now()-interval '20 days',now()-interval '19 days','closed','{}');
