BEGIN;

-- Guardrails aditivos para ambientes com drift já existente.
-- Não altera histórico remoto já aplicado e não usa DROP.

DO $$
DECLARE
  v_duplicates text;
BEGIN
  IF to_regclass('public.integration_secrets') IS NULL THEN
    RETURN;
  END IF;

  -- Só valida duplicidade quando o índice único ainda não existe. Em produção
  -- canônica o índice já deve ter sido criado pela migration anterior.
  IF to_regclass('public.ux_integration_secrets_chave') IS NULL THEN
    SELECT string_agg(chave, ', ' ORDER BY chave)
    INTO v_duplicates
    FROM (
      SELECT chave
      FROM public.integration_secrets
      WHERE chave IS NOT NULL
        AND btrim(chave) <> ''
      GROUP BY chave
      HAVING count(*) > 1
      ORDER BY chave
      LIMIT 20
    ) dup;

    IF v_duplicates IS NOT NULL THEN
      RAISE EXCEPTION
        'integration_secrets possui chaves duplicadas e exige saneamento manual antes de qualquer reaplicação estrutural: %',
        v_duplicates
        USING ERRCODE = '23505';
    END IF;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.refresh_mv_benchmark_setorial()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF to_regclass('public.mv_benchmark_setorial') IS NULL THEN
    RETURN;
  END IF;

  BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_benchmark_setorial;
  EXCEPTION
    WHEN feature_not_supported THEN
      REFRESH MATERIALIZED VIEW public.mv_benchmark_setorial;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_mv_benchmark_setorial() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_mv_benchmark_setorial() TO service_role;

DO $$
DECLARE
  v_populated boolean;
BEGIN
  IF to_regclass('public.mv_benchmark_setorial') IS NULL THEN
    RETURN;
  END IF;

  SELECT c.relispopulated
  INTO v_populated
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'mv_benchmark_setorial'
    AND c.relkind = 'm';

  IF COALESCE(v_populated, false) = false THEN
    PERFORM public.refresh_mv_benchmark_setorial();
  END IF;
END
$$;

COMMIT;
