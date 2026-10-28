-- Reconcilia as duas versões históricas de search_analytics sem apagar dados.
-- A migration antiga usava seller_id/filters_used; o contrato canônico usa
-- user_id/search_context. As colunas legadas permanecem temporariamente para
-- permitir rollout expand/contract sem quebrar consumidores ainda não migrados.

CREATE TABLE IF NOT EXISTS public.search_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  search_term text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  search_context text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_analytics
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS search_context text;

-- Copia dados legados apenas quando as respectivas colunas ainda existem.
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_analytics'
      AND column_name = 'seller_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.search_analytics
      SET user_id = seller_id
      WHERE user_id IS NULL
        AND seller_id IS NOT NULL
    $sql$;

    -- Novos clientes escrevem somente user_id. Manter o NOT NULL legado faria
    -- inserts canônicos falharem durante a janela expand/contract.
    ALTER TABLE public.search_analytics ALTER COLUMN seller_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'search_analytics'
      AND column_name = 'filters_used'
  ) THEN
    EXECUTE $sql$
      UPDATE public.search_analytics
      SET search_context = filters_used::text
      WHERE search_context IS NULL
        AND filters_used IS NOT NULL
    $sql$;
  END IF;
END
$migration$;

UPDATE public.search_analytics
SET results_count = 0
WHERE results_count IS NULL;

ALTER TABLE public.search_analytics
  ALTER COLUMN results_count SET DEFAULT 0,
  ALTER COLUMN results_count SET NOT NULL;

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Remove todas as variantes históricas antes de instalar o contrato único.
DROP POLICY IF EXISTS "Sellers can create their own searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Admins can view all searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Sellers can view their own searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Authenticated users can log searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Anyone can log searches" ON public.search_analytics;
DROP POLICY IF EXISTS "Managers and admins can read search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Users insert own search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Users read own search analytics" ON public.search_analytics;
DROP POLICY IF EXISTS "Managers read search analytics" ON public.search_analytics;

CREATE POLICY "Users insert own search analytics"
ON public.search_analytics
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

CREATE POLICY "Users read own search analytics"
ON public.search_analytics
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);

CREATE POLICY "Managers read search analytics"
ON public.search_analytics
FOR SELECT
TO authenticated
USING ((SELECT public.is_manager_or_admin()));

REVOKE ALL ON TABLE public.search_analytics FROM anon;
GRANT SELECT, INSERT ON TABLE public.search_analytics TO authenticated;
GRANT ALL ON TABLE public.search_analytics TO service_role;

-- Índices que correspondem aos filtros de igualdade e ao cursor
-- (created_at DESC, id DESC) usado pelo frontend e pelas Edge Functions.
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_id
  ON public.search_analytics (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_user_created_id
  ON public.search_analytics (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_search_analytics_zero_results_created_id
  ON public.search_analytics (created_at DESC, id DESC)
  WHERE results_count = 0;

CREATE INDEX IF NOT EXISTS idx_product_views_created_id
  ON public.product_views (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_product_views_seller_created_id
  ON public.product_views (seller_id, created_at DESC, id DESC);

COMMENT ON COLUMN public.search_analytics.user_id IS
  'Usuário autenticado que originou a busca; protegido por RLS contra atribuição a terceiros.';

COMMENT ON COLUMN public.search_analytics.search_context IS
  'Filtros da busca serializados em JSON textual pelo cliente.';
