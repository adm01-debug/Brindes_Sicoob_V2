-- Recompra Sicoob com validade explícita da consulta ao catálogo.
-- O estoque permanece exclusivamente informativo: esta migration não escreve
-- no catálogo mestre e não apresenta a consulta como reserva do fornecedor.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS reorder_source_order_id uuid REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS reorder_source_quote_id uuid REFERENCES public.quotes(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS catalog_revalidated_at timestamptz,
  ADD COLUMN IF NOT EXISTS catalog_valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS catalog_stock_is_reserved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reorder_price_changed_items integer NOT NULL DEFAULT 0;

ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_reorder_single_source_check,
  ADD CONSTRAINT quotes_reorder_single_source_check CHECK (
    reorder_source_order_id IS NULL OR reorder_source_quote_id IS NULL
  ),
  DROP CONSTRAINT IF EXISTS quotes_catalog_validity_check,
  ADD CONSTRAINT quotes_catalog_validity_check CHECK (
    catalog_valid_until IS NULL
    OR (catalog_revalidated_at IS NOT NULL AND catalog_valid_until > catalog_revalidated_at)
  ),
  DROP CONSTRAINT IF EXISTS quotes_catalog_not_reservation_check,
  ADD CONSTRAINT quotes_catalog_not_reservation_check CHECK (catalog_stock_is_reserved IS FALSE),
  DROP CONSTRAINT IF EXISTS quotes_reorder_price_changes_check,
  ADD CONSTRAINT quotes_reorder_price_changes_check CHECK (reorder_price_changed_items >= 0);

CREATE INDEX IF NOT EXISTS idx_quotes_reorder_source_order
  ON public.quotes (reorder_source_order_id)
  WHERE reorder_source_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_reorder_source_quote
  ON public.quotes (reorder_source_quote_id)
  WHERE reorder_source_quote_id IS NOT NULL;

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS catalog_available_stock integer,
  ADD COLUMN IF NOT EXISTS catalog_minimum_quantity integer,
  ADD COLUMN IF NOT EXISTS catalog_valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS historical_unit_price numeric(14,4),
  ADD COLUMN IF NOT EXISTS price_changed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_stock_is_reserved boolean NOT NULL DEFAULT false;

ALTER TABLE public.quote_items
  DROP CONSTRAINT IF EXISTS quote_items_catalog_stock_check,
  ADD CONSTRAINT quote_items_catalog_stock_check CHECK (
    catalog_available_stock IS NULL OR catalog_available_stock >= 0
  ),
  DROP CONSTRAINT IF EXISTS quote_items_catalog_minimum_check,
  ADD CONSTRAINT quote_items_catalog_minimum_check CHECK (
    catalog_minimum_quantity IS NULL OR catalog_minimum_quantity > 0
  ),
  DROP CONSTRAINT IF EXISTS quote_items_historical_price_check,
  ADD CONSTRAINT quote_items_historical_price_check CHECK (
    historical_unit_price IS NULL OR historical_unit_price >= 0
  ),
  DROP CONSTRAINT IF EXISTS quote_items_catalog_not_reservation_check,
  ADD CONSTRAINT quote_items_catalog_not_reservation_check CHECK (catalog_stock_is_reserved IS FALSE);

CREATE TABLE IF NOT EXISTS public.sicoob_quote_reorder_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  source_quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, source_quote_id, idempotency_key),
  CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  CHECK (payload_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS idx_sicoob_quote_reorder_requests_source
  ON public.sicoob_quote_reorder_requests (source_quote_id, created_at DESC);

ALTER TABLE public.sicoob_quote_reorder_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Usuário consulta as próprias recompras de orçamento Sicoob"
  ON public.sicoob_quote_reorder_requests;
CREATE POLICY "Usuário consulta as próprias recompras de orçamento Sicoob"
ON public.sicoob_quote_reorder_requests
FOR SELECT TO authenticated
USING (actor_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.sicoob_quote_reorder_requests FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.sicoob_assert_current_reorder_items(p_items jsonb)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_item jsonb;
  v_checked_at timestamptz;
  v_valid_until timestamptz;
  v_earliest_valid_until timestamptz;
  v_personalization jsonb;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve conter entre 1 e 100 itens.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item ->> 'source_order_item_id', '') IS NULL
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'minimum_quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'available_stock')::integer, -1) < 0
       OR COALESCE((v_item ->> 'stock_is_reserved')::boolean, true) IS NOT FALSE THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item revalidado da recompra inválido.';
    END IF;
    IF (v_item ->> 'quantity')::integer < (v_item ->> 'minimum_quantity')::integer
       OR (v_item ->> 'quantity')::integer > (v_item ->> 'available_stock')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade fora do mínimo ou estoque informado pelo catálogo.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    v_valid_until := NULLIF(v_item ->> 'catalog_valid_until', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < statement_timestamp() - interval '5 minutes'
       OR v_checked_at > statement_timestamp() + interval '1 minute'
       OR v_valid_until IS NULL
       OR v_valid_until <= statement_timestamp()
       OR v_valid_until > v_checked_at + interval '5 minutes 1 second' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;
    v_earliest_valid_until := LEAST(COALESCE(v_earliest_valid_until, v_valid_until), v_valid_until);

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
         OR v_checked_at < statement_timestamp() - interval '5 minutes'
         OR v_checked_at > statement_timestamp() + interval '1 minute' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
      END IF;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        COALESCE(NULLIF(item ->> 'source_variant_id', ''), item ->> 'product_id') AS stock_key,
        sum((item ->> 'quantity')::integer) AS requested,
        min((item ->> 'available_stock')::integer) AS available
      FROM jsonb_array_elements(p_items) AS source(item)
      GROUP BY 1
    ) AS demand
    WHERE requested > available
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Estoque agregado insuficiente para a recompra.';
  END IF;

  RETURN v_earliest_valid_until;
END;
$function$;

REVOKE ALL ON FUNCTION public.sicoob_assert_current_reorder_items(jsonb) FROM PUBLIC, anon, authenticated;

-- Preserva a RPC anterior como implementação transacional já homologada e a
-- envolve com os novos snapshots. A nova assinatura pública permanece igual.
ALTER FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text)
  RENAME TO reorder_sicoob_order_as_quote_legacy_20260927;
