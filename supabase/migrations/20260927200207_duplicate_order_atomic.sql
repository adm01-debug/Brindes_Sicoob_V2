-- S23: duplicação de pedido integral, idempotente e com totais recalculados.
-- Também reconcilia os contratos de status e o vínculo real de order_items,
-- que impediam a criação/atualização coerente do modelo legado de pedidos.

DROP POLICY IF EXISTS "users_read_own_order_items" ON public.order_items;
DROP POLICY IF EXISTS order_items_delete_scope ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_scope ON public.order_items;
DROP POLICY IF EXISTS order_items_select_scope ON public.order_items;
DROP POLICY IF EXISTS order_items_update_scope ON public.order_items;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_order_id_fkey_uuid;

ALTER TABLE public.order_items
  ALTER COLUMN order_id TYPE uuid USING order_id::uuid,
  ALTER COLUMN order_id SET NOT NULL;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

CREATE POLICY order_items_delete_scope ON public.order_items
  FOR DELETE TO authenticated
  USING (
    public.can_view_all_sales()
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id AND o.seller_id = auth.uid()
    )
  );

CREATE POLICY order_items_insert_scope ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_view_all_sales()
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id AND o.seller_id = auth.uid()
    )
  );

CREATE POLICY order_items_select_scope ON public.order_items
  FOR SELECT TO authenticated
  USING (
    public.can_view_all_sales()
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id
         AND (
           o.seller_id = auth.uid()
           OR (
             public.has_role(auth.uid(), 'supervisor'::public.app_role)
             AND (o.organization_id IS NULL OR o.organization_id IN (
               SELECT public.get_user_org_ids(auth.uid())
             ))
           )
         )
    )
  );

CREATE POLICY order_items_update_scope ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    public.can_view_all_sales()
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id
         AND (
           o.seller_id = auth.uid()
           OR (
             public.has_role(auth.uid(), 'supervisor'::public.app_role)
             AND (o.organization_id IS NULL OR o.organization_id IN (
               SELECT public.get_user_org_ids(auth.uid())
             ))
           )
         )
    )
  )
  WITH CHECK (
    public.can_view_all_sales()
    OR EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id
         AND (
           o.seller_id = auth.uid()
           OR (
             public.has_role(auth.uid(), 'supervisor'::public.app_role)
             AND (o.organization_id IS NULL OR o.organization_id IN (
               SELECT public.get_user_org_ids(auth.uid())
             ))
           )
         )
    )
  );

ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'rascunho',
  ALTER COLUMN fulfillment_status SET DEFAULT 'unfulfilled',
  DROP CONSTRAINT IF EXISTS orders_status_check,
  DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'rascunho', 'enviado_gestor', 'aprovado_gestor', 'enviado_vendedor',
    'em_producao', 'em_separacao', 'em_transporte', 'entregue',
    'concluido', 'cancelado'
  )),
  ADD CONSTRAINT orders_fulfillment_status_check CHECK (
    fulfillment_status IN ('unfulfilled', 'partially_fulfilled', 'fulfilled')
  );

CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_uidx
  ON public.orders (order_number);

CREATE OR REPLACE FUNCTION public.validate_status_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'quotes' AND NEW.status NOT IN (
    'draft', 'pending', 'sent', 'approved', 'rejected', 'expired',
    'revision', 'pending_approval', 'pending_singular_approval',
    'approved_singular', 'rejected_singular', 'converted', 'viewed'
  ) THEN
    RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN (
      'rascunho', 'enviado_gestor', 'aprovado_gestor', 'enviado_vendedor',
      'em_producao', 'em_separacao', 'em_transporte', 'entregue',
      'concluido', 'cancelado'
    ) THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled', 'partially_fulfilled', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'custom_kits'
     AND NEW.status NOT IN ('draft', 'ready', 'shared', 'archived') THEN
    RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
  END IF;

  IF TG_TABLE_NAME = 'kit_share_tokens'
     AND NEW.status NOT IN ('active', 'expired', 'responded', 'revoked') THEN
    RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
  END IF;

  IF TG_TABLE_NAME = 'quote_approval_tokens'
     AND NEW.status NOT IN ('active', 'expired', 'responded') THEN
    RAISE EXCEPTION 'Invalid approval token status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_main_order_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_transitions jsonb := '{
    "rascunho": ["enviado_gestor", "cancelado"],
    "enviado_gestor": ["aprovado_gestor", "rascunho", "cancelado"],
    "aprovado_gestor": ["enviado_vendedor", "cancelado"],
    "enviado_vendedor": ["em_producao", "cancelado"],
    "em_producao": ["em_separacao", "cancelado"],
    "em_separacao": ["em_transporte", "cancelado"],
    "em_transporte": ["entregue", "cancelado"],
    "entregue": ["concluido", "cancelado"],
    "concluido": [],
    "cancelado": []
  }'::jsonb;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    v_transitions ? OLD.status
    AND NEW.status = ANY (ARRAY(
      SELECT jsonb_array_elements_text(v_transitions -> OLD.status)
    ))
  ) THEN
    RAISE EXCEPTION 'Transição de status inválida no workflow: de % para %',
      OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_order_fulfillment_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF OLD.fulfillment_status IS NOT DISTINCT FROM NEW.fulfillment_status THEN
    RETURN NEW;
  END IF;

  IF (OLD.fulfillment_status = 'unfulfilled'
      AND NEW.fulfillment_status NOT IN ('partially_fulfilled', 'fulfilled'))
     OR (OLD.fulfillment_status = 'partially_fulfilled'
         AND NEW.fulfillment_status <> 'fulfilled')
     OR OLD.fulfillment_status = 'fulfilled' THEN
    RAISE EXCEPTION 'Transição de fulfillment inválida: % -> %',
      OLD.fulfillment_status, NEW.fulfillment_status;
  END IF;

  RETURN NEW;
