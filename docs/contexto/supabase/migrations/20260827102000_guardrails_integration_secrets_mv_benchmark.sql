-- Guardrails aditivos para ambientes com drift já existente.
-- Não altera histórico remoto já aplicado e não usa DROP.
-- Sem transação explícita nem refresh concorrente: o aplicador executa o lote
-- numa única transação atômica e rejeita esses padrões no preflight (parseTarget).

DO $$
DECLARE
  v_duplicates text;
  v_has_unique_index boolean;
BEGIN
  IF to_regclass('public.integration_secrets') IS NULL THEN
    RETURN;
  END IF;

  -- Verifica unicidade REAL no catálogo (qualquer índice único válido na coluna
  -- chave), não apenas a existência do nome ux_integration_secrets_chave.
  SELECT EXISTS (
    SELECT 1
    FROM pg_index i
    JOIN pg_class c      ON c.oid = i.indrelid
    JOIN pg_namespace n  ON n.oid = c.relnamespace
    JOIN pg_attribute a  ON a.attrelid = c.oid
                       AND a.attnum = ANY (i.indkey)
    WHERE n.nspname = 'public'
      AND c.relname = 'integration_secrets'
      AND i.indisunique
      AND i.indisvalid
      AND NOT i.indisprimary
      AND a.attname = 'chave'
  ) INTO v_has_unique_index;

  IF NOT v_has_unique_index THEN
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

    CREATE UNIQUE INDEX ux_integration_secrets_chave
      ON public.integration_secrets (chave)
      WHERE chave IS NOT NULL AND btrim(chave) <> '';
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
    REFRESH MATERIALIZED VIEW public.mv_benchmark_setorial;
  EXCEPTION
    WHEN feature_not_supported THEN
      NULL;
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
