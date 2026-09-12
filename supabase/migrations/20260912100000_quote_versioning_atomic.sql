-- Versionamento atômico de orçamentos.
-- A criação anterior calculava a próxima versão no cliente e fazia várias
-- gravações independentes, o que permitia versões duplicadas e famílias sem
-- uma versão vigente em caso de concorrência ou falha intermediária.

-- Normaliza dados históricos antes de impor a invariável: uma única versão
-- vigente por família de orçamento. Em empate, preserva a mais nova.
WITH ranked_quotes AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY coalesce(parent_quote_id, id)
      ORDER BY version DESC, updated_at DESC, id DESC
    ) AS position
  FROM public.quotes
  WHERE deleted_at IS NULL
)
UPDATE public.quotes q
SET is_latest_version = ranked_quotes.position = 1
FROM ranked_quotes
WHERE q.id = ranked_quotes.id
  AND q.is_latest_version IS DISTINCT FROM (ranked_quotes.position = 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_one_latest_version_per_family
  ON public.quotes ((coalesce(parent_quote_id, id)))
  WHERE is_latest_version AND deleted_at IS NULL;

DROP FUNCTION IF EXISTS public.create_quote_version(uuid);

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
    AND NOT public.can_manage_quotes(v_actor_id) THEN
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
    v_source.suggested_modifications,
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
      v_source_item.price_confirmed_at,
      v_source_item.product_id,
      v_source_item.product_image_url,
      v_source_item.product_name,
      v_source_item.product_sku,
      v_source_item.quantity,
      v_source_item.size_code,
      v_source_item.sort_order,
      v_source_item.subtotal,
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
