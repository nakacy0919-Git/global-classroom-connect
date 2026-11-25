-- Executed only against disposable PostgreSQL after GCC V23.2 grant hardening.
DO $$
DECLARE
 name text; returns text; anon_grant boolean; authenticated_grant boolean;
BEGIN
 FOREACH name IN ARRAY ARRAY[
 'gcc_v203_enforce_event_deadline','gcc_v203_enforce_offer_deadline',
 'gcc_v203_require_open_offer_plan','gcc_v203_require_published_event_plan',
 'rls_auto_enable'
 ] LOOP
  SELECT has_function_privilege('anon',('public.'||name||'()')::regprocedure,'EXECUTE'),
         has_function_privilege('authenticated',('public.'||name||'()')::regprocedure,'EXECUTE')
  INTO anon_grant,authenticated_grant;
  IF anon_grant OR authenticated_grant THEN
   RAISE EXCEPTION 'Trigger function has unnecessary client EXECUTE: %',name;
  END IF;
 END LOOP;
END;
$$;
-- The event trigger was installed before GCC V23.2 hardening.
-- Verify its original and post-hardening execution still work.
CREATE TABLE public.gcc_v232_trigger_after_hardening (id integer);
INSERT INTO public.gcc_v232_trigger_probe VALUES(1);
DO $$
DECLARE n integer; e integer;
BEGIN
 SELECT count(*) INTO n FROM public.gcc_v232_trigger_audit
  WHERE function_name IN('event_deadline','offer_deadline','open_offer','published_event');
 IF n<>4 THEN RAISE EXCEPTION 'Expected 4 row trigger calls after revocation, found %',n; END IF;
 SELECT count(*) INTO e FROM public.gcc_v232_trigger_audit
  WHERE function_name='rls_event_trigger';
 IF e<>2 THEN RAISE EXCEPTION 'Expected event trigger both before and after revocation, found %',e; END IF;
END;
$$;
SELECT 'PASS: five public trigger grants revoked without disabling row or DDL triggers' AS result;
