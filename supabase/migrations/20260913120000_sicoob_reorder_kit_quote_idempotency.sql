-- Idempotência de recompra e conversão de kit + follow-ups de catálogo.
--
-- As migrations 20260912170000_sicoob_reorder_atomic.sql e
-- 20260912200000_sicoob_kit_quote_atomic.sql já foram mescladas em main
-- (PR #6) e podem já ter sido aplicadas em produção. Esta migration nova
-- carrega o trabalho feito depois do merge — chave de idempotência real
-- (via hash do payload calculado pela Edge Function, não mais pelo
-- Postgres) e o registro correto de personalizações na recompra — sem
-- editar arquivo de migration já mesclado, para não gerar drift entre o
-- que está no disco e o que já rodou no banco.
--
-- Cada bloco abaixo referencia a migration original que ele complementa.

-- ============================================================
-- De 20260912100000_quote_versioning_atomic.sql
-- ============================================================

-- versões preservem a variante e a data da última validação do catálogo.
ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS source_variant_id text,
  ADD COLUMN IF NOT EXISTS source_variant_sku text,
  ADD COLUMN IF NOT EXISTS catalog_checked_at timestamptz;

CREATE OR REPLACE FUNCTION public.create_quote_version_atomic(p_source_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_source public.quotes%ROWTYPE;
  v_source_item public.quote_items%ROWTYPE;
  v_root_id uuid;
  v_new_quote_id uuid;
  v_new_item_id uuid;
  v_next_version integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Autenticação necessária para criar uma versão de orçamento.';
  END IF;

  SELECT *
  INTO v_source
  FROM public.quotes
  WHERE id = p_source_quote_id
  FOR UPDATE;

  IF NOT FOUND OR v_source.deleted_at IS NOT NULL OR coalesce(v_source.is_active, true) = false THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento de origem não encontrado ou inativo.';
  END IF;

  IF v_source.seller_id IS DISTINCT FROM v_actor_id
    AND NOT (
      public.can_manage_quotes(v_actor_id)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id AND ur.role::text IN ('admin', 'dev')
        )
        OR v_source.organization_id IS NULL
        OR v_source.organization_id IN (SELECT public.get_user_org_ids(v_actor_id))
      )
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Você não possui permissão para versionar este orçamento.';
  END IF;

  v_root_id := coalesce(v_source.parent_quote_id, v_source.id);

  -- Serializa todas as versões da mesma família, mesmo quando duas abas usam
  -- versões-filhas diferentes como origem.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_root_id::text, 0));

  SELECT *
  INTO v_source
  FROM public.quotes
  WHERE id = p_source_quote_id
  FOR UPDATE;

  IF NOT v_source.is_latest_version THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = 'Uma versão mais recente já foi criada. Atualize a página antes de continuar.';
  END IF;

  SELECT coalesce(max(version), 0) + 1
  INTO v_next_version
  FROM public.quotes
  WHERE id = v_root_id OR parent_quote_id = v_root_id;

  UPDATE public.quotes
  SET is_latest_version = false
  WHERE (id = v_root_id OR parent_quote_id = v_root_id)
    AND is_latest_version;

  -- Copia apenas os dados comerciais e de contexto. Decisões, integrações e
  -- respostas do cliente pertencem à versão anterior e devem ser revalidadas.
  INSERT INTO public.quotes (
    client_cnpj,
    client_company,
    client_email,
    client_id,
    client_name,
    client_phone,
    delivery_time,
    discount_amount,
    discount_percent,
    internal_notes,
    is_active,
    is_latest_version,
    negotiation_markup_percent,
    notes,
    organization_id,
    pa_id,
    parent_quote_id,
    payment_terms,
    real_discount_percent,
    real_subtotal,
    seller_id,
    shipping_cost,
    shipping_type,
    singular_id,
    status,
    subtotal,
    suggested_modifications,
    tags,
    total,
    total_cost,
    valid_until,
    version
  ) VALUES (
    v_source.client_cnpj,
    v_source.client_company,
    v_source.client_email,
    v_source.client_id,
    v_source.client_name,
    v_source.client_phone,
    v_source.delivery_time,
    v_source.discount_amount,
    v_source.discount_percent,
    v_source.internal_notes,
    true,
    true,
    v_source.negotiation_markup_percent,
    v_source.notes,
    v_source.organization_id,
    v_source.pa_id,
    v_root_id,
    v_source.payment_terms,
    v_source.real_discount_percent,
    v_source.real_subtotal,
    v_source.seller_id,
    v_source.shipping_cost,
    v_source.shipping_type,
    v_source.singular_id,
    'draft',
    v_source.subtotal,
    NULL,
    v_source.tags,
    v_source.total,
    v_source.total_cost,
    v_source.valid_until,
    v_next_version
  )
  RETURNING id INTO v_new_quote_id;

  FOR v_source_item IN
    SELECT *
    FROM public.quote_items
    WHERE quote_id = v_source.id
    ORDER BY coalesce(display_order, sort_order, 0), created_at, id
  LOOP
    INSERT INTO public.quote_items (
      quote_id,
      color_hex,
      color_name,
      display_order,
      gender,
      kit_group_id,
      kit_name,
      notes,
      price_confirmed_at,
      product_id,
      product_image_url,
      product_name,
      product_sku,
      quantity,
      size_code,
      sort_order,
      subtotal,
      source_variant_id,
      source_variant_sku,
      catalog_checked_at,
      unit_cost,
      unit_price
    ) VALUES (
      v_new_quote_id,
      v_source_item.color_hex,
      v_source_item.color_name,
      v_source_item.display_order,
      v_source_item.gender,
      v_source_item.kit_group_id,
      v_source_item.kit_name,
      v_source_item.notes,
      NULL,
      v_source_item.product_id,
      v_source_item.product_image_url,
      v_source_item.product_name,
      v_source_item.product_sku,
      v_source_item.quantity,
      v_source_item.size_code,
      v_source_item.sort_order,
      v_source_item.subtotal,
      v_source_item.source_variant_id,
      v_source_item.source_variant_sku,
      v_source_item.catalog_checked_at,
      v_source_item.unit_cost,
      v_source_item.unit_price
    )
    RETURNING id INTO v_new_item_id;

    INSERT INTO public.quote_item_personalizations (
      quote_item_id,
      area_cm2,
      colors_count,
      height_cm,
      notes,
      personalized_quantity,
      positions_count,
      setup_cost,
      technique_id,
      technique_name,
      total_cost,
      unit_cost,
      width_cm
    )
    SELECT
      v_new_item_id,
      area_cm2,
      colors_count,
      height_cm,
      notes,
      personalized_quantity,
      positions_count,
      setup_cost,
      technique_id,
      technique_name,
      total_cost,
      unit_cost,
      width_cm
    FROM public.quote_item_personalizations
    WHERE quote_item_id = v_source_item.id;
  END LOOP;

  INSERT INTO public.quote_history (
    quote_id,
    user_id,
    action,
    description,
    metadata
  ) VALUES (
    v_new_quote_id,
    v_actor_id,
    'version_created',
    format('Versão %s criada a partir de %s (v%s).', v_next_version, v_source.quote_number, v_source.version),
    jsonb_build_object(
      'source_quote_id', v_source.id,
      'source_quote_number', v_source.quote_number,
      'source_version', v_source.version,
      'version', v_next_version
    )
  );

  RETURN v_new_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_quote_version_atomic(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_quote_version_atomic(uuid) TO authenticated;

-- ============================================================
-- De 20260912170000_sicoob_reorder_atomic.sql
-- ============================================================

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

-- ============================================================
-- De 20260912180000_sicoob_finance_artwork.sql
-- ============================================================

DROP POLICY IF EXISTS "sicoob_order_documents_delete_orphan_artwork" ON storage.objects;
CREATE POLICY "sicoob_order_documents_delete_orphan_artwork" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'sicoob-order-documents'
  AND owner = auth.uid()
  AND name ~ '^[0-9a-fA-F-]+/artwork/.+\.(pdf|png|jpg|jpeg|webp)$'
  AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), split_part(name, '/', 1)::uuid)
  AND NOT EXISTS (
    SELECT 1 FROM public.sicoob_order_artwork_versions artwork
    WHERE artwork.file_path = name
  )
);


