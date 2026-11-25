-- Disposable database only. Compare deterministic digests of selected synthetic
-- data and access control; no raw rows, contact details, or tokens printed.
SELECT 'registrations|'||count(*)||'|'||md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY id),''))
 FROM public.gcc_session_signups t
UNION ALL SELECT 'requests|'||count(*)||'|'||md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY id),''))
 FROM public.session_join_requests t
UNION ALL SELECT 'outbox|'||count(*)||'|'||md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY request_id),''))
 FROM public.gcc_v219_request_email_jobs t
UNION ALL SELECT 'contacts|'||count(*)||'|'||md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY to_jsonb(t)::text),''))
 FROM public.gcc_v218_partner_contacts t
UNION ALL SELECT 'invitations|'||count(*)||'|'||md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY id),''))
 FROM gcc_roster_guard.invitations t
UNION ALL SELECT 'bot_receipts|'||count(*)||'|'||md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY receipt_hash),''))
 FROM gcc_roster_guard.bot_receipts t
UNION ALL SELECT 'event_windows|'||count(*)||'|'||md5(coalesce(string_agg(to_jsonb(t)::text,'|' ORDER BY event_id),''))
 FROM gcc_roster_guard.event_windows t
UNION ALL SELECT 'admission_policies|'||md5(
 (SELECT coalesce(string_agg(event_id::text,',' ORDER BY event_id),'') FROM gcc_roster_guard.invite_required)||'|'||
 (SELECT coalesce(string_agg(event_id::text,',' ORDER BY event_id),'') FROM gcc_roster_guard.verified_required)||'|'||
 (SELECT coalesce(string_agg(event_id::text,',' ORDER BY event_id),'') FROM gcc_roster_guard.bot_required))
UNION ALL SELECT 'private_grants|'||
 has_schema_privilege('anon','gcc_roster_guard','USAGE')::text||'|'||
 has_schema_privilege('authenticated','gcc_roster_guard','USAGE')::text||'|'||
 has_table_privilege('anon','public.gcc_session_signups','SELECT')::text||'|'||
 has_table_privilege('authenticated','public.gcc_session_signups','SELECT')::text||'|'||
 has_function_privilege('anon','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')::text||'|'||
 has_function_privilege('authenticated','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')::text||'|'||
 has_function_privilege('service_role','public.gcc_v239_issue_bot_receipt(uuid,text)','EXECUTE')::text
UNION ALL SELECT 'signup_triggers|'||count(*)||'|'||md5(coalesce(string_agg(pg_get_triggerdef(oid),'|' ORDER BY tgname),''))
 FROM pg_trigger WHERE tgrelid='public.gcc_session_signups'::regclass AND NOT tgisinternal
ORDER BY 1;
