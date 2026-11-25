-- GCC V23.2: revoke unnecessary direct EXECUTE from trigger-only functions.
-- STAGED ONLY. DO NOT RUN ON PRODUCTION until verified in an isolated Supabase project.
-- This changes function EXECUTE privileges; it DOES NOT remove/disable any trigger.
BEGIN;

DO $verify$
DECLARE
 function_name text;
 return_type text;
 used_by_trigger boolean;
BEGIN
 FOREACH function_name IN ARRAY ARRAY[
  'gcc_v203_enforce_event_deadline',
  'gcc_v203_enforce_offer_deadline',
  'gcc_v203_require_open_offer_plan',
  'gcc_v203_require_published_event_plan',
  'rls_auto_enable'
 ] LOOP
  SELECT p.prorettype::regtype::text INTO return_type
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname=function_name
   AND p.pronargs=0;
  IF return_type IS NULL OR
     (function_name='rls_auto_enable' AND return_type<>'event_trigger') OR
     (function_name<>'rls_auto_enable' AND return_type<>'trigger')
  THEN
   RAISE EXCEPTION 'Unexpected trigger function signature: %',function_name;
  END IF;
  IF function_name='rls_auto_enable' THEN
   SELECT EXISTS(
    SELECT 1 FROM pg_event_trigger et
    WHERE et.evtfoid=('public.'||function_name||'()')::regprocedure
   ) INTO used_by_trigger;
  ELSE
   SELECT EXISTS(
    SELECT 1 FROM pg_trigger tr
    WHERE tr.tgfoid=('public.'||function_name||'()')::regprocedure
     AND NOT tr.tgisinternal
   ) INTO used_by_trigger;
  END IF;
  IF NOT used_by_trigger THEN
   RAISE EXCEPTION 'Refusing to alter privileges for a function without an attached trigger: %',function_name;
  END IF;
 END LOOP;
END
$verify$;

-- PostgreSQL fires existing triggers independently of client EXECUTE grants.
-- Public RPC callers have no reason to execute a trigger function directly.
REVOKE EXECUTE ON FUNCTION public.gcc_v203_enforce_event_deadline()
 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gcc_v203_enforce_offer_deadline()
 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gcc_v203_require_open_offer_plan()
 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gcc_v203_require_published_event_plan()
 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
 FROM PUBLIC, anon, authenticated;
COMMIT;
