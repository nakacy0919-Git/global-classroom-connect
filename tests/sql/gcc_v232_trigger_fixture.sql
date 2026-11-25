-- Test-only implementations, with production function names and trigger attachment types.
-- These functions do NOT reproduce production business logic.
CREATE TABLE public.gcc_v232_trigger_audit (function_name text NOT NULL);
CREATE FUNCTION public.gcc_v203_enforce_event_deadline() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 INSERT INTO public.gcc_v232_trigger_audit VALUES('event_deadline');
 RETURN NEW;
END;
$fn$;
CREATE FUNCTION public.gcc_v203_enforce_offer_deadline() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 INSERT INTO public.gcc_v232_trigger_audit VALUES('offer_deadline');
 RETURN NEW;
END;
$fn$;
CREATE FUNCTION public.gcc_v203_require_open_offer_plan() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 INSERT INTO public.gcc_v232_trigger_audit VALUES('open_offer');
 RETURN NEW;
END;
$fn$;
CREATE FUNCTION public.gcc_v203_require_published_event_plan() RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 INSERT INTO public.gcc_v232_trigger_audit VALUES('published_event');
 RETURN NEW;
END;
$fn$;
CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO pg_catalog
AS $fn$
BEGIN
 INSERT INTO public.gcc_v232_trigger_audit VALUES('rls_event_trigger');
END;
$fn$;
CREATE EVENT TRIGGER ensure_rls
 ON ddl_command_end WHEN TAG IN ('CREATE TABLE')
 EXECUTE FUNCTION public.rls_auto_enable();

CREATE TABLE public.gcc_v232_trigger_probe (id integer);
CREATE TRIGGER gcc_test_event_deadline
 BEFORE INSERT ON public.gcc_v232_trigger_probe
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_enforce_event_deadline();
CREATE TRIGGER gcc_test_offer_deadline
 BEFORE INSERT ON public.gcc_v232_trigger_probe
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_enforce_offer_deadline();
CREATE TRIGGER gcc_test_open_offer
 BEFORE INSERT ON public.gcc_v232_trigger_probe
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_require_open_offer_plan();
CREATE TRIGGER gcc_test_published_event
 BEFORE INSERT ON public.gcc_v232_trigger_probe
 FOR EACH ROW EXECUTE FUNCTION public.gcc_v203_require_published_event_plan();