END;
$function$;

-- Remove validadores/auditores duplicados e obsoletos. O trigger canônico
-- tr_validate_order_fulfillment e trg_log_order_status_change permanecem.
DROP TRIGGER IF EXISTS tr_check_fulfillment_transition ON public.orders;
DROP TRIGGER IF EXISTS tr_audit_order_status ON public.orders;
DROP TRIGGER IF EXISTS tr_audit_order_status_change ON public.orders;

CREATE TABLE IF NOT EXISTS public.order_duplicate_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  duplicated_order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_duplicate_requests_actor_source_key_key
    UNIQUE (actor_id, source_order_id, idempotency_key)
);

ALTER TABLE public.order_duplicate_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_duplicate_requests FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_order_audit_event(
  p_order_id uuid,
  p_event_type text,
  p_description text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT auth.uid(),
  p_created_by_name text DEFAULT NULL,
  p_category text DEFAULT 'general',
  p_observations text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_actor_name text;
  v_actor_role text;
  v_event_category text;
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Autenticação obrigatória.';
  END IF;

  IF p_created_by IS NOT NULL AND p_created_by <> v_actor AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Ator de auditoria inválido.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.orders o
     WHERE o.id = p_order_id
       AND (
         o.seller_id = v_actor
         OR public.can_view_all_sales(v_actor)
         OR (
           public.has_role(v_actor, 'supervisor'::public.app_role)
           AND (o.organization_id IS NULL OR o.organization_id IN (
             SELECT public.get_user_org_ids(v_actor)
           ))
         )
       )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Pedido inexistente ou sem acesso.';
  END IF;

  SELECT COALESCE(p_created_by_name, p.full_name, p.email, 'Usuário'), p.role
    INTO v_actor_name, v_actor_role
    FROM public.profiles p
   WHERE p.user_id = v_actor
   LIMIT 1;

  v_actor_name := COALESCE(v_actor_name, p_created_by_name, 'Usuário');
  v_event_category := CASE
    WHEN p_category IN ('status', 'logistics', 'invoice', 'payment', 'pilot', 'comment', 'system')
      THEN p_category
    WHEN p_event_type IN ('status_change', 'status_changed') THEN 'status'
    ELSE 'system'
  END;

  INSERT INTO public.order_audit_events (
    order_id, event_type, event_category, actor_id, actor_name, actor_role,
    description, metadata, created_by_name, category, observations
  ) VALUES (
    p_order_id, p_event_type, v_event_category, v_actor, v_actor_name, v_actor_role,
    p_description, COALESCE(p_metadata, '{}'::jsonb), v_actor_name,
    p_category, p_observations
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_order_audit_event(
  uuid, text, text, jsonb, uuid, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_order_audit_event(
  uuid, text, text, jsonb, uuid, text, text, text
) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.duplicate_order_atomic(
  p_order_id uuid,
  p_idempotency_key uuid
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_source public.orders%ROWTYPE;
  v_created public.orders%ROWTYPE;
  v_existing_order_id uuid;
  v_item_count integer;
  v_subtotal numeric;
  v_discount numeric;
  v_shipping numeric;
  v_total numeric;
  v_actor_name text;
  v_actor_role text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '28000', MESSAGE = 'Autenticação obrigatória.';
  END IF;
  IF p_order_id IS NULL OR p_idempotency_key IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22004', MESSAGE = 'Pedido e chave de idempotência são obrigatórios.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_actor::text || ':' || p_order_id::text || ':' || p_idempotency_key::text,
    0
  ));

  SELECT r.duplicated_order_id
    INTO v_existing_order_id
    FROM public.order_duplicate_requests r
   WHERE r.actor_id = v_actor
     AND r.source_order_id = p_order_id
     AND r.idempotency_key = p_idempotency_key;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN QUERY SELECT o.* FROM public.orders o WHERE o.id = v_existing_order_id;
    RETURN;
  END IF;

  SELECT o.*
    INTO v_source
    FROM public.orders o
   WHERE o.id = p_order_id
     AND (
       o.seller_id = v_actor
       OR public.can_view_all_sales(v_actor)
       OR (
         public.has_role(v_actor, 'supervisor'::public.app_role)
         AND (o.organization_id IS NULL OR o.organization_id IN (
           SELECT public.get_user_org_ids(v_actor)
         ))
       )
     )
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Pedido inexistente ou sem acesso.';
  END IF;

  SELECT count(*)::integer,
         round(COALESCE(sum(oi.quantity * oi.unit_price), 0), 2)
    INTO v_item_count, v_subtotal
    FROM public.order_items oi
   WHERE oi.order_id = p_order_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido de origem não possui itens.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.order_items oi
     WHERE oi.order_id = p_order_id
       AND (oi.quantity IS NULL OR oi.quantity <= 0 OR oi.unit_price IS NULL OR oi.unit_price < 0)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido de origem possui item com quantidade ou preço inválido.';
  END IF;

  v_discount := round(COALESCE(v_source.discount_amount, 0), 2);
  v_shipping := round(COALESCE(v_source.shipping_cost, 0), 2);
  IF v_discount < 0 OR v_discount > v_subtotal OR v_shipping < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Desconto ou frete inválido no pedido de origem.';
  END IF;
  v_total := round(v_subtotal - v_discount + v_shipping, 2);

  INSERT INTO public.orders (
    seller_id, order_number, status, fulfillment_status,
    client_id, client_name, client_email, client_phone, client_company,
    quote_id, subtotal, discount_amount, shipping_cost, total,
    notes, internal_notes, shipping_type, payment_terms, delivery_time,
    organization_id, version
  ) VALUES (
    v_actor,
    'RE-' || regexp_replace(v_source.order_number, '[^[:alnum:]-]', '', 'g')
      || '-' || upper(substr(gen_random_uuid()::text, 1, 8)),
    'rascunho', 'unfulfilled',
    v_source.client_id, v_source.client_name, v_source.client_email,
    v_source.client_phone, v_source.client_company, v_source.quote_id,
    v_subtotal, v_discount, v_shipping, v_total,
    v_source.notes, v_source.internal_notes, v_source.shipping_type,
    v_source.payment_terms, v_source.delivery_time,
    v_source.organization_id, 1
  )
  RETURNING * INTO v_created;

  INSERT INTO public.order_items (
    order_id, product_id, product_sku, product_name, product_image_url,
    quantity, unit_price, organization_id
  )
  SELECT v_created.id, oi.product_id, oi.product_sku, oi.product_name,
         oi.product_image_url, oi.quantity, oi.unit_price, v_source.organization_id
    FROM public.order_items oi
   WHERE oi.order_id = p_order_id
   ORDER BY oi.created_at, oi.id;

  INSERT INTO public.order_logistics (
    order_id, carrier_name, delivery_status, notes
  )
  SELECT v_created.id, ol.carrier_name, 'pending', ol.notes
    FROM public.order_logistics ol
   WHERE ol.order_id = p_order_id
   ORDER BY ol.created_at, ol.id;

  SELECT COALESCE(p.full_name, p.email, 'Usuário'), p.role
    INTO v_actor_name, v_actor_role
    FROM public.profiles p
   WHERE p.user_id = v_actor
   LIMIT 1;

  INSERT INTO public.order_audit_events (
    order_id, event_type, event_category, actor_id, actor_name, actor_role,
    description, metadata, created_by_name, category
  ) VALUES (
    v_created.id, 'ORDER_DUPLICATED', 'system', v_actor,
    COALESCE(v_actor_name, 'Usuário'), v_actor_role,
    format('Pedido duplicado a partir do pedido #%s', v_source.order_number),
    jsonb_build_object(
      'original_order_id', p_order_id,
      'idempotency_key', p_idempotency_key,
      'recalculated_subtotal', v_subtotal,
      'recalculated_total', v_total
    ),
    COALESCE(v_actor_name, 'Usuário'), 'system'
  );

  INSERT INTO public.order_duplicate_requests (
    actor_id, source_order_id, idempotency_key, duplicated_order_id
  ) VALUES (
    v_actor, p_order_id, p_idempotency_key, v_created.id
  );

  RETURN NEXT v_created;
  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.duplicate_order_atomic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_order_atomic(uuid, uuid)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.duplicate_order_atomic(uuid, uuid) IS
  'Duplica cabeçalho, itens, logística e auditoria em uma transação idempotente; recalcula os totais no servidor.';
