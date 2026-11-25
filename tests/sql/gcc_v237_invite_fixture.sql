-- CI only. Extend V23.6 fixture; actual guard, stub original roster validation.
ALTER TABLE public.events ADD COLUMN status text NOT NULL DEFAULT 'published';
ALTER TABLE public.events ADD COLUMN starts_at timestamptz NOT NULL DEFAULT now()+interval '1 day';
INSERT INTO public.events(id) VALUES ('a2000000-0000-4000-8000-000000000001'),('a2000000-0000-4000-8000-000000000002');
CREATE FUNCTION public.gcc_v165_submit_roster(p_event_id uuid,p_teacher_name text,p_school_name text,p_country_code text,p_country_name text,p_students jsonb,p_facilitators jsonb,p_pairs jsonb)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path TO '' AS $$
 SELECT public.gcc_test_roster_write(p_event_id,NULL,p_pairs='[1]'::jsonb)
$$;
REVOKE ALL ON FUNCTION public.gcc_v165_submit_roster(uuid,text,text,text,text,jsonb,jsonb,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gcc_v165_submit_roster(uuid,text,text,text,text,jsonb,jsonb,jsonb) TO anon,authenticated;
