-- GCC V22.7: targeted hardening for a single immutable name validator.
-- STAGING ONLY. Review on a separate test database before executing anywhere.
-- Existing function body, arguments, grants and behavior are retained.
BEGIN;
ALTER FUNCTION public.gcc_v7_english_name(text) SET search_path TO pg_catalog;
COMMIT;
