-- Garante que cada usuário tenha no máximo um kit fixado e que a troca de
-- destaque seja uma única operação transacional no servidor.

WITH ranked_pins AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id
      ORDER BY last_used_at DESC NULLS LAST, updated_at DESC, created_at DESC, id DESC
    ) AS pin_rank
  FROM public.custom_kits
  WHERE is_pinned
)
UPDATE public.custom_kits AS kit
SET is_pinned = false,
    updated_at = now()
FROM ranked_pins AS ranked
WHERE kit.id = ranked.id
  AND ranked.pin_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_kits_one_pinned_per_user
  ON public.custom_kits (user_id)
  WHERE is_pinned;

CREATE OR REPLACE FUNCTION public.set_custom_kit_pinned(
  p_kit_id uuid,
  p_pinned boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória.' USING ERRCODE = '42501';
  END IF;

  -- Serializa as mudanças do mesmo usuário, inclusive quando duas abas tentam
  -- fixar kits diferentes ao mesmo tempo.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::text, 20261016193000));

  SELECT user_id
  INTO v_owner
  FROM public.custom_kits
  WHERE id = p_kit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kit não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_owner IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Kit fora do escopo do usuário.' USING ERRCODE = '42501';
  END IF;

  IF p_pinned THEN
    UPDATE public.custom_kits
    SET is_pinned = false,
        updated_at = now()
    WHERE user_id = v_actor
      AND is_pinned
      AND id <> p_kit_id;
  END IF;

  UPDATE public.custom_kits
  SET is_pinned = p_pinned,
      updated_at = now()
  WHERE id = p_kit_id
    AND user_id = v_actor;

  RETURN p_pinned;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_custom_kit_pinned(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_custom_kit_pinned(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.set_custom_kit_pinned(uuid, boolean) IS
'Fixa ou desafixa um kit do usuário autenticado, serializando trocas para manter no máximo um destaque.';

DO $contract$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_index AS index_definition
    JOIN pg_class AS index_class ON index_class.oid = index_definition.indexrelid
    WHERE index_definition.indrelid = 'public.custom_kits'::regclass
      AND index_class.relname = 'idx_custom_kits_one_pinned_per_user'
      AND index_definition.indisunique
      AND index_definition.indisvalid
      AND pg_get_expr(index_definition.indpred, index_definition.indrelid) = 'is_pinned'
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: unicidade do kit fixado não foi criada.';
  END IF;

  IF NOT COALESCE((
    SELECT procedure_definition.prosecdef
      AND procedure_definition.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
      AND procedure_definition.prosrc LIKE '%pg_advisory_xact_lock%'
      AND procedure_definition.prosrc LIKE '%v_owner IS DISTINCT FROM v_actor%'
    FROM pg_proc AS procedure_definition
    WHERE procedure_definition.oid = to_regprocedure('public.set_custom_kit_pinned(uuid,boolean)')
  ), false) THEN
    RAISE EXCEPTION 'Contrato inválido: RPC atômica de destaque não está protegida.';
  END IF;

  IF NOT has_function_privilege(
      'authenticated', 'public.set_custom_kit_pinned(uuid,boolean)', 'EXECUTE'
    )
    OR has_function_privilege('anon', 'public.set_custom_kit_pinned(uuid,boolean)', 'EXECUTE')
    OR has_function_privilege('public', 'public.set_custom_kit_pinned(uuid,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Contrato inválido: ACL da RPC de destaque está divergente.';
  END IF;
END;
$contract$;
