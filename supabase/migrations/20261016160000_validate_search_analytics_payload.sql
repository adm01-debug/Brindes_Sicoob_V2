-- Impede que telemetria inválida contamine tendências e relatórios. Mantém a
-- compatibilidade expand/contract, mas normaliza o payload antes dos CHECKs.

UPDATE public.search_analytics
SET search_term = left(btrim(search_term), 500),
    results_count = greatest(results_count, 0),
    search_context = CASE
      WHEN search_context IS NULL THEN NULL
      WHEN search_context IS JSON OBJECT
        AND octet_length(search_context) <= 32768 THEN search_context
      ELSE NULL
    END;

CREATE OR REPLACE FUNCTION public.normalize_search_analytics_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
BEGIN
  IF v_actor IS NOT NULL THEN
    NEW.user_id := v_actor;
    NEW.seller_id := v_actor;
  END IF;

  NEW.search_term := left(btrim(NEW.search_term), 500);

  IF NEW.search_context IS NULL AND NEW.filters_used IS NOT NULL THEN
    NEW.search_context := NEW.filters_used::text;
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.normalize_search_analytics_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_search_analytics_insert() FROM anon;
REVOKE ALL ON FUNCTION public.normalize_search_analytics_insert() FROM authenticated;

ALTER TABLE public.search_analytics
  DROP CONSTRAINT IF EXISTS search_analytics_search_term_valid,
  DROP CONSTRAINT IF EXISTS search_analytics_results_count_nonnegative,
  DROP CONSTRAINT IF EXISTS search_analytics_search_context_valid;

ALTER TABLE public.search_analytics
  ADD CONSTRAINT search_analytics_search_term_valid
    CHECK (search_term = btrim(search_term) AND length(search_term) BETWEEN 1 AND 500)
    NOT VALID,
  ADD CONSTRAINT search_analytics_results_count_nonnegative
    CHECK (results_count >= 0)
    NOT VALID,
  ADD CONSTRAINT search_analytics_search_context_valid
    CHECK (
      search_context IS NULL OR (
        search_context IS JSON OBJECT
        AND octet_length(search_context) <= 32768
      )
    )
    NOT VALID;

ALTER TABLE public.search_analytics
  VALIDATE CONSTRAINT search_analytics_search_term_valid,
  VALIDATE CONSTRAINT search_analytics_results_count_nonnegative,
  VALIDATE CONSTRAINT search_analytics_search_context_valid;

DO $assert$
DECLARE
  v_table oid := 'public.search_analytics'::regclass;
BEGIN
  IF (
    SELECT count(*)
    FROM pg_catalog.pg_constraint
    WHERE conrelid = v_table
      AND contype = 'c'
      AND convalidated
      AND conname IN (
        'search_analytics_search_term_valid',
        'search_analytics_results_count_nonnegative',
        'search_analytics_search_context_valid'
      )
  ) <> 3 THEN
    RAISE EXCEPTION 'Contrato inválido: CHECKs de search_analytics ausentes ou não validados.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid = v_table
      AND tgname = 'trg_normalize_search_analytics_insert'
      AND NOT tgisinternal
      AND tgenabled = 'O'
      AND tgfoid = 'public.normalize_search_analytics_insert()'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: trigger normalizador de search_analytics divergiu.';
  END IF;
END
$assert$;

