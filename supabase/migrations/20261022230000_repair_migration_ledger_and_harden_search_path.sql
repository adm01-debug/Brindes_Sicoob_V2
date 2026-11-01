-- Repair: registrar migration 20261022120000 no ledger do Supabase CLI
-- A migration foi aplicada ao banco via Management API (fora do CLI), portanto
-- nunca foi registrada em supabase_migrations.schema_migrations, causando drift.
-- statements contém o SHA-256 do conteúdo do arquivo local (hash raw, sem normalização),
-- no formato aceito pelo LEDGER_HASH_MARKER do check-migration-ledger-drift.mjs,
-- permitindo que o validador classifique o entry como 'alinhada' em vez de 'conteudo_nao_verificado'.
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
SELECT
  '20261022120000',
  'add_public_favorites_to_security_definer_allowlist',
  ARRAY['sha256:87bf1a8d5bb689f202a4ff77968c6f8820cfbfe5fffdff5d9c16c439a611bf54; executor:allowlisted-management-api']
WHERE NOT EXISTS (
  SELECT 1 FROM supabase_migrations.schema_migrations
  WHERE version = '20261022120000'
);

-- Idempotência: corrigir rows inseridas anteriormente sem statements
UPDATE supabase_migrations.schema_migrations
SET statements = ARRAY['sha256:87bf1a8d5bb689f202a4ff77968c6f8820cfbfe5fffdff5d9c16c439a611bf54; executor:allowlisted-management-api']
WHERE version = '20261022120000' AND statements IS NULL;

-- Hardening: adicionar pg_catalog ao search_path de e2e_cleanup_check_rate_limit
-- Inconsistência com get_public_favorite_list e get_public_favorite_reactions que
-- já usam SET search_path TO 'pg_catalog', 'public' — padrão de hardening do projeto.
-- Corpo da função preservado integralmente; única mudança é a linha search_path.
CREATE OR REPLACE FUNCTION public.e2e_cleanup_check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
RETURNS TABLE(allowed boolean, current_count integer, reset_in_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  INSERT INTO public.e2e_cleanup_rate_limit AS r (key, count, window_start, updated_at)
  VALUES (p_key, 1, v_now, v_now)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN 1
          ELSE r.count + 1
        END,
        window_start = CASE
          WHEN r.window_start < v_now - make_interval(secs => p_window_seconds) THEN v_now
          ELSE r.window_start
        END,
        updated_at = v_now
  RETURNING r.count, r.window_start INTO v_count, v_window_start;

  RETURN QUERY SELECT
    (v_count <= p_max) AS allowed,
    v_count AS current_count,
    GREATEST(0, p_window_seconds - EXTRACT(EPOCH FROM (v_now - v_window_start))::INT) AS reset_in_seconds;
END;
$$;
