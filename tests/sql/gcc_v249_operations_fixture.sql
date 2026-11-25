\set ON_ERROR_STOP on
-- Extend disposable V24.8 fixture only; production review RPC already exists.
ALTER TABLE public.session_join_requests ADD COLUMN reviewed_by uuid, ADD COLUMN reviewed_at timestamptz;
CREATE FUNCTION public.gcc_teacher_review_request(p_request_id uuid,p_decision text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.session_join_requests r SET status=p_decision,reviewed_by=auth.uid(),reviewed_at=now()
 FROM public.exchange_availability a WHERE r.id=p_request_id AND r.offer_id=a.id AND a.teacher_id=public.gcc_current_teacher_id() AND r.status='pending' AND p_decision IN ('approved','declined');
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid review';END IF;RETURN true;
END $$;
-- Additional approved class: outsider in V24.8 becomes a pending class in V24.9.
INSERT INTO public.session_join_requests(id,offer_id,requesting_teacher_id,status,requested_students,reconfirmation_required,created_at) VALUES
 ('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','pending',2,false,now());
UPDATE public.exchange_availability SET session_details=jsonb_set(session_details,'{max_participants}','6') WHERE id='30000000-0000-0000-0000-000000000001';

CREATE TABLE public.gcc_teacher_notifications_v212(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),teacher_id uuid NOT NULL,offer_id uuid,request_id uuid,category text NOT NULL,title text NOT NULL,body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz);
