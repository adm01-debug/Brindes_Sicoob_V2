-- Recompra Sicoob atômica e idempotente. A Edge Function autenticada consulta
-- o catálogo externo e chama esta RPC interna com o ator validado. O navegador
-- não pode fornecer diretamente preço, disponibilidade ou timestamp.

ALTER TABLE public.sicoob_order_items
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS product_image_url text,
  ADD COLUMN IF NOT EXISTS variant_id text,
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS color_name text,
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS size_code text,
  ADD COLUMN IF NOT EXISTS personalization_snapshot jsonb;

ALTER TABLE public.quote_items
  ADD COLUMN IF NOT EXISTS source_variant_id text,
  ADD COLUMN IF NOT EXISTS source_variant_sku text,
  ADD COLUMN IF NOT EXISTS catalog_checked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sicoob_reorder_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  source_order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, source_order_id, idempotency_key),
  CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  CHECK (length(payload_hash) = 64)
);

CREATE INDEX IF NOT EXISTS idx_sicoob_reorder_requests_source
  ON public.sicoob_reorder_requests (source_order_id, created_at DESC);

ALTER TABLE public.sicoob_reorder_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário consulta as próprias recompras Sicoob" ON public.sicoob_reorder_requests;
CREATE POLICY "Usuário consulta as próprias recompras Sicoob"
ON public.sicoob_reorder_requests
FOR SELECT TO authenticated
USING (actor_id = auth.uid());

-- O gatilho legado deriva a hierarquia do vendedor. Durante a recompra, a RPC
-- já validou o pedido de origem e deve preservar a hierarquia desse pedido.
CREATE OR REPLACE FUNCTION public.set_quote_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pa_id uuid;
  v_cooperative_id uuid;
BEGIN
  IF current_setting('app.sicoob_reorder_operation', true) = 'create' THEN
    RETURN NEW;
  END IF;

  SELECT pa_id, cooperativa_id
    INTO v_pa_id, v_cooperative_id
    FROM public.profiles
   WHERE user_id = NEW.seller_id;

  NEW.pa_id := v_pa_id;
  NEW.singular_id := v_cooperative_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_quote_hierarchy() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.reorder_sicoob_order_as_quote(
  p_order_id uuid,
  p_items jsonb,
  p_idempotency_key text,
  p_actor_id uuid
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
  v_source_item public.sicoob_order_items%ROWTYPE;
  v_payload_hash text;
  v_quote_id uuid;
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

  v_payload_hash := encode(digest(p_items::text, 'sha256'), 'hex');
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

  INSERT INTO public.quote_items (
    quote_id, product_id, product_name, product_sku, product_image_url,
    quantity, unit_price, color_name, color_hex, size_code,
    source_variant_id, source_variant_sku, catalog_checked_at, sort_order
  )
  SELECT
    v_quote_id,
    item ->> 'product_id',
    item ->> 'product_name',
    NULLIF(item ->> 'product_sku', ''),
    NULLIF(item ->> 'product_image_url', ''),
    (item ->> 'quantity')::integer,
    (item ->> 'unit_price')::numeric,
    NULLIF(item ->> 'color_name', ''),
    NULLIF(item ->> 'color_hex', ''),
    NULLIF(item ->> 'size_code', ''),
    NULLIF(item ->> 'source_variant_id', ''),
    NULLIF(item ->> 'source_variant_sku', ''),
    (item ->> 'catalog_checked_at')::timestamptz,
    ordinality::integer - 1
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS source(item, ordinality);

  INSERT INTO public.sicoob_reorder_requests (
    actor_id, source_order_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    v_actor_id, p_order_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN v_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid) TO service_role;

COMMENT ON FUNCTION public.reorder_sicoob_order_as_quote(uuid, jsonb, text, uuid) IS
  'RPC interna: cria orçamento de recompra atômico com catálogo revalidado pela Edge Function.';
