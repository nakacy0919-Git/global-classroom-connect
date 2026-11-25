\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
 BEGIN UPDATE public.gcc_v120_applications SET status='pending' WHERE id=7;RAISE EXCEPTION 'unexpected missing website submit';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Provide a valid official%' THEN RAISE;END IF;END;
 BEGIN UPDATE public.gcc_v120_applications SET status='approved' WHERE id=2;RAISE EXCEPTION 'unexpected missing website approval';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Provide a valid official%' THEN RAISE;END IF;END;
 BEGIN UPDATE public.gcc_v120_applications SET status='approved' WHERE id=3;RAISE EXCEPTION 'unexpected missing photo approval';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Applicant photograph is missing%' THEN RAISE;END IF;END;
 UPDATE public.gcc_v120_applications SET status='approved' WHERE id=4;
 UPDATE public.gcc_v120_applications SET status='rejected' WHERE id=2;
 UPDATE public.gcc_v120_applications SET status='pending' WHERE id=6;
 IF (SELECT status FROM public.gcc_v120_applications WHERE id=4)<>'approved' OR (SELECT status FROM public.gcc_v120_applications WHERE id=2)<>'rejected' OR (SELECT status FROM public.gcc_v120_applications WHERE id=5)<>'approved' OR (SELECT status FROM public.gcc_v120_applications WHERE id=6)<>'pending' THEN RAISE EXCEPTION 'valid transition or existing approval regression';END IF;
END $$;
DO $$ BEGIN IF has_function_privilege('anon','public.gcc_v250_restart_application()','EXECUTE') THEN RAISE EXCEPTION 'anonymous restart privilege';END IF;END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
DO $$ BEGIN
 BEGIN PERFORM public.gcc_v250_restart_application();RAISE EXCEPTION 'unexpected approved restart';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Only your own rejected%' THEN RAISE;END IF;END;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000005',true);
DO $$ BEGIN
 IF public.gcc_v250_restart_application()->>'status'<>'draft' THEN RAISE EXCEPTION 'restart failed';END IF;
 BEGIN PERFORM public.gcc_v250_restart_application();RAISE EXCEPTION 'unexpected second restart';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Only your own rejected%' THEN RAISE;END IF;END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.gcc_v120_applications WHERE id=1 AND user_id='10000000-0000-0000-0000-000000000005' AND status='draft' AND photo_path IS NULL AND school_name IS NULL AND teacher_name IS NULL AND reviewed_at IS NULL) THEN RAISE EXCEPTION 'restart profile not cleared';END IF;
 IF (SELECT status FROM public.gcc_v120_applications WHERE id=5)<>'approved' THEN RAISE EXCEPTION 'approved changed';END IF;
END $$;
ROLLBACK;
SELECT 'PASS V250: incomplete applications cannot be approved, valid applications and manual rejection remain available' AS result;
