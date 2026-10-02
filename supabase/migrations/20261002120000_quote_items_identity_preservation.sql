-- Preserva a identidade das linhas de quote_items no salvamento atômico.
-- Antes, cada edição deletava todos os itens e recriava com ids novos; agora
-- itens declarados com `id` são atualizados no lugar, itens sem `id` nascem
-- novos e itens ausentes do payload são removidos. Um `id` que não pertence
-- ao orçamento (estado obsoleto de outra aba/usuário ou tentativa de
-- referenciar item alheio) recusa a gravação inteira.
CREATE OR REPLACE FUNCTION public.save_quote_atomic(
  p_quote jsonb,
  p_items jsonb,
  p_quote_id uuid DEFAULT NULL,
  p_expected_row_version integer DEFAULT NULL,
  p_history jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_history_entry jsonb;
  v_ordinal bigint;
  v_item_id uuid;
  v_organization_id uuid;
  v_status text;
  v_quantity integer;
  v_personalized_quantity integer;
  v_unit_price numeric;
  v_unit_cost numeric;
  v_setup_cost numeric;
  v_personalization_unit_cost numeric;
  v_personalization_total numeric;
  v_real_subtotal numeric := 0;
  v_total_cost numeric := 0;
  v_markup numeric;
  v_subtotal numeric;
  v_discount_percent numeric;
  v_discount_amount numeric;
  v_shipping_cost numeric;
  v_total numeric;
  v_action text;
  v_description text;
  v_declared_item_ids uuid[];
  v_seen_item_ids uuid[] := '{}'::uuid[];
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;
  IF jsonb_typeof(p_quote) IS DISTINCT FROM 'object'
     OR jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR jsonb_typeof(COALESCE(p_history, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Cabeçalho, itens ou histórico do orçamento são inválidos.';
  END IF;

  v_markup := COALESCE(NULLIF(p_quote ->> 'negotiation_markup_percent', '')::numeric, 0);
  v_discount_percent := COALESCE(NULLIF(p_quote ->> 'discount_percent', '')::numeric, 0);
  v_discount_amount := COALESCE(NULLIF(p_quote ->> 'discount_amount', '')::numeric, 0);
  v_shipping_cost := COALESCE(NULLIF(p_quote ->> 'shipping_cost', '')::numeric, 0);
  IF v_markup < 0 OR v_markup > 50
     OR v_discount_percent < 0 OR v_discount_percent > 100
     OR v_discount_amount < 0 OR v_shipping_cost < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Markup, desconto ou frete do orçamento são inválidos.';
  END IF;

  -- Primeira passagem: valida todo o documento e recalcula os totais sem
  -- confiar nos campos derivados enviados pelo navegador.
  FOR v_item, v_ordinal IN
    SELECT value, ordinality
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) WITH ORDINALITY
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('Item %s do orçamento é inválido.', v_ordinal);
    END IF;

    v_quantity := NULLIF(v_item ->> 'quantity', '')::integer;
    v_unit_price := NULLIF(v_item ->> 'unit_price', '')::numeric;
    v_unit_cost := COALESCE(NULLIF(v_item ->> 'unit_cost', '')::numeric, 0);
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_unit_price IS NULL OR v_unit_price < 0 OR v_unit_cost < 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('Quantidade ou valor do item %s é inválido.', v_ordinal);
    END IF;
    IF jsonb_typeof(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('Personalizações do item %s são inválidas.', v_ordinal);
    END IF;

    v_real_subtotal := v_real_subtotal + (v_quantity * v_unit_price);
    v_total_cost := v_total_cost + (v_quantity * v_unit_cost);
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      IF jsonb_typeof(v_personalization) IS DISTINCT FROM 'object' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('Personalização do item %s é inválida.', v_ordinal);
      END IF;
      v_setup_cost := COALESCE(NULLIF(v_personalization ->> 'setup_cost', '')::numeric, 0);
      v_personalization_unit_cost := COALESCE(NULLIF(v_personalization ->> 'unit_cost', '')::numeric, 0);
      v_personalization_total := COALESCE(NULLIF(v_personalization ->> 'total_cost', '')::numeric, 0);
      v_personalized_quantity := COALESCE(NULLIF(v_personalization ->> 'personalized_quantity', '')::integer, v_quantity);
      IF v_setup_cost < 0 OR v_personalization_unit_cost < 0 OR v_personalization_total < 0
         OR v_personalized_quantity <= 0
         OR COALESCE(NULLIF(v_personalization ->> 'colors_count', '')::integer, 1) <= 0
         OR COALESCE(NULLIF(v_personalization ->> 'positions_count', '')::integer, 1) <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = format('Custos ou quantidades da personalização do item %s são inválidos.', v_ordinal);
      END IF;
      v_real_subtotal := v_real_subtotal + v_personalization_total;
      v_total_cost := v_total_cost + v_setup_cost + (v_personalization_unit_cost * v_personalized_quantity);
    END LOOP;
  END LOOP;

  v_real_subtotal := round(v_real_subtotal, 2);
  v_total_cost := round(v_total_cost, 2);
  v_subtotal := round(v_real_subtotal * (1 + v_markup / 100), 2);
  v_discount_amount := round(v_discount_amount, 2);
  IF v_discount_amount > v_subtotal THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O desconto não pode superar o subtotal do orçamento.';
  END IF;
  IF v_discount_percent > 0
     AND abs(v_discount_amount - round(v_subtotal * v_discount_percent / 100, 2)) > 0.01 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Percentual e valor do desconto não correspondem.';
  END IF;
  v_total := round(
    v_subtotal - v_discount_amount
    + CASE WHEN COALESCE(p_quote ->> 'shipping_type', '') IN ('fob', 'fob_pre') THEN v_shipping_cost ELSE 0 END,
    2
  );

  IF (p_quote ? 'subtotal' AND abs((p_quote ->> 'subtotal')::numeric - v_subtotal) > 0.01)
     OR (p_quote ? 'total' AND abs((p_quote ->> 'total')::numeric - v_total) > 0.01)
     OR (p_quote ? 'total_cost' AND abs((p_quote ->> 'total_cost')::numeric - v_total_cost) > 0.01) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Os totais enviados não correspondem aos itens do orçamento.';
  END IF;

  IF p_quote_id IS NULL THEN
    IF p_expected_row_version IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Uma criação não pode informar versão anterior.';
    END IF;
    v_status := COALESCE(NULLIF(trim(p_quote ->> 'status'), ''), 'draft');
    IF v_status <> 'draft' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Um novo orçamento deve iniciar como rascunho.';
    END IF;
    v_organization_id := NULLIF(p_quote ->> 'organization_id', '')::uuid;
    IF v_organization_id IS NOT NULL
       AND NOT COALESCE(public.can_view_all_sales(), false)
       AND NOT EXISTS (
         SELECT 1
         FROM public.get_user_org_ids(v_actor_id) AS allowed(organization_id)
         WHERE allowed.organization_id = v_organization_id
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A organização informada não pertence ao usuário.';
    END IF;

    INSERT INTO public.quotes (
      client_id, client_name, client_email, client_phone, client_company,
      seller_id, organization_id, status, subtotal, discount_percent,
      discount_amount, total, total_cost, negotiation_markup_percent,
      payment_terms, delivery_time, shipping_type, shipping_cost, notes,
      internal_notes, valid_until
    ) VALUES (
      NULLIF(p_quote ->> 'client_id', ''), NULLIF(p_quote ->> 'client_name', ''),
      NULLIF(p_quote ->> 'client_email', ''), NULLIF(p_quote ->> 'client_phone', ''),
      NULLIF(p_quote ->> 'client_company', ''), v_actor_id, v_organization_id,
      'draft', v_subtotal, v_discount_percent, v_discount_amount, v_total,
      v_total_cost, v_markup, NULLIF(p_quote ->> 'payment_terms', ''),
      NULLIF(p_quote ->> 'delivery_time', ''), NULLIF(p_quote ->> 'shipping_type', ''),
      v_shipping_cost, NULLIF(p_quote ->> 'notes', ''),
      NULLIF(p_quote ->> 'internal_notes', ''), NULLIF(p_quote ->> 'valid_until', '')::timestamptz
    ) RETURNING * INTO v_quote;
    v_action := 'created';
  ELSE
    IF p_expected_row_version IS NULL OR p_expected_row_version <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A versão atual é obrigatória para editar o orçamento.';
    END IF;
    SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento não encontrado ou fora do seu escopo.';
    END IF;
    IF v_quote.row_version IS DISTINCT FROM p_expected_row_version THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O orçamento mudou; atualize a página antes de salvar.';
    END IF;
    IF NOT v_quote.is_latest_version OR v_quote.status NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O orçamento enviado para decisão deve ser revisado em uma nova versão.';
    END IF;
    IF p_quote ? 'status'
       AND NULLIF(trim(p_quote ->> 'status'), '') IS DISTINCT FROM v_quote.status THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Use o fluxo formal para alterar o status do orçamento.';
    END IF;

    -- Todo `id` declarado precisa ser único e pertencer a este orçamento.
    -- Um id desconhecido indica composição obsoleta no editor (outra aba ou
    -- usuário já alterou os itens) e recusa a gravação em vez de recriar
    -- linhas com identidade nova, o que perderia vínculos de arte e pedido.
    SELECT COALESCE(array_agg((entry.value ->> 'id')::uuid), '{}'::uuid[])
      INTO v_declared_item_ids
      FROM jsonb_array_elements(p_items) AS entry
     WHERE NULLIF(trim(entry.value ->> 'id'), '') IS NOT NULL;

    IF (SELECT count(d.id) FROM unnest(v_declared_item_ids) AS d(id))
       <> (SELECT count(DISTINCT d.id) FROM unnest(v_declared_item_ids) AS d(id)) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identificadores de itens duplicados no orçamento.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM unnest(v_declared_item_ids) AS d(id)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.quote_items qi
        WHERE qi.id = d.id AND qi.quote_id = v_quote.id
      )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Os itens do orçamento mudaram; atualize a página antes de salvar.';
    END IF;

    UPDATE public.quotes SET
      client_id = NULLIF(p_quote ->> 'client_id', ''),
      client_name = NULLIF(p_quote ->> 'client_name', ''),
      client_email = NULLIF(p_quote ->> 'client_email', ''),
      client_phone = NULLIF(p_quote ->> 'client_phone', ''),
      client_company = NULLIF(p_quote ->> 'client_company', ''),
      subtotal = v_subtotal,
      discount_percent = v_discount_percent,
      discount_amount = v_discount_amount,
      total = v_total,
      total_cost = v_total_cost,
      negotiation_markup_percent = v_markup,
      payment_terms = NULLIF(p_quote ->> 'payment_terms', ''),
      delivery_time = NULLIF(p_quote ->> 'delivery_time', ''),
      shipping_type = NULLIF(p_quote ->> 'shipping_type', ''),
      shipping_cost = v_shipping_cost,
      notes = NULLIF(p_quote ->> 'notes', ''),
      internal_notes = NULLIF(p_quote ->> 'internal_notes', ''),
      valid_until = NULLIF(p_quote ->> 'valid_until', '')::timestamptz,
      updated_at = clock_timestamp()
    WHERE id = p_quote_id AND row_version = p_expected_row_version
    RETURNING * INTO v_quote;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'O orçamento mudou; atualize a página antes de salvar.';
    END IF;
    v_action := 'updated';
  END IF;

  -- Segunda passagem: todas as escritas estão na mesma transação do
  -- cabeçalho. Qualquer erro reverte também deleções e histórico.
  FOR v_item, v_ordinal IN
    SELECT value, ordinality
    FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) WITH ORDINALITY
  LOOP
    v_quantity := (v_item ->> 'quantity')::integer;
    v_unit_price := (v_item ->> 'unit_price')::numeric;
    v_unit_cost := COALESCE(NULLIF(v_item ->> 'unit_cost', '')::numeric, 0);
    -- Ids declarados só valem na edição; na criação todo item nasce com uuid novo.
    v_item_id := CASE WHEN p_quote_id IS NULL THEN NULL
                      ELSE NULLIF(v_item ->> 'id', '')::uuid END;

    IF v_item_id IS NULL THEN
      INSERT INTO public.quote_items (
        quote_id, product_id, product_name, product_sku, product_image_url,
        quantity, unit_price, unit_cost, subtotal, color_name, color_hex,
        notes, sort_order, kit_group_id, kit_name, size_code, gender,
        source_variant_id, source_variant_sku, price_confirmed_at
      ) VALUES (
        v_quote.id, NULLIF(v_item ->> 'product_id', ''), trim(v_item ->> 'product_name'),
        NULLIF(v_item ->> 'product_sku', ''), NULLIF(v_item ->> 'product_image_url', ''),
        v_quantity, v_unit_price, v_unit_cost,
        round(v_quantity * v_unit_price + COALESCE((
          SELECT sum(COALESCE(NULLIF(value ->> 'total_cost', '')::numeric, 0))
          FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
        ), 0), 2),
        NULLIF(v_item ->> 'color_name', ''), NULLIF(v_item ->> 'color_hex', ''),
        NULLIF(v_item ->> 'notes', ''), (v_ordinal - 1)::integer,
        NULLIF(v_item ->> 'kit_group_id', ''), NULLIF(v_item ->> 'kit_name', ''),
        NULLIF(v_item ->> 'size_code', ''), NULLIF(v_item ->> 'gender', ''),
        NULLIF(v_item ->> 'source_variant_id', ''), NULLIF(v_item ->> 'source_variant_sku', ''),
        NULLIF(v_item ->> 'price_confirmed_at', '')::timestamptz
      ) RETURNING id INTO v_item_id;
    ELSE
      UPDATE public.quote_items SET
        product_id = NULLIF(v_item ->> 'product_id', ''),
        product_name = trim(v_item ->> 'product_name'),
        product_sku = NULLIF(v_item ->> 'product_sku', ''),
        product_image_url = NULLIF(v_item ->> 'product_image_url', ''),
        quantity = v_quantity,
        unit_price = v_unit_price,
        unit_cost = v_unit_cost,
        subtotal = round(v_quantity * v_unit_price + COALESCE((
          SELECT sum(COALESCE(NULLIF(value ->> 'total_cost', '')::numeric, 0))
          FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
        ), 0), 2),
        color_name = NULLIF(v_item ->> 'color_name', ''),
        color_hex = NULLIF(v_item ->> 'color_hex', ''),
        notes = NULLIF(v_item ->> 'notes', ''),
        sort_order = (v_ordinal - 1)::integer,
        kit_group_id = NULLIF(v_item ->> 'kit_group_id', ''),
        kit_name = NULLIF(v_item ->> 'kit_name', ''),
        size_code = NULLIF(v_item ->> 'size_code', ''),
        gender = NULLIF(v_item ->> 'gender', ''),
        source_variant_id = NULLIF(v_item ->> 'source_variant_id', ''),
        source_variant_sku = NULLIF(v_item ->> 'source_variant_sku', ''),
        price_confirmed_at = NULLIF(v_item ->> 'price_confirmed_at', '')::timestamptz,
        -- Qualquer edição invalida a consulta ao catálogo da recompra, como o
        -- antigo delete-recreate fazia ao nascer linhas novas sem esses campos.
        catalog_checked_at = NULL,
        catalog_available_stock = NULL,
        catalog_minimum_quantity = NULL,
        catalog_valid_until = NULL,
        catalog_stock_is_reserved = false,
        historical_unit_price = NULL,
        price_changed = false
      WHERE id = v_item_id AND quote_id = v_quote.id
      RETURNING id INTO v_item_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Os itens do orçamento mudaram; atualize a página antes de salvar.';
      END IF;
    END IF;

    v_seen_item_ids := v_seen_item_ids || v_item_id;

    -- As personalizações são linhas-filha reescritas a cada salvamento;
    -- a identidade preservada é a do item-pai.
    DELETE FROM public.quote_item_personalizations WHERE quote_item_id = v_item_id;
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        positions_count, area_cm2, width_cm, height_cm, personalized_quantity,
        setup_cost, unit_cost, total_cost, notes
      ) VALUES (
        v_item_id, NULLIF(v_personalization ->> 'technique_id', ''),
        NULLIF(v_personalization ->> 'technique_name', ''),
        COALESCE(NULLIF(v_personalization ->> 'colors_count', '')::integer, 1),
        COALESCE(NULLIF(v_personalization ->> 'positions_count', '')::integer, 1),
        NULLIF(v_personalization ->> 'area_cm2', '')::numeric,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        NULLIF(v_personalization ->> 'personalized_quantity', '')::integer,
        COALESCE(NULLIF(v_personalization ->> 'setup_cost', '')::numeric, 0),
        COALESCE(NULLIF(v_personalization ->> 'unit_cost', '')::numeric, 0),
        COALESCE(NULLIF(v_personalization ->> 'total_cost', '')::numeric, 0),
        NULLIF(v_personalization ->> 'notes', '')
      );
    END LOOP;
  END LOOP;

  -- Itens ausentes do payload deixam de existir; os preservados mantêm id.
  DELETE FROM public.quote_items
  WHERE quote_id = v_quote.id AND NOT (id = ANY(v_seen_item_ids));

  IF jsonb_array_length(COALESCE(p_history, '[]'::jsonb)) = 0 THEN
    PERFORM public.append_quote_history_note(
      v_quote.id, v_action,
      CASE WHEN v_action = 'created' THEN 'Orçamento criado' ELSE 'Orçamento atualizado' END
    );
  ELSE
    FOR v_history_entry IN SELECT value FROM jsonb_array_elements(p_history)
    LOOP
      IF jsonb_typeof(v_history_entry) IS DISTINCT FROM 'string'
         OR NULLIF(trim(v_history_entry #>> '{}'), '') IS NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Entrada de histórico inválida.';
      END IF;
      v_description := left(trim(v_history_entry #>> '{}'), 2000);
      PERFORM public.append_quote_history_note(
        v_quote.id, v_action, v_description, NULL, NULL, NULL,
        jsonb_build_object('source', 'save_quote_atomic')
      );
    END LOOP;
  END IF;

  RETURN to_jsonb(v_quote);
END;
$function$;

REVOKE ALL ON FUNCTION public.save_quote_atomic(jsonb, jsonb, uuid, integer, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quote_atomic(jsonb, jsonb, uuid, integer, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.save_quote_atomic(jsonb, jsonb, uuid, integer, jsonb) IS
  'Salva orçamento, itens, personalizações e histórico atomicamente, com RLS, recálculo, bloqueio otimista e preservação da identidade dos itens.';