CREATE OR REPLACE FUNCTION public.record_sicoob_order_payment(
  p_order_id uuid,
  p_installment_number integer,
  p_amount numeric,
  p_due_date date,
  p_status text DEFAULT 'pending',
  p_invoice_id uuid DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_external_reference text DEFAULT NULL,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_existing public.sicoob_order_payments%ROWTYPE;
  v_payment_id uuid;
  v_active_total numeric;
BEGIN
  IF v_actor_id IS NULL OR NOT public.sicoob_actor_can_manage_finance(v_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode registrar pagamentos neste pedido.';
  END IF;
  IF p_installment_number <= 0 OR p_amount <= 0 OR p_due_date IS NULL
     OR p_status NOT IN ('pending', 'paid', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dados da parcela são inválidos.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id::text || ':finance', 0));
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.';
  END IF;
  IF v_order.status NOT IN ('confirmed', 'logistic', 'in_production', 'in_separation', 'in_transit', 'delivered', 'completed') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido precisa estar confirmado para receber parcelas.';
  END IF;
  IF p_invoice_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sicoob_order_invoices
     WHERE id = p_invoice_id AND order_id = p_order_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'A nota fiscal não pertence ao pedido.';
  END IF;

  SELECT * INTO v_existing
    FROM public.sicoob_order_payments
   WHERE order_id = p_order_id AND installment_number = p_installment_number
   FOR UPDATE;
  IF FOUND AND p_expected_updated_at IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A parcela já existe; informe a versão atual antes de alterar.';
  END IF;
  IF FOUND AND p_expected_updated_at IS NOT NULL
     AND v_existing.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A parcela mudou; atualize a página antes de salvar.';
  END IF;
  IF FOUND AND v_existing.status IN ('paid', 'refunded')
     AND (
       v_existing.invoice_id IS DISTINCT FROM p_invoice_id
       OR v_existing.amount IS DISTINCT FROM p_amount
       OR v_existing.due_date IS DISTINCT FROM p_due_date
       OR v_existing.status IS DISTINCT FROM p_status
       OR v_existing.payment_method IS DISTINCT FROM NULLIF(trim(p_payment_method), '')
       OR v_existing.external_reference IS DISTINCT FROM NULLIF(trim(p_external_reference), '')
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Parcela liquidada exige estorno formal antes de outra alteração.';
  END IF;

  SELECT COALESCE(sum(amount), 0) INTO v_active_total
    FROM public.sicoob_order_payments
   WHERE order_id = p_order_id
     AND installment_number <> p_installment_number
     AND status IN ('pending', 'paid', 'overdue');
  IF p_status IN ('pending', 'paid') AND v_active_total + p_amount > v_order.total_amount THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A soma das parcelas supera o valor do pedido.';
  END IF;

  PERFORM set_config('app.sicoob_payment_operation', 'record', true);
  INSERT INTO public.sicoob_order_payments (
    order_id, invoice_id, installment_number, amount, due_date, paid_at,
    payment_method, external_reference, status, created_by, updated_by
  ) VALUES (
    p_order_id, p_invoice_id, p_installment_number, p_amount, p_due_date,
    CASE WHEN p_status = 'paid' THEN now() ELSE NULL END,
    NULLIF(trim(p_payment_method), ''), NULLIF(trim(p_external_reference), ''),
    p_status, v_actor_id, v_actor_id
  )
  ON CONFLICT (order_id, installment_number) DO UPDATE SET
    invoice_id = EXCLUDED.invoice_id,
    amount = EXCLUDED.amount,
    due_date = EXCLUDED.due_date,
    paid_at = CASE
      WHEN EXCLUDED.status = 'paid' THEN COALESCE(public.sicoob_order_payments.paid_at, now())
      ELSE NULL
    END,
    payment_method = EXCLUDED.payment_method,
    external_reference = EXCLUDED.external_reference,
    status = EXCLUDED.status,
    updated_by = v_actor_id,
    updated_at = now()
  RETURNING id INTO v_payment_id;
  RETURN v_payment_id;
END;
$$;


-- ============================================================
-- De 20260912190000_sicoob_consolidation_distribution.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.allocate_sicoob_consolidation_by_order_pa(p_consolidation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
  v_count integer;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Consolidação não encontrada.'; END IF;
  IF v_group.status NOT IN ('draft', 'pending_seller') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Distribuição já despachada e não pode ser refeita.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    WHERE co.consolidation_id = p_consolidation_id
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A consolidação não possui itens para distribuir.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.order_consolidation_orders co
      JOIN public.sicoob_orders o ON o.id = co.order_id
      LEFT JOIN public.postos_atendimento pa ON pa.id = o.pa_id
     WHERE co.consolidation_id = p_consolidation_id
       AND (
         pa.id IS NULL
         OR pa.is_active IS DISTINCT FROM true
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os destinos precisam estar ativos e com endereço completo.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'allocate', true);
  DELETE FROM public.sicoob_delivery_allocations a USING public.sicoob_delivery_destinations d
   WHERE a.destination_id = d.id AND d.consolidation_id = p_consolidation_id;
  DELETE FROM public.sicoob_delivery_destinations WHERE consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_destinations (
    consolidation_id, pa_id, destination_name, address_snapshot
  )
  SELECT DISTINCT p_consolidation_id, pa.id, pa.nome,
    jsonb_build_object('codigo', pa.codigo, 'endereco', pa.endereco, 'cidade', pa.cidade, 'uf', pa.uf)
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.postos_atendimento pa ON pa.id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;

  INSERT INTO public.sicoob_delivery_allocations (destination_id, order_item_id, quantity)
  SELECT d.id, oi.id, oi.quantity
  FROM public.order_consolidation_orders co
  JOIN public.sicoob_orders o ON o.id = co.order_id
  JOIN public.sicoob_order_items oi ON oi.order_id = o.id
  JOIN public.sicoob_delivery_destinations d
    ON d.consolidation_id = p_consolidation_id AND d.pa_id = o.pa_id
  WHERE co.consolidation_id = p_consolidation_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION public.dispatch_sicoob_order_consolidation(p_consolidation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_group public.order_consolidations%ROWTYPE;
BEGIN
  SELECT * INTO v_group FROM public.order_consolidations
   WHERE id = p_consolidation_id FOR UPDATE;
  IF NOT FOUND OR v_group.status <> 'pending_seller' THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A consolidação mudou; atualize a página.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.sicoob_delivery_destinations d
      LEFT JOIN public.postos_atendimento pa ON pa.id = d.pa_id
     WHERE d.consolidation_id = p_consolidation_id
       AND (
         pa.id IS NULL
         OR pa.is_active IS DISTINCT FROM true
         OR NULLIF(trim(pa.endereco), '') IS NULL
         OR NULLIF(trim(pa.cidade), '') IS NULL
         OR NULLIF(trim(pa.uf), '') IS NULL
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os destinos precisam permanecer ativos e com endereço completo antes do despacho.';
  END IF;
  IF EXISTS (
    SELECT oi.id
    FROM public.order_consolidation_orders co
    JOIN public.sicoob_order_items oi ON oi.order_id = co.order_id
    LEFT JOIN (
      SELECT a.order_item_id, sum(a.quantity) AS allocated_quantity
      FROM public.sicoob_delivery_allocations a
      JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
      WHERE d.consolidation_id = p_consolidation_id
      GROUP BY a.order_item_id
    ) allocated ON allocated.order_item_id = oi.id
    WHERE co.consolidation_id = p_consolidation_id
      AND COALESCE(allocated.allocated_quantity, 0) <> oi.quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Todos os itens precisam de um destino antes do despacho.';
  END IF;
  PERFORM set_config('app.sicoob_consolidation_operation', 'dispatch', true);
  PERFORM set_config('app.sicoob_order_status_comment', 'Despachado no lote consolidado ' || p_consolidation_id::text || '.', true);
  UPDATE public.sicoob_orders o
     SET status = 'logistic', updated_at = now()
    FROM public.order_consolidation_orders co
   WHERE co.consolidation_id = p_consolidation_id
     AND co.order_id = o.id
     AND o.status = 'confirmed';
  IF NOT FOUND OR EXISTS (
    SELECT 1
      FROM public.order_consolidation_orders co
      JOIN public.sicoob_orders o ON o.id = co.order_id
     WHERE co.consolidation_id = p_consolidation_id
       AND o.status <> 'logistic'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um pedido do lote mudou; atualize a página.';
  END IF;
  UPDATE public.order_consolidations SET status = 'sent', updated_at = now()
   WHERE id = p_consolidation_id;
END;
$$;

-- ============================================================
-- De 20260912200000_sicoob_kit_quote_atomic.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_sicoob_kit_quote_idempotency(
  p_actor_id uuid,
  p_idempotency_key text,
  p_request_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_quote_number text;
  v_total numeric(14,2);
BEGIN
  IF p_actor_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de kit inválida.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE user_id = p_actor_id AND is_active IS TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id AND idempotency_key = trim(p_idempotency_key);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;
  SELECT quote_number, total INTO v_quote_number, v_total
    FROM public.quotes WHERE id = v_existing.quote_id;
  RETURN jsonb_build_object(
    'quote_id', v_existing.quote_id,
    'quote_number', v_quote_number,
    'total', v_total
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_sicoob_kit_quote_idempotency(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sicoob_kit_quote_idempotency(uuid, text, text) TO service_role;

DROP FUNCTION IF EXISTS public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid);

CREATE OR REPLACE FUNCTION public.create_sicoob_kit_quote(
  p_kit jsonb,
  p_items jsonb,
  p_personalizations jsonb,
  p_idempotency_key text,
  p_actor_id uuid,
  p_request_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_quote_id uuid;
  v_quote_number text;
  v_quote_item_id uuid;
  v_group_id uuid := gen_random_uuid();
  v_sort_order integer := 0;
  v_product_total numeric(14,2) := 0;
  v_personalization_total numeric(14,2) := 0;
  v_total numeric(14,2);
  v_checked_at timestamptz;
  v_payload_hash text;
  v_kit_name text := NULLIF(trim(p_kit ->> 'name'), '');
  v_kit_type text := NULLIF(trim(p_kit ->> 'type'), '');
  v_kit_quantity integer;
  v_identity_tag text := NULLIF(trim(p_kit ->> 'identity_tag'), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para criar o orçamento.';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de kit inválida.';
  END IF;
  IF jsonb_typeof(p_kit) IS DISTINCT FROM 'object'
     OR v_kit_name IS NULL OR length(v_kit_name) > 120
     OR v_kit_type NOT IN ('montado', 'original', 'simples')
     OR COALESCE(length(v_identity_tag), 0) > 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identificação do kit inválida.';
  END IF;

  BEGIN
    v_kit_quantity := (p_kit ->> 'quantity')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade de kits inválida.';
  END;
  IF v_kit_quantity IS NULL OR v_kit_quantity NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A quantidade de kits deve estar entre 1 e 100.000.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 2 AND 50
     OR jsonb_typeof(p_personalizations) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_personalizations) > jsonb_array_length(p_items) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Composição do kit inválida.';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items) source(item) WHERE item ->> 'kind' = 'box') <> 1
     OR jsonb_array_length(p_items) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_items) source(item)
     )
     OR jsonb_array_length(p_personalizations) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_personalizations) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Linhas de kit duplicadas ou embalagem inválida.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = p_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  v_payload_hash := p_request_hash;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || trim(p_idempotency_key), 0));
  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    SELECT quote_number, total INTO v_quote_number, v_total
      FROM public.quotes WHERE id = v_existing.quote_id;
    RETURN jsonb_build_object('quote_id', v_existing.quote_id, 'quote_number', v_quote_number, 'total', v_total);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(length(v_item ->> 'line_id'), 0) NOT BETWEEN 1 AND 64
       OR v_item ->> 'kind' NOT IN ('box', 'item')
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'minimum_quantity')::integer, 1) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item verificado do kit inválido.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;
    v_product_total := v_product_total
      + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
  END LOOP;

  -- MOQ é uma regra do produto, portanto duas linhas/variantes do mesmo produto
  -- devem ser avaliadas pela demanda total. Também recusamos snapshots que
  -- atribuam mínimos divergentes ao mesmo produto.
  IF EXISTS (
    SELECT 1
      FROM (
        SELECT item ->> 'product_id' AS product_id,
               sum((item ->> 'quantity')::integer) AS total_quantity,
               min(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS minimum_quantity,
               max(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS maximum_quantity
          FROM jsonb_array_elements(p_items) source(item)
         GROUP BY item ->> 'product_id'
      ) demand
     WHERE demand.minimum_quantity IS DISTINCT FROM demand.maximum_quantity
        OR demand.total_quantity < demand.minimum_quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
  END IF;

  FOR v_personalization IN SELECT value FROM jsonb_array_elements(p_personalizations)
  LOOP
    IF NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       )
       OR NULLIF(v_personalization ->> 'technique_id', '') IS NULL
       OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
       OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'personalized_quantity')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
       OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
       OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização verificada do kit inválida.';
    END IF;
    IF (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (
         SELECT (item ->> 'quantity')::integer
           FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A personalização não corresponde à quantidade do item.';
    END IF;

    v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
    END IF;
    v_personalization_total := v_personalization_total + (v_personalization ->> 'total_cost')::numeric;
  END LOOP;

  v_total := round(v_product_total + v_personalization_total, 2);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    internal_notes, organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    'Unidade Sicoob',
    p_actor_id,
    'draft',
    v_total,
    v_total,
    format('Kit "%s" (%sx) — tipo: %s. Catálogo consultado na criação; estoque não reservado.',
      v_kit_name, v_kit_quantity, v_kit_type),
    CASE WHEN v_identity_tag IS NOT NULL THEN format('Identidade do kit: %s', v_identity_tag) ELSE NULL END,
    v_profile.organization_id,
    v_profile.pa_id,
    v_profile.cooperativa_id
  ) RETURNING id, quote_number INTO v_quote_id, v_quote_number;

  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_items)
     ORDER BY CASE WHEN value ->> 'kind' = 'box' THEN 0 ELSE 1 END, value ->> 'line_id'
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code, notes, sort_order,
      kit_group_id, kit_name, source_variant_id, source_variant_sku, catalog_checked_at
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
      CASE WHEN v_item ->> 'kind' = 'box' THEN 'Embalagem do kit' ELSE NULL END,
      v_sort_order,
      v_group_id::text,
      v_kit_name,
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz
    ) RETURNING id INTO v_quote_item_id;

    SELECT value INTO v_personalization
      FROM jsonb_array_elements(p_personalizations)
     WHERE value ->> 'line_id' = v_item ->> 'line_id';
    IF FOUND THEN
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
        CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
          THEN format('Posição: %s', v_personalization ->> 'position') ELSE NULL END,
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END IF;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_kit_quote_requests (
    actor_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    p_actor_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN jsonb_build_object('quote_id', v_quote_id, 'quote_number', v_quote_number, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid, text) TO service_role;

COMMENT ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid, text) IS
  'RPC interna: persiste orçamento de kit atômico e idempotente após revalidação do catálogo pela Edge Function.';
