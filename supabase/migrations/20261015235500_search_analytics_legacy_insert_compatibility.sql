-- Mantém, durante o rollout expand/contract, a escrita de bundles que ainda
-- enviam seller_id/filters_used. A identidade confiável continua sendo
-- exclusivamente auth.uid(); valores de autoria fornecidos pelo cliente são
-- sobrescritos antes da avaliação da policy WITH CHECK.

ALTER TABLE public.search_analytics
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS filters_used jsonb;

ALTER TABLE public.search_analytics
  ALTER COLUMN seller_id DROP NOT NULL;

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
    -- Nunca confia na autoria enviada pelo navegador, canônica ou legada.
    NEW.user_id := v_actor;
    NEW.seller_id := v_actor;
  END IF;

  IF NEW.search_context IS NULL AND NEW.filters_used IS NOT NULL THEN
    NEW.search_context := NEW.filters_used::text;
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.normalize_search_analytics_insert() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.normalize_search_analytics_insert() FROM anon;
REVOKE ALL ON FUNCTION public.normalize_search_analytics_insert() FROM authenticated;

DROP TRIGGER IF EXISTS trg_normalize_search_analytics_insert
  ON public.search_analytics;

CREATE TRIGGER trg_normalize_search_analytics_insert
BEFORE INSERT ON public.search_analytics
FOR EACH ROW
EXECUTE FUNCTION public.normalize_search_analytics_insert();

COMMENT ON FUNCTION public.normalize_search_analytics_insert() IS
  'Compatibilidade transitória: converte inserts legados para user_id/search_context usando auth.uid() como única autoria confiável.';

COMMENT ON COLUMN public.search_analytics.seller_id IS
  'Campo legado mantido temporariamente; em inserts autenticados é normalizado para auth.uid().';

COMMENT ON COLUMN public.search_analytics.filters_used IS
  'Campo legado mantido temporariamente; seu JSON é copiado para search_context quando o campo canônico não é enviado.';

-- Falha a própria migration se o contrato de segurança esperado não existir.
DO $assert$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class
    WHERE oid = 'public.search_analytics'::regclass
      AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: RLS está desabilitada em search_analytics.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy
    WHERE polrelid = 'public.search_analytics'::regclass
      AND polname = 'Users insert own search analytics'
      AND polcmd = 'a'
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: policy canônica de INSERT não existe.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.search_analytics'::regclass
      AND tgname = 'trg_normalize_search_analytics_insert'
      AND NOT tgisinternal
      AND tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: trigger de compatibilidade não está ativo.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc
    WHERE oid = 'public.normalize_search_analytics_insert()'::regprocedure
      AND NOT prosecdef
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: normalizador deve executar como SECURITY INVOKER.';
  END IF;
END
$assert$;
