-- 20260219_001_supabase_lint_fixes.sql
-- Purpose:
-- 1) Remove duplicate index/constraint on public.db_requisicoes when redundant.
-- 2) Fix mutable search_path on:
--    - public.set_webhook_events_updated_at(...)
--    - public.fc_touch_updated_at(...)
--
-- Notes:
-- - Idempotent by design.
-- - Keeps PRIMARY KEY intact.
-- - Uses pg_catalog, public as the minimum safe search_path.

-- Optional diagnostic query (before/after):
-- select schemaname, tablename, indexname, indexdef
-- from pg_indexes
-- where schemaname='public'
--   and tablename='db_requisicoes'
--   and indexname in ('db_requisicoes_pkey','ux_db_requisicoes_id');

DO $$
DECLARE
  idx_oid oid;
  idx_constraint_name text;
  idx_constraint_type "char";
BEGIN
  IF to_regclass('public.db_requisicoes') IS NULL THEN
    RAISE NOTICE 'Table public.db_requisicoes not found. Skipping duplicate index fix.';
    RETURN;
  END IF;

  SELECT c.oid
    INTO idx_oid
  FROM pg_class c
  JOIN pg_namespace n
    ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'ux_db_requisicoes_id'
    AND c.relkind = 'i'
  LIMIT 1;

  IF idx_oid IS NULL THEN
    RAISE NOTICE 'Index public.ux_db_requisicoes_id not found. Nothing to drop.';
    RETURN;
  END IF;

  SELECT conname, contype
    INTO idx_constraint_name, idx_constraint_type
  FROM pg_constraint
  WHERE conindid = idx_oid
    AND conrelid = 'public.db_requisicoes'::regclass
  LIMIT 1;

  IF idx_constraint_name IS NULL THEN
    EXECUTE 'DROP INDEX IF EXISTS public.ux_db_requisicoes_id';
    RAISE NOTICE 'Dropped index public.ux_db_requisicoes_id.';
  ELSIF idx_constraint_type = 'p' THEN
    RAISE NOTICE 'Index public.ux_db_requisicoes_id backs PRIMARY KEY constraint %, skipping.', idx_constraint_name;
  ELSE
    EXECUTE format(
      'ALTER TABLE public.db_requisicoes DROP CONSTRAINT IF EXISTS %I',
      idx_constraint_name
    );
    RAISE NOTICE 'Dropped constraint % backed by ux_db_requisicoes_id.', idx_constraint_name;
  END IF;
END $$;

DO $$
DECLARE
  fn regprocedure;
  fn_count integer := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_webhook_events_updated_at'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = pg_catalog, public',
      fn
    );
    fn_count := fn_count + 1;
  END LOOP;

  IF fn_count = 0 THEN
    RAISE NOTICE 'Function public.set_webhook_events_updated_at(...) not found. Skipping.';
  ELSE
    RAISE NOTICE 'Updated search_path for % function(s): set_webhook_events_updated_at.', fn_count;
  END IF;
END $$;

DO $$
DECLARE
  fn regprocedure;
  fn_count integer := 0;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fc_touch_updated_at'
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %s SET search_path = pg_catalog, public',
      fn
    );
    fn_count := fn_count + 1;
  END LOOP;

  IF fn_count = 0 THEN
    RAISE NOTICE 'Function public.fc_touch_updated_at(...) not found. Skipping.';
  ELSE
    RAISE NOTICE 'Updated search_path for % function(s): fc_touch_updated_at.', fn_count;
  END IF;
END $$;

-- Optional diagnostic query (after):
-- select n.nspname as schema_name,
--        p.proname as function_name,
--        pg_get_function_identity_arguments(p.oid) as args,
--        p.proconfig
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.proname in ('set_webhook_events_updated_at', 'fc_touch_updated_at');
