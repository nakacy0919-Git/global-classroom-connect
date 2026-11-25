-- CI only; extend existing synthetic schema to execute actual registration bodies.
ALTER TABLE public.events ADD COLUMN session_details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.gcc_session_signups ADD COLUMN facilitators jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE TABLE public.gcc_session_codes(id uuid PRIMARY KEY,code_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz);
CREATE TABLE public.gcc_v6_country_codes(code text PRIMARY KEY);
CREATE TABLE public.gcc_session_settings(event_id uuid PRIMARY KEY REFERENCES public.events(id),max_students integer NOT NULL);
CREATE TABLE public.gcc_session_signup_students(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),signup_id uuid NOT NULL REFERENCES public.gcc_session_signups(id),display_name text NOT NULL,grade text NOT NULL DEFAULT '',sort_order integer NOT NULL,UNIQUE(signup_id,sort_order));
CREATE TABLE public.gcc_v91_room_drafts(event_id uuid);
CREATE TABLE public.gcc_v165_pair_requests(signup_id uuid NOT NULL REFERENCES public.gcc_session_signups(id),student_a uuid NOT NULL REFERENCES public.gcc_session_signup_students(id),student_b uuid NOT NULL REFERENCES public.gcc_session_signup_students(id),target_room integer NOT NULL, CHECK(student_a<>student_b));
ALTER TABLE public.gcc_session_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_session_signup_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcc_v165_pair_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcc_session_codes,public.gcc_session_signup_students,public.gcc_v165_pair_requests FROM PUBLIC,anon,authenticated;
INSERT INTO public.gcc_v6_country_codes VALUES('JP'),('PH');
INSERT INTO public.events(id) VALUES
 ('a6000000-0000-4000-8000-000000000001'),('a6000000-0000-4000-8000-000000000002'),
 ('a6000000-0000-4000-8000-000000000003'),('a6000000-0000-4000-8000-000000000004'),
 ('a6000000-0000-4000-8000-000000000005');
UPDATE public.events SET session_details=jsonb_build_object('registration_closes_at',now()-interval '1 hour') WHERE id='a6000000-0000-4000-8000-000000000004';
INSERT INTO public.gcc_session_settings VALUES
 ('a6000000-0000-4000-8000-000000000001',2),('a6000000-0000-4000-8000-000000000002',1),
 ('a6000000-0000-4000-8000-000000000003',2),('a6000000-0000-4000-8000-000000000004',10),
 ('a6000000-0000-4000-8000-000000000005',10);
INSERT INTO public.gcc_session_codes VALUES
 ('b6000000-0000-4000-8000-000000000001',encode(sha256(convert_to(repeat('a',32),'UTF8')),'hex'),now()+interval '1 hour',NULL),
 ('b6000000-0000-4000-8000-000000000002',encode(sha256(convert_to(repeat('b',32),'UTF8')),'hex'),now()+interval '1 hour',NULL),
 ('b6000000-0000-4000-8000-000000000003',encode(sha256(convert_to(repeat('c',32),'UTF8')),'hex'),now()+interval '1 hour',now());
INSERT INTO gcc_roster_guard.bot_required VALUES ('a6000000-0000-4000-8000-000000000003');
INSERT INTO gcc_roster_guard.invite_required VALUES ('a6000000-0000-4000-8000-000000000003');
INSERT INTO gcc_roster_guard.verified_required VALUES ('a6000000-0000-4000-8000-000000000003');
INSERT INTO gcc_roster_guard.invitations(event_id,token_hash,expires_at)
 VALUES ('a6000000-0000-4000-8000-000000000003',encode(sha256(convert_to(repeat('f',64),'UTF8')),'hex'),now()+interval '1 hour');
INSERT INTO gcc_roster_guard.bot_receipts(event_id,receipt_hash,challenge_hash,expires_at)
 VALUES ('a6000000-0000-4000-8000-000000000003',encode(sha256(convert_to(repeat('9',64),'UTF8')),'hex'),repeat('8',64),now()+interval '1 hour');