REVOKE ALL ON FUNCTION public.reorder_sicoob_order_as_quote_legacy_20260927(uuid, jsonb, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_sicoob_order_as_quote_legacy_20260927(uuid, jsonb, text, uuid, text)
  TO service_role;

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
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_quote_id uuid;
  v_valid_until timestamptz;
BEGIN
  v_valid_until := public.sicoob_assert_current_reorder_items(p_items);
  v_quote_id := public.reorder_sicoob_order_as_quote_legacy_20260927(
    p_order_id, p_items, p_idempotency_key, p_actor_id, p_request_hash
  );

  IF EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = v_quote_id AND q.catalog_revalidated_at IS NULL
  ) THEN
    UPDATE public.quotes q
    SET reorder_source_order_id = p_order_id,
        catalog_revalidated_at = statement_timestamp(),
        catalog_valid_until = v_valid_until,
        catalog_stock_is_reserved = false,
        reorder_price_changed_items = (
          SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
          WHERE COALESCE((item ->> 'price_changed')::boolean, false)
        )
    WHERE q.id = v_quote_id;

    UPDATE public.quote_items qi
    SET catalog_available_stock = (source.item ->> 'available_stock')::integer,
        catalog_minimum_quantity = (source.item ->> 'minimum_quantity')::integer,
        catalog_valid_until = (source.item ->> 'catalog_valid_until')::timestamptz,
        historical_unit_price = NULLIF(source.item ->> 'historical_unit_price', '')::numeric,
        price_changed = COALESCE((source.item ->> 'price_changed')::boolean, false),
        catalog_stock_is_reserved = false
    FROM jsonb_array_elements(p_items) WITH ORDINALITY AS source(item, ordinality)
    WHERE qi.quote_id = v_quote_id
      AND COALESCE(qi.sort_order, 0) = source.ordinality::integer - 1;
  END IF;

  RETURN v_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.get_sicoob_quote_reorder_idempotency(
  p_actor_id uuid,
  p_quote_id uuid,
  p_idempotency_key text,
  p_request_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_existing public.sicoob_quote_reorder_requests%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_quote_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de recompra inválida.';
  END IF;
  SELECT * INTO v_existing
  FROM public.sicoob_quote_reorder_requests
  WHERE actor_id = p_actor_id
    AND source_quote_id = p_quote_id
    AND idempotency_key = trim(p_idempotency_key);
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
  END IF;
  RETURN v_existing.quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_sicoob_quote_reorder_idempotency(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_quote_reorder_idempotency(uuid, uuid, text, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.reorder_sicoob_quote_as_quote(
  p_quote_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_actor_id uuid,
  p_request_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_source public.quotes%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_quote_reorder_requests%ROWTYPE;
  v_item jsonb;
  v_source_item public.quote_items%ROWTYPE;
  v_quote_id uuid;
  v_quote_item_id uuid;
  v_personalization jsonb;
  v_total numeric(14,2) := 0;
  v_sort_order integer := 0;
  v_valid_until timestamptz;
BEGIN
  IF p_actor_id IS NULL OR p_quote_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de recompra inválidos.';
  END IF;
  v_valid_until := public.sicoob_assert_current_reorder_items(p_items);

  SELECT * INTO v_source FROM public.quotes q WHERE q.id = p_quote_id FOR SHARE;
  IF NOT FOUND OR v_source.status::text NOT IN ('approved', 'approved_singular', 'converted')
     OR COALESCE(v_source.is_latest_version, true) IS NOT TRUE
     OR v_source.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente orçamento aprovado e vigente pode iniciar uma recompra.';
  END IF;
  IF v_source.seller_id IS DISTINCT FROM p_actor_id
     AND NOT public.can_manage_quote_scope(p_actor_id, p_quote_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode refazer este orçamento.';
  END IF;
  SELECT * INTO v_profile FROM public.profiles
  WHERE user_id = p_actor_id AND is_active IS TRUE AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;
  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.quote_items WHERE quote_id = p_quote_id
     ) OR jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(DISTINCT item ->> 'source_order_item_id')::integer
       FROM jsonb_array_elements(p_items) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve representar cada item do orçamento uma única vez.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_actor_id::text || ':' || p_quote_id::text || ':' || trim(p_idempotency_key), 0
  ));
  SELECT * INTO v_existing FROM public.sicoob_quote_reorder_requests
  WHERE actor_id = p_actor_id AND source_quote_id = p_quote_id
    AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    RETURN v_existing.quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_source_item FROM public.quote_items
    WHERE id = (v_item ->> 'source_order_item_id')::uuid AND quote_id = p_quote_id;
    IF NOT FOUND
       OR v_source_item.product_id IS DISTINCT FROM (v_item ->> 'product_id')
       OR v_source_item.quantity IS DISTINCT FROM (v_item ->> 'quantity')::integer
       OR NULLIF(v_source_item.source_variant_id, '') IS DISTINCT FROM NULLIF(v_item ->> 'source_variant_id', '') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O item não corresponde ao orçamento de origem.';
    END IF;
    v_total := v_total + (v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric;
    SELECT v_total + COALESCE(sum((personalization ->> 'total_cost')::numeric), 0)
      INTO v_total
      FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) source(personalization);
  END LOOP;

  PERFORM set_config('app.sicoob_reorder_operation', 'create', true);
  INSERT INTO public.quotes (
    client_id, client_name, client_email, client_phone, client_company, client_cnpj,
    seller_id, status, subtotal, total, notes, organization_id, pa_id, singular_id,
    payment_terms, delivery_time, shipping_type, shipping_cost, valid_until,
    reorder_source_quote_id, catalog_revalidated_at, catalog_valid_until,
    catalog_stock_is_reserved, reorder_price_changed_items
  ) VALUES (
    v_source.client_id, v_source.client_name, v_source.client_email, v_source.client_phone,
    v_source.client_company, v_source.client_cnpj, p_actor_id, 'draft', v_total, v_total,
    format('Recompra do orçamento Sicoob #%s. Preço, mínimo e estoque reconsultados; disponibilidade não reservada.', v_source.quote_number),
    COALESCE(v_profile.organization_id, v_source.organization_id), v_source.pa_id, v_source.singular_id,
    v_source.payment_terms, v_source.delivery_time, v_source.shipping_type, v_source.shipping_cost,
    CURRENT_DATE + 7, p_quote_id, statement_timestamp(), v_valid_until, false,
    (SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
     WHERE COALESCE((item ->> 'price_changed')::boolean, false))
  ) RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code,
      source_variant_id, source_variant_sku, catalog_checked_at, sort_order,
      catalog_available_stock, catalog_minimum_quantity, catalog_valid_until,
      historical_unit_price, price_changed, catalog_stock_is_reserved
    ) VALUES (
      v_quote_id, v_item ->> 'product_id', v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''), NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer, (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''), NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''), NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''), (v_item ->> 'catalog_checked_at')::timestamptz,
      v_sort_order, (v_item ->> 'available_stock')::integer,
      (v_item ->> 'minimum_quantity')::integer, (v_item ->> 'catalog_valid_until')::timestamptz,
      NULLIF(v_item ->> 'historical_unit_price', '')::numeric,
      COALESCE((v_item ->> 'price_changed')::boolean, false), false
    ) RETURNING id INTO v_quote_item_id;

    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count, width_cm, height_cm,
        personalized_quantity, unit_cost, setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id, v_personalization ->> 'technique_id', v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        'Arte histórica copiada como referência; exige nova validação de marca.',
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END LOOP;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_quote_reorder_requests (
    actor_id, source_quote_id, idempotency_key, payload_hash, quote_id
  ) VALUES (p_actor_id, p_quote_id, trim(p_idempotency_key), p_request_hash, v_quote_id);

  INSERT INTO public.quote_history (quote_id, user_id, action, description, metadata)
  VALUES (
    v_quote_id, p_actor_id, 'created', 'Recompra criada com nova consulta ao catálogo.',
    jsonb_build_object(
      'source_quote_id', p_quote_id,
      'catalog_valid_until', v_valid_until,
      'stock_is_reserved', false
    )
  );
  RETURN v_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reorder_sicoob_quote_as_quote(uuid, jsonb, text, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_sicoob_quote_as_quote(uuid, jsonb, text, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_sicoob_reorder_quote(
  p_quote_id uuid,
  p_items jsonb,
  p_actor_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_item jsonb;
  v_source_item_id uuid;
  v_target_item public.quote_items%ROWTYPE;
  v_personalization jsonb;
  v_total numeric(14,2) := 0;
  v_sort_order integer := 0;
  v_valid_until timestamptz;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  v_valid_until := public.sicoob_assert_current_reorder_items(p_items);
  SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_id FOR UPDATE;
  IF NOT FOUND OR (v_quote.reorder_source_order_id IS NULL AND v_quote.reorder_source_quote_id IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento de recompra não encontrado.';
  END IF;
  IF v_quote.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A recompra não pode mais ser revalidada neste estado.';
  END IF;
  IF v_quote.seller_id IS DISTINCT FROM p_actor_id
     AND NOT public.can_manage_quote_scope(p_actor_id, p_quote_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode revalidar esta recompra.';
  END IF;
  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.quote_items WHERE quote_id = p_quote_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A quantidade de itens mudou; crie uma nova recompra.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_source_item_id := (v_item ->> 'source_order_item_id')::uuid;
    IF v_quote.reorder_source_order_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.sicoob_order_items source_item
        WHERE source_item.id = v_source_item_id
          AND source_item.order_id = v_quote.reorder_source_order_id
          AND source_item.product_id::text = v_item ->> 'product_id'
          AND source_item.quantity = (v_item ->> 'quantity')::integer
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item divergente do pedido de origem.';
      END IF;
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM public.quote_items source_item
        WHERE source_item.id = v_source_item_id
          AND source_item.quote_id = v_quote.reorder_source_quote_id
          AND source_item.product_id = v_item ->> 'product_id'
          AND source_item.quantity = (v_item ->> 'quantity')::integer
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item divergente do orçamento de origem.';
      END IF;
    END IF;

    SELECT * INTO v_target_item FROM public.quote_items qi
    WHERE qi.quote_id = p_quote_id AND COALESCE(qi.sort_order, 0) = v_sort_order
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item de destino não encontrado.';
    END IF;

    UPDATE public.quote_items qi
    SET product_id = v_item ->> 'product_id',
        product_name = v_item ->> 'product_name',
        product_sku = NULLIF(v_item ->> 'product_sku', ''),
        product_image_url = NULLIF(v_item ->> 'product_image_url', ''),
        quantity = (v_item ->> 'quantity')::integer,
        unit_price = (v_item ->> 'unit_price')::numeric,
        color_name = NULLIF(v_item ->> 'color_name', ''),
        color_hex = NULLIF(v_item ->> 'color_hex', ''),
        size_code = NULLIF(v_item ->> 'size_code', ''),
        source_variant_id = NULLIF(v_item ->> 'source_variant_id', ''),
        source_variant_sku = NULLIF(v_item ->> 'source_variant_sku', ''),
        catalog_checked_at = (v_item ->> 'catalog_checked_at')::timestamptz,
        catalog_available_stock = (v_item ->> 'available_stock')::integer,
        catalog_minimum_quantity = (v_item ->> 'minimum_quantity')::integer,
        catalog_valid_until = (v_item ->> 'catalog_valid_until')::timestamptz,
        historical_unit_price = NULLIF(v_item ->> 'historical_unit_price', '')::numeric,
        price_changed = COALESCE((v_item ->> 'price_changed')::boolean, false),
        catalog_stock_is_reserved = false,
        updated_at = statement_timestamp()
    WHERE qi.id = v_target_item.id;

    DELETE FROM public.quote_item_personalizations WHERE quote_item_id = v_target_item.id;
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count, width_cm, height_cm,
        personalized_quantity, unit_cost, setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_target_item.id, v_personalization ->> 'technique_id', v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        'Arte histórica copiada como referência; exige nova validação de marca.',
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
      v_total := v_total + (v_personalization ->> 'total_cost')::numeric;
    END LOOP;
    v_total := v_total + (v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  UPDATE public.quotes q
  SET subtotal = v_total,
      total = v_total,
      catalog_revalidated_at = statement_timestamp(),
      catalog_valid_until = v_valid_until,
      catalog_stock_is_reserved = false,
      reorder_price_changed_items = (
        SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
        WHERE COALESCE((item ->> 'price_changed')::boolean, false)
      ),
      row_version = q.row_version + 1,
      updated_at = statement_timestamp()
  WHERE q.id = p_quote_id;

  INSERT INTO public.quote_history (quote_id, user_id, action, description, metadata)
  VALUES (
    p_quote_id, p_actor_id, 'updated', 'Preço, mínimo e estoque reconsultados para a recompra.',
    jsonb_build_object(
      'catalog_valid_until', v_valid_until,
      'price_changed_items', (
        SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
        WHERE COALESCE((item ->> 'price_changed')::boolean, false)
      ),
      'stock_is_reserved', false
    )
  );
  RETURN p_quote_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.refresh_sicoob_reorder_quote(uuid, jsonb, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sicoob_reorder_quote(uuid, jsonb, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.sicoob_guard_reorder_catalog_validity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF (OLD.reorder_source_order_id IS NOT NULL OR OLD.reorder_source_quote_id IS NOT NULL)
     AND NEW.status IS DISTINCT FROM OLD.status
     AND OLD.status::text IN ('draft', 'revision', 'rejected', 'rejected_singular')
     AND NEW.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular', 'expired')
     AND (
       OLD.catalog_valid_until IS NULL
       OR OLD.catalog_valid_until <= statement_timestamp()
       OR EXISTS (
         SELECT 1 FROM public.quote_items qi
         WHERE qi.quote_id = OLD.id
           AND (qi.catalog_valid_until IS NULL OR qi.catalog_valid_until <= statement_timestamp())
       )
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Preço e estoque da recompra venceram; revalide o catálogo antes de continuar.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tr_guard_sicoob_reorder_catalog_validity ON public.quotes;
CREATE TRIGGER tr_guard_sicoob_reorder_catalog_validity
BEFORE UPDATE OF status ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.sicoob_guard_reorder_catalog_validity();

UPDATE public.quotes q
SET reorder_source_order_id = request.source_order_id,
    catalog_revalidated_at = checks.checked_at,
    catalog_valid_until = checks.checked_at + interval '5 minutes',
    catalog_stock_is_reserved = false
FROM public.sicoob_reorder_requests request
CROSS JOIN LATERAL (
  SELECT min(qi.catalog_checked_at) AS checked_at
  FROM public.quote_items qi WHERE qi.quote_id = request.quote_id
) checks
WHERE q.id = request.quote_id
  AND q.reorder_source_order_id IS NULL
  AND checks.checked_at IS NOT NULL;

COMMENT ON COLUMN public.quotes.catalog_valid_until IS
  'Validade da consulta ao catálogo usada na recompra; não representa reserva de estoque.';
COMMENT ON COLUMN public.quotes.catalog_stock_is_reserved IS
  'Sempre false: o catálogo mestre é somente consulta e não reserva estoque.';
COMMENT ON FUNCTION public.refresh_sicoob_reorder_quote(uuid, jsonb, uuid) IS
  'RPC interna para reconsultar e substituir atomicamente preço, mínimo, estoque e personalização de uma recompra editável.';
