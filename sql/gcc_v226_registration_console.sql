-- GCC V22.6: read-only global registration console, staged migration.
-- Do not run this migration until the independent preview and review are approved.
-- All account data remains host-only; no table policy, role, or registration is changed.
BEGIN;

CREATE OR REPLACE FUNCTION public.gcc_v226_registration_console(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 10,
  p_status text DEFAULT '',
  p_country text DEFAULT '',
  p_search text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  page_number integer := LEAST(GREATEST(COALESCE(p_page, 1), 1), 100000);
  page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 10), 1), 50);
  requested_status text := COALESCE(p_status, '');
  requested_country text := UPPER(COALESCE(p_country, ''));
  search_term text := LOWER(LEFT(BTRIM(COALESCE(p_search, '')), 120));
  result jsonb;
BEGIN
  -- Must check authorization INSIDE the SECURITY DEFINER function; client routing is insufficient.
  PERFORM public.gcc_v6_require_host();
  IF requested_status NOT IN ('','email_unconfirmed','profile_incomplete','pending','approved','rejected')
    THEN RAISE EXCEPTION 'Unsupported registration filter'; END IF;
  IF requested_country <> '' AND requested_country <> '__UNKNOWN'
    AND requested_country !~ '^[A-Z]{2}$'
    THEN RAISE EXCEPTION 'Unsupported country filter'; END IF;

  WITH accounts AS MATERIALIZED (
    SELECT
      u.id AS account_id, u.email, u.created_at,
      COALESCE(NULLIF(a.teacher_name,''), NULLIF(t.display_name,''), '') AS name,
      COALESCE(NULLIF(a.school_name,''), NULLIF(s.name,''), '') AS school,
      COALESCE(NULLIF(a.school_country_code,''), NULLIF(s.country_code,''), '') AS country_code,
      COALESCE(NULLIF(a.school_country,''), NULLIF(s.country_name,''), '') AS country,
      CASE
        WHEN a.status IN ('approved','rejected','pending') THEN a.status
        WHEN t.id IS NOT NULL THEN 'approved'
        WHEN u.email_confirmed_at IS NULL THEN 'email_unconfirmed'
        ELSE 'profile_incomplete'
      END AS status
    FROM auth.users u
    LEFT JOIN public.gcc_v120_applications a ON a.user_id = u.id
    LEFT JOIN LATERAL (
      SELECT t0.id,t0.display_name,t0.school_id
      FROM public.teachers t0
      WHERE t0.auth_user_id=u.id AND t0.is_active IS TRUE
      ORDER BY t0.created_at DESC,t0.id
      LIMIT 1
    ) t ON TRUE
    LEFT JOIN public.schools s ON s.id = t.school_id
  ),
  filtered AS MATERIALIZED (
    SELECT *
    FROM accounts a
    WHERE (requested_status='' OR a.status=requested_status)
      AND (requested_country='' OR
           (requested_country='__UNKNOWN' AND a.country_code='') OR
           a.country_code=requested_country)
      AND (search_term='' OR
           STRPOS(LOWER(CONCAT_WS(' ',a.name,a.email,a.school,a.country)),search_term)>0)
  ),
  country_groups AS (
    SELECT country_code,MAX(country) AS country_name,
           COUNT(*)::integer AS total,
           COUNT(*) FILTER (WHERE status='pending')::integer AS pending,
           COUNT(*) FILTER (WHERE status='approved')::integer AS approved
    FROM accounts GROUP BY country_code
  )
  SELECT jsonb_build_object(
    'stats', (SELECT jsonb_build_object(
      'total', COUNT(*),
      'email_unconfirmed', COUNT(*) FILTER (WHERE status='email_unconfirmed'),
      'profile_incomplete', COUNT(*) FILTER (WHERE status='profile_incomplete'),
      'pending', COUNT(*) FILTER (WHERE status='pending'),
      'approved', COUNT(*) FILTER (WHERE status='approved'),
      'rejected', COUNT(*) FILTER (WHERE status='rejected')
    ) FROM accounts),
    'countries', COALESCE((SELECT jsonb_agg(
      jsonb_build_object(
        'code', country_code,
        'name', COALESCE(NULLIF(country_name,''),'Not provided'),
        'total',total,'pending',pending,'approved',approved
      ) ORDER BY total DESC,country_name
    ) FROM country_groups),'[]'::jsonb),
    'total_matches',(SELECT COUNT(*) FROM filtered),
    'page',page_number,
    'page_size',page_size,
    'items',COALESCE((SELECT jsonb_agg(
      jsonb_build_object(
        'id', account_id, 'email',email, 'created_at',created_at,
        'name',name, 'school',school, 'country',country,
        'country_code',country_code, 'status',status
      ) ORDER BY created_at DESC,account_id DESC
    ) FROM (
      SELECT * FROM filtered
      ORDER BY created_at DESC, account_id DESC
      LIMIT page_size OFFSET ((page_number - 1) * page_size)
    ) page_rows),'[]'::jsonb)
  ) INTO result;
  RETURN result;
END;
$fn$;

REVOKE ALL ON FUNCTION public.gcc_v226_registration_console(integer,integer,text,text,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.gcc_v226_registration_console(integer,integer,text,text,text)
  TO authenticated;
COMMIT;
