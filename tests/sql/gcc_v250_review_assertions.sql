\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
 BEGIN UPDATE public.gcc_v120_applications SET status='pending' WHERE id=1;RAISE EXCEPTION 'unexpected missing website submit';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Provide a valid official%' THEN RAISE;END IF;END;
 BEGIN UPDATE public.gcc_v120_applications SET status='approved' WHERE id=2;RAISE EXCEPTION 'unexpected missing website approval';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Provide a valid official%' THEN RAISE;END IF;END;
 BEGIN UPDATE public.gcc_v120_applications SET status='approved' WHERE id=3;RAISE EXCEPTION 'unexpected missing photo approval';EXCEPTION WHEN OTHERS THEN IF SQLERRM NOT LIKE 'Applicant photograph is missing%' THEN RAISE;END IF;END;
 UPDATE public.gcc_v120_applications SET status='approved' WHERE id=4;
 UPDATE public.gcc_v120_applications SET status='rejected' WHERE id=2;
 UPDATE public.gcc_v120_applications SET status='pending' WHERE id=6;
 IF (SELECT status FROM public.gcc_v120_applications WHERE id=4)<>'approved' OR (SELECT status FROM public.gcc_v120_applications WHERE id=2)<>'rejected' OR (SELECT status FROM public.gcc_v120_applications WHERE id=5)<>'approved' OR (SELECT status FROM public.gcc_v120_applications WHERE id=6)<>'pending' THEN RAISE EXCEPTION 'valid transition or existing approval regression';END IF;
END $$;
ROLLBACK;
SELECT 'PASS V250: incomplete applications cannot be approved, valid applications and manual rejection remain available' AS result;
