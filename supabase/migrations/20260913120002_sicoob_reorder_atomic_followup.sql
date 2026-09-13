-- Follow-up de 20260912170000_sicoob_reorder_atomic.sql
--
-- Complementa uma migration já mesclada em main (pode já ter rodado em
-- produção) sem editá-la — ver docs/correcoes-validacao-2026-09-13.md.


ALTER TABLE public.quote_item_personalizations
  ADD COLUMN IF NOT EXISTS catalog_checked_at timestamptz;


CREATE OR REPLACE FUNCTION public.get_sicoob_reorder_idempotency(
  p_actor_id uuid,
  p_order_id uuid,
  p_idempotency_key text,
  p_request_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.sicoob_reorder_requests%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de recompra inválida.';
  END IF;
  SELECT * INTO v_existing
    FROM public.sicoob_reorder_requests
   WHERE actor_id = p_actor_id
     AND source_order_id = p_order_id
     AND idempotency_key = trim(p_idempotency_key);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;
  RETURN v_existing.quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_sicoob_reorder_idempotency(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sicoob_reorder_idempotency(uuid, uuid, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.reorder_sicoob_order_as_quote(
  p_order_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_actor_id uuid,
  p_request_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := p_actor_id;
  v_order public.sicoob_orders%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_reorder_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_source_item public.sicoob_order_items%ROWTYPE;
  v_payload_hash text;
  v_quote_id uuid;
  v_quote_item_id uuid;
  v_sort_order integer := 0;
  v_total numeric(14,2) := 0;
  v_checked_at timestamptz;
  v_pa_name text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para refazer o pedido.';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de recompra inválida.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve conter entre 1 e 100 itens.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido de origem não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente pedidos concluídos podem ser refeitos.';
  END IF;

  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.sicoob_order_items WHERE order_id = v_order.id
     )
     OR jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(DISTINCT item ->> 'source_order_item_id')::integer
         FROM jsonb_array_elements(p_items) AS source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve representar cada item do pedido uma única vez.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = v_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  IF v_order.created_by IS DISTINCT FROM v_actor_id
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND ur.role::text IN ('admin', 'dev', 'supervisor')
     )
     AND NOT (
       v_profile.pa_id IS NOT NULL
       AND v_profile.pa_id = v_order.pa_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('gerente_pa', 'comprador_pac', 'gestor_compras')
       )
     )
     AND NOT (
       v_profile.cooperativa_id IS NOT NULL
       AND v_profile.cooperativa_id = v_order.cooperative_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('comprador_singular', 'gestor_compras')
       )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode refazer este pedido.';
  END IF;

  v_payload_hash := p_request_hash;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_actor_id::text || ':' || p_order_id::text || ':' || trim(p_idempotency_key), 0)
  );

  SELECT * INTO v_existing
    FROM public.sicoob_reorder_requests
   WHERE actor_id = v_actor_id
     AND source_order_id = p_order_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    RETURN v_existing.quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item ->> 'source_order_item_id', '') IS NULL
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item de recompra inválido.';
    END IF;

    SELECT * INTO v_source_item
      FROM public.sicoob_order_items
     WHERE id = (v_item ->> 'source_order_item_id')::uuid
       AND order_id = v_order.id;
    IF NOT FOUND
       OR v_source_item.product_id::text IS DISTINCT FROM (v_item ->> 'product_id')
       OR v_source_item.quantity IS DISTINCT FROM (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O item não corresponde ao pedido de origem.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;

    IF COALESCE((v_item ->> 'minimum_quantity')::integer, 1) > (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
    END IF;

    IF NULLIF(v_source_item.variant_id, '') IS NOT NULL
       AND v_source_item.variant_id IS DISTINCT FROM NULLIF(v_item ->> 'source_variant_id', '') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A variante não corresponde ao pedido de origem.';
    END IF;

    v_total := v_total + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
    IF jsonb_typeof(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
    END IF;
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      IF NULLIF(v_personalization ->> 'technique_id', '') IS NULL
         OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
         OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
         OR (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (v_item ->> 'quantity')::integer
         OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
         OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
         OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
      END IF;
      v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
      IF v_checked_at IS NULL
         OR v_checked_at < now() - interval '5 minutes'
         OR v_checked_at > now() + interval '1 minute' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
      END IF;
      v_total := v_total + (v_personalization ->> 'total_cost')::numeric;
    END LOOP;
  END LOOP;

  SELECT nome INTO v_pa_name
    FROM public.postos_atendimento
   WHERE id = v_order.pa_id;

  PERFORM set_config('app.sicoob_reorder_operation', 'create', true);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    COALESCE(v_pa_name, 'Unidade Sicoob'),
    v_actor_id,
    'draft',
    v_total,
    v_total,
    format('Recompra do pedido Sicoob #%s. Preço e estoque revalidados antes da criação.', COALESCE(v_order.id::text, '')),
    v_profile.organization_id,
    v_order.pa_id,
    v_order.cooperative_id
  )
  RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code,
      source_variant_id, source_variant_sku, catalog_checked_at, sort_order
    ) VALUES (
      v_quote_id,
      v_item ->> 'product_id',
      v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''),
      NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''),
      NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''),
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz,
      v_sort_order
    ) RETURNING id INTO v_quote_item_id;

    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        width_cm, height_cm, personalized_quantity, unit_cost,
        setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id,
        v_personalization ->> 'technique_id',
        v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        concat_ws(' ',
          CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
            THEN format('Posição: %s.', v_personalization ->> 'position') END,
          'Arte precisa ser reenviada e aprovada para esta recompra.'
        ),
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END LOOP;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_reorder_requests (
    actor_id, source_order_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    v_actor_id, p_order_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN v_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text) TO service_role;

COMMENT ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text) IS
  'RPC interna: cria orçamento de recompra atômico com catálogo revalidado pela Edge Function.';
