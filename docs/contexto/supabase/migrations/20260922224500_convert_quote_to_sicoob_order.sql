-- Liga o fluxo comercial ao domínio operacional Sicoob em uma única
-- transação, com lock do orçamento e idempotência por origem.
ALTER TABLE public.sicoob_orders
  ADD COLUMN source_quote_id uuid REFERENCES public.quotes(id) ON DELETE RESTRICT,
  ADD COLUMN source_quote_snapshot jsonb,
  ADD COLUMN requires_artwork boolean NOT NULL DEFAULT false,
  ADD COLUMN merchandise_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN personalization_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN negotiation_markup_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN commercial_subtotal_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN shipping_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN pricing_formula_version text NOT NULL DEFAULT 'legacy-v0';

ALTER TABLE public.sicoob_order_items
  ADD COLUMN personalization_amount numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN line_total_amount numeric(14,2)
    GENERATED ALWAYS AS (round((COALESCE(total_price, 0) + personalization_amount)::numeric, 2)) STORED;

ALTER TABLE public.sicoob_orders
  ADD CONSTRAINT sicoob_orders_commercial_components_nonnegative CHECK (
    merchandise_amount >= 0 AND personalization_amount >= 0
    AND negotiation_markup_amount >= 0 AND commercial_subtotal_amount >= 0
    AND discount_amount >= 0 AND shipping_amount >= 0
  ),
  ADD CONSTRAINT sicoob_orders_brl_v1_reconciled CHECK (
    pricing_formula_version <> 'brl-v1'
    OR (
      abs(commercial_subtotal_amount - (merchandise_amount + personalization_amount + negotiation_markup_amount)) <= 0.01
      AND discount_amount <= commercial_subtotal_amount
      AND abs(total_amount - (commercial_subtotal_amount - discount_amount + shipping_amount)) <= 0.01
    )
  );

CREATE UNIQUE INDEX ux_sicoob_orders_source_quote
  ON public.sicoob_orders(source_quote_id)
  WHERE source_quote_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.convert_quote_to_sicoob_order(p_quote_id uuid)
