-- CI-only independent HTTP matrix, using disposable schema and synthetic identities.
INSERT INTO public.events(id) VALUES
 ('a5000000-0000-4000-8000-000000000001'),
 ('a5000000-0000-4000-8000-000000000002'),
 ('a5000000-0000-4000-8000-000000000003'),
 ('a5000000-0000-4000-8000-000000000004'),
 ('a5000000-0000-4000-8000-000000000005'),
 ('a5000000-0000-4000-8000-000000000006');
INSERT INTO gcc_roster_guard.bot_required VALUES
 ('a5000000-0000-4000-8000-000000000002'),
 ('a5000000-0000-4000-8000-000000000005'),
 ('a5000000-0000-4000-8000-000000000006');
INSERT INTO gcc_roster_guard.invite_required VALUES
 ('a5000000-0000-4000-8000-000000000003'),
 ('a5000000-0000-4000-8000-000000000005');
INSERT INTO gcc_roster_guard.verified_required VALUES
 ('a5000000-0000-4000-8000-000000000004'),
 ('a5000000-0000-4000-8000-000000000005');
INSERT INTO gcc_roster_guard.invitations(event_id,token_hash,expires_at) VALUES
 ('a5000000-0000-4000-8000-000000000003',encode(sha256(convert_to(repeat('d',64),'UTF8')),'hex'),now()+interval '1 hour'),
 ('a5000000-0000-4000-8000-000000000005',encode(sha256(convert_to(repeat('e',64),'UTF8')),'hex'),now()+interval '1 hour');
INSERT INTO gcc_roster_guard.event_limits VALUES ('a5000000-0000-4000-8000-000000000006',1);