RETURNS TABLE(id uuid, order_number text, status text, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_order public.sicoob_orders%ROWTYPE;
  v_pa_id uuid;
  v_cooperative_id uuid;
  v_requires_artwork boolean;
  v_merchandise numeric(14,2);
  v_personalization numeric(14,2);
  v_base numeric(14,2);
  v_markup_percent numeric(5,2);
  v_markup_amount numeric(14,2);
  v_commercial_subtotal numeric(14,2);
  v_discount_amount numeric(14,2);
  v_shipping_amount numeric(14,2);
  v_expected_total numeric(14,2);
BEGIN
  IF v_actor IS NULL OR p_quote_id IS NULL THEN
    RAISE EXCEPTION 'Usuário autenticado e orçamento são obrigatórios.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE (p.user_id=v_actor OR p.id=v_actor)
      AND p.is_active IS TRUE AND p.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'O perfil do usuário está inativo ou indisponível.' USING ERRCODE='42501';
  END IF;

  SELECT * INTO v_quote
  FROM public.quotes
  WHERE quotes.id = p_quote_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orçamento não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  IF v_quote.seller_id IS DISTINCT FROM v_actor AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_actor
      AND ur.role::text IN ('admin', 'manager', 'supervisor', 'dev')
  ) THEN
    RAISE EXCEPTION 'Usuário sem permissão para converter este orçamento.' USING ERRCODE = '42501';
  END IF;

  SELECT o.* INTO v_order
  FROM public.sicoob_orders o
  WHERE o.source_quote_id = p_quote_id;
  IF FOUND THEN
    RETURN QUERY SELECT v_order.id, v_order.order_number, v_order.status, v_order.total_amount;
    RETURN;
  END IF;

  IF v_quote.status NOT IN ('approved', 'approved_singular') THEN
    RAISE EXCEPTION 'Apenas orçamentos aprovados podem ser convertidos.' USING ERRCODE = '23514';
  END IF;
  IF v_quote.total IS NULL OR v_quote.total < 0 THEN
    RAISE EXCEPTION 'Total do orçamento inválido.' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quote_items qi WHERE qi.quote_id = p_quote_id) THEN
    RAISE EXCEPTION 'O orçamento não possui itens.' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.quote_items qi
    WHERE qi.quote_id = p_quote_id
      AND (qi.quantity <= 0 OR qi.unit_price <= 0 OR qi.product_name IS NULL OR btrim(qi.product_name) = '')
  ) THEN
    RAISE EXCEPTION 'O orçamento possui item com quantidade, nome ou preço inválido.' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(v_quote.pa_id, p.pa_id),
         COALESCE(v_quote.singular_id, p.cooperativa_id, p.singular_id)
  INTO v_pa_id, v_cooperative_id
  FROM (SELECT 1) seed
  LEFT JOIN LATERAL (
    SELECT profile.pa_id, profile.cooperativa_id, profile.singular_id
    FROM public.profiles profile
    WHERE profile.user_id = v_quote.seller_id OR profile.id = v_quote.seller_id
    ORDER BY (profile.user_id = v_quote.seller_id) DESC NULLS LAST
    LIMIT 1
  ) p ON true;

  IF v_pa_id IS NULL OR v_cooperative_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.postos_atendimento pa
    WHERE pa.id = v_pa_id AND pa.cooperativa_id = v_cooperative_id AND pa.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Hierarquia PA/Cooperativa inválida para o orçamento.' USING ERRCODE = '23514';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.quote_items qi
    JOIN public.quote_item_personalizations qip ON qip.quote_item_id = qi.id
    WHERE qi.quote_id = p_quote_id
  ) INTO v_requires_artwork;

  SELECT
    COALESCE(sum(round((qi.quantity * qi.unit_price)::numeric, 2)), 0),
    COALESCE(sum((
      SELECT COALESCE(sum(round(COALESCE(qip.total_cost, 0)::numeric, 2)), 0)
      FROM public.quote_item_personalizations qip
      WHERE qip.quote_item_id = qi.id
    )), 0)
  INTO v_merchandise, v_personalization
  FROM public.quote_items qi
  WHERE qi.quote_id = p_quote_id;

  v_base := round(v_merchandise + v_personalization, 2);
  v_markup_percent := COALESCE(v_quote.negotiation_markup_percent, 0);
  IF v_markup_percent < 0 OR v_markup_percent > 50 THEN
    RAISE EXCEPTION 'Markup do orçamento fora do intervalo permitido.' USING ERRCODE = '23514';
  END IF;
  v_markup_amount := round(v_base * v_markup_percent / 100, 2);
  v_commercial_subtotal := round(v_base + v_markup_amount, 2);

  IF COALESCE(v_quote.discount_percent, 0) < 0 OR COALESCE(v_quote.discount_percent, 0) > 100 THEN
    RAISE EXCEPTION 'Percentual de desconto do orçamento inválido.' USING ERRCODE = '23514';
  END IF;
  v_discount_amount := CASE
    WHEN COALESCE(v_quote.discount_percent, 0) > 0
      THEN round(v_commercial_subtotal * v_quote.discount_percent / 100, 2)
    ELSE round(COALESCE(v_quote.discount_amount, 0), 2)
  END;
  IF v_discount_amount < 0 OR v_discount_amount > v_commercial_subtotal THEN
    RAISE EXCEPTION 'Desconto do orçamento excede o subtotal comercial.' USING ERRCODE = '23514';
  END IF;

  v_shipping_amount := CASE
    WHEN v_quote.shipping_type IN ('fob', 'fob_pre') THEN round(COALESCE(v_quote.shipping_cost, 0), 2)
    ELSE 0
  END;
  IF v_shipping_amount < 0 THEN
    RAISE EXCEPTION 'Frete do orçamento inválido.' USING ERRCODE = '23514';
  END IF;
  v_expected_total := round(v_commercial_subtotal - v_discount_amount + v_shipping_amount, 2);

  IF abs(COALESCE(v_quote.real_subtotal, v_base) - v_base) > 0.01
     OR abs(COALESCE(v_quote.subtotal, v_commercial_subtotal) - v_commercial_subtotal) > 0.01
     OR abs(COALESCE(v_quote.discount_amount, v_discount_amount) - v_discount_amount) > 0.01
     OR abs(COALESCE(v_quote.total, v_expected_total) - v_expected_total) > 0.01 THEN
    RAISE EXCEPTION 'Totais persistidos do orçamento divergem da fórmula comercial brl-v1.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.sicoob_orders(
    cooperative_id, pa_id, created_by, status, total_amount, notes,
    source_quote_id, source_quote_snapshot, requires_artwork,
    merchandise_amount, personalization_amount, negotiation_markup_amount,
    commercial_subtotal_amount, discount_amount, shipping_amount, pricing_formula_version
  ) VALUES (
    v_cooperative_id, v_pa_id, v_actor, 'pending', v_expected_total, v_quote.notes,
    p_quote_id,
    jsonb_build_object(
      'quote_number', v_quote.quote_number,
      'client_id', v_quote.client_id,
      'client_name', v_quote.client_name,
      'client_email', v_quote.client_email,
      'client_phone', v_quote.client_phone,
      'client_company', v_quote.client_company,
      'client_cnpj', v_quote.client_cnpj,
      'subtotal', v_quote.subtotal,
      'real_subtotal', v_quote.real_subtotal,
      'discount_percent', v_quote.discount_percent,
      'discount_amount', v_quote.discount_amount,
      'negotiation_markup_percent', v_quote.negotiation_markup_percent,
      'shipping_cost', v_quote.shipping_cost,
      'shipping_type', v_quote.shipping_type,
      'payment_terms', v_quote.payment_terms,
      'delivery_time', v_quote.delivery_time,
      'pricing_formula_version', 'brl-v1',
      'converted_at', clock_timestamp()
    ),
    v_requires_artwork,
    v_merchandise, v_personalization, v_markup_amount,
    v_commercial_subtotal, v_discount_amount, v_shipping_amount, 'brl-v1'
  ) RETURNING * INTO v_order;

  INSERT INTO public.sicoob_order_items(
    order_id, product_id, product_name, product_sku, product_image_url,
    variant_id, variant_sku, color_name, color_hex, size_code,
    personalization_snapshot, quantity, unit_price, total_price, personalization_amount
  )
  SELECT v_order.id,
    CASE WHEN qi.product_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN qi.product_id::uuid END,
    qi.product_name, qi.product_sku, qi.product_image_url,
    CASE WHEN qi.source_variant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN qi.source_variant_id::uuid END,
    qi.source_variant_sku, qi.color_name, qi.color_hex, qi.size_code,
    jsonb_build_object(
      'source_quote_item_id', qi.id,
      'source_product_id', qi.product_id,
      'notes', qi.notes,
      'personalizations', COALESCE((
        SELECT jsonb_agg(to_jsonb(qip) - 'quote_item_id' ORDER BY qip.created_at, qip.id)
        FROM public.quote_item_personalizations qip
        WHERE qip.quote_item_id = qi.id
      ), '[]'::jsonb)
    ),
    qi.quantity, qi.unit_price, round((qi.quantity * qi.unit_price)::numeric, 2),
    (SELECT COALESCE(sum(round(COALESCE(qip.total_cost, 0)::numeric, 2)), 0)
     FROM public.quote_item_personalizations qip WHERE qip.quote_item_id = qi.id)
  FROM public.quote_items qi
  WHERE qi.quote_id = p_quote_id
  ORDER BY COALESCE(qi.display_order, qi.sort_order, 0), qi.id;

  INSERT INTO public.sicoob_order_history(order_id, user_id, previous_status, new_status, comment)
  VALUES (v_order.id, v_actor, NULL, 'pending', 'Pedido criado a partir de orçamento aprovado.');

  UPDATE public.quotes
  SET status = 'converted', updated_at = clock_timestamp()
  WHERE quotes.id = p_quote_id;

  RETURN QUERY SELECT v_order.id, v_order.order_number, v_order.status, v_order.total_amount;
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_quote_to_sicoob_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_sicoob_order(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.require_sicoob_artwork_before_production()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status IN ('logistic', 'in_production')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND (
       NEW.requires_artwork IS TRUE
       OR NEW.is_pilot_order IS TRUE
       OR EXISTS (SELECT 1 FROM public.sicoob_order_artwork_versions a WHERE a.order_id = NEW.id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.sicoob_order_artwork_versions a
       WHERE a.order_id = NEW.id AND a.is_latest AND a.status = 'approved'
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A versão vigente da arte precisa estar aprovada antes da produção.';
  END IF;
  RETURN NEW;
END;
$function$;
