-- Consolidação canônica: vínculo atômico de pedidos, distribuição por PA e
-- recebimento parcial por item. Substitui a função histórica que criava
-- somente um cabeçalho vazio.

ALTER TABLE public.order_consolidations
  ADD COLUMN IF NOT EXISTS idempotency_key uuid,
  ADD COLUMN IF NOT EXISTS received_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS ux_order_consolidations_idempotency
  ON public.order_consolidations(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.sicoob_orders
  ADD COLUMN IF NOT EXISTS consolidation_id uuid REFERENCES public.order_consolidations(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_orders_one_consolidation
  ON public.sicoob_orders(consolidation_id, id) WHERE consolidation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.order_consolidation_orders (
  consolidation_id uuid NOT NULL REFERENCES public.order_consolidations(id) ON DELETE RESTRICT,
  order_id uuid NOT NULL UNIQUE REFERENCES public.sicoob_orders(id) ON DELETE RESTRICT,
  order_total_snapshot numeric(14,2) NOT NULL CHECK (order_total_snapshot >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consolidation_id, order_id)
);

CREATE TABLE IF NOT EXISTS public.sicoob_delivery_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consolidation_id uuid NOT NULL REFERENCES public.order_consolidations(id) ON DELETE RESTRICT,
  pa_id uuid NOT NULL REFERENCES public.postos_atendimento(id) ON DELETE RESTRICT,
  destination_name text NOT NULL CHECK (length(trim(destination_name)) > 0),
  address_snapshot jsonb NOT NULL CHECK (jsonb_typeof(address_snapshot) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (consolidation_id, pa_id)
);

CREATE TABLE IF NOT EXISTS public.sicoob_delivery_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id uuid NOT NULL REFERENCES public.sicoob_delivery_destinations(id) ON DELETE RESTRICT,
  order_item_id uuid NOT NULL REFERENCES public.sicoob_order_items(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  damaged_quantity integer NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  missing_quantity integer NOT NULL DEFAULT 0 CHECK (missing_quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (destination_id, order_item_id),
  CHECK (received_quantity + damaged_quantity + missing_quantity <= quantity)
);

CREATE TABLE IF NOT EXISTS public.sicoob_delivery_receipt_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL,
  allocation_id uuid NOT NULL REFERENCES public.sicoob_delivery_allocations(id) ON DELETE RESTRICT,
  received_quantity integer NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
  damaged_quantity integer NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
  missing_quantity integer NOT NULL DEFAULT 0 CHECK (missing_quantity >= 0),
  notes text,
  received_by uuid NOT NULL REFERENCES auth.users(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK (received_quantity + damaged_quantity + missing_quantity > 0),
  CHECK ((damaged_quantity + missing_quantity = 0) OR length(trim(COALESCE(notes, ''))) >= 10)
);

ALTER TABLE public.sicoob_delivery_receipt_events
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;
UPDATE public.sicoob_delivery_receipt_events
   SET idempotency_key = gen_random_uuid()
 WHERE idempotency_key IS NULL;
ALTER TABLE public.sicoob_delivery_receipt_events
  ALTER COLUMN idempotency_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_delivery_receipt_idempotency
  ON public.sicoob_delivery_receipt_events(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_consolidation_orders_group ON public.order_consolidation_orders(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_destinations_group ON public.sicoob_delivery_destinations(consolidation_id);
CREATE INDEX IF NOT EXISTS idx_delivery_allocations_destination ON public.sicoob_delivery_allocations(destination_id);
CREATE INDEX IF NOT EXISTS idx_delivery_receipts_allocation ON public.sicoob_delivery_receipt_events(allocation_id, received_at);

ALTER TABLE public.order_consolidation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_delivery_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_delivery_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_delivery_receipt_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consolidation_orders_read_via_group" ON public.order_consolidation_orders
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.order_consolidations c WHERE c.id = consolidation_id)
);
CREATE POLICY "delivery_destinations_read_via_group" ON public.sicoob_delivery_destinations
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.order_consolidations c WHERE c.id = consolidation_id)
);
CREATE POLICY "delivery_allocations_read_via_destination" ON public.sicoob_delivery_allocations
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_delivery_destinations d
    JOIN public.order_consolidations c ON c.id = d.consolidation_id
    WHERE d.id = destination_id
  )
);
CREATE POLICY "delivery_receipts_read_via_allocation" ON public.sicoob_delivery_receipt_events
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
    JOIN public.order_consolidations c ON c.id = d.consolidation_id
    WHERE a.id = allocation_id
  )
);

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_consolidation(
  p_actor_id uuid,
  p_cooperative_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND p.is_active IS TRUE
      AND (p.deleted_at IS NULL)
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = p_actor_id AND ur.role::text IN ('dev', 'supervisor')
        )
        OR (
          p.cooperativa_id = p_cooperative_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id
              AND ur.role::text IN ('gestor_compras', 'comprador_singular')
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_receive_consolidation(
  p_actor_id uuid,
  p_consolidation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.sicoob_delivery_destinations d ON d.pa_id = p.pa_id
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND d.consolidation_id = p_consolidation_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_actor_id
          AND ur.role::text IN ('gerente_pa', 'comprador_pac')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_receive_destination(
  p_actor_id uuid,
  p_destination_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.sicoob_delivery_destinations d ON d.pa_id = p.pa_id
    WHERE (p.user_id = p_actor_id OR p.id = p_actor_id)
      AND d.id = p_destination_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_actor_id
          AND ur.role::text IN ('gerente_pa', 'comprador_pac')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_view_all_consolidation(
  p_actor_id uuid,
  p_consolidation_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_consolidations c
    WHERE c.id = p_consolidation_id
      AND (
        c.vendedor_id = p_actor_id
        OR public.sicoob_actor_can_manage_consolidation(p_actor_id, c.singular_id)
      )
  );
$$;

DROP POLICY IF EXISTS "Admins and Gestores can view consolidations" ON public.order_consolidations;
CREATE POLICY "consolidations_read_in_scope" ON public.order_consolidations
FOR SELECT TO authenticated USING (
  vendedor_id = auth.uid()
  OR public.sicoob_actor_can_manage_consolidation(auth.uid(), singular_id)
  OR public.sicoob_actor_can_receive_consolidation(auth.uid(), id)
);

DROP POLICY IF EXISTS "consolidation_orders_read_via_group" ON public.order_consolidation_orders;
CREATE POLICY "consolidation_orders_read_in_scope" ON public.order_consolidation_orders
FOR SELECT TO authenticated USING (
  public.sicoob_actor_can_view_all_consolidation(auth.uid(), consolidation_id)
);
DROP POLICY IF EXISTS "delivery_destinations_read_via_group" ON public.sicoob_delivery_destinations;
CREATE POLICY "delivery_destinations_read_in_scope" ON public.sicoob_delivery_destinations
FOR SELECT TO authenticated USING (
  public.sicoob_actor_can_view_all_consolidation(auth.uid(), consolidation_id)
  OR public.sicoob_actor_can_receive_destination(auth.uid(), id)
);
DROP POLICY IF EXISTS "delivery_allocations_read_via_destination" ON public.sicoob_delivery_allocations;
CREATE POLICY "delivery_allocations_read_in_scope" ON public.sicoob_delivery_allocations
FOR SELECT TO authenticated USING (
  public.sicoob_actor_can_receive_destination(auth.uid(), destination_id)
  OR EXISTS (
    SELECT 1 FROM public.sicoob_delivery_destinations d
    WHERE d.id = destination_id
      AND public.sicoob_actor_can_view_all_consolidation(auth.uid(), d.consolidation_id)
  )
);
DROP POLICY IF EXISTS "delivery_receipts_read_via_allocation" ON public.sicoob_delivery_receipt_events;
CREATE POLICY "delivery_receipts_read_in_scope" ON public.sicoob_delivery_receipt_events
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
    WHERE a.id = allocation_id
      AND (
        public.sicoob_actor_can_receive_destination(auth.uid(), d.id)
        OR public.sicoob_actor_can_view_all_consolidation(auth.uid(), d.consolidation_id)
      )
  )
);

CREATE OR REPLACE FUNCTION public.get_sicoob_consolidation_sellers()
RETURNS TABLE (id uuid, name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_cooperative_id uuid;
BEGIN
  SELECT cooperativa_id INTO v_cooperative_id
  FROM public.profiles
  WHERE (user_id = v_actor_id OR id = v_actor_id)
    AND is_active IS TRUE
    AND deleted_at IS NULL
  LIMIT 1;
  IF v_actor_id IS NULL OR v_cooperative_id IS NULL
     OR NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_cooperative_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  RETURN QUERY
  SELECT DISTINCT ur.user_id, COALESCE(NULLIF(trim(p.full_name), ''), ur.user_id::text)
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id
  WHERE ur.role::text = 'vendedor'
    AND p.cooperativa_id = v_cooperative_id
    AND p.is_active IS TRUE
    AND p.deleted_at IS NULL
  ORDER BY 2;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_sicoob_consolidation_records()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operation text := current_setting('app.sicoob_consolidation_operation', true);
BEGIN
  IF TG_TABLE_NAME = 'sicoob_delivery_receipt_events' AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Eventos de recebimento são imutáveis.';
  END IF;
  IF COALESCE(v_operation, '') NOT IN ('create', 'allocate', 'dispatch', 'receive') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Consolidação só pode ser alterada pelo fluxo transacional.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_protect_order_consolidations
BEFORE INSERT OR UPDATE OR DELETE ON public.order_consolidations
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_consolidation_orders
BEFORE INSERT OR UPDATE OR DELETE ON public.order_consolidation_orders
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_delivery_destinations
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_delivery_destinations
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_delivery_allocations
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_delivery_allocations
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();
CREATE TRIGGER tr_protect_delivery_receipts
BEFORE INSERT OR UPDATE OR DELETE ON public.sicoob_delivery_receipt_events
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_consolidation_records();

CREATE OR REPLACE FUNCTION public.protect_sicoob_order_consolidation_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.consolidation_id IS DISTINCT FROM OLD.consolidation_id
     AND current_setting('app.sicoob_consolidation_operation', true) IS DISTINCT FROM 'create' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O vínculo de consolidação exige o fluxo transacional.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_protect_sicoob_order_consolidation_link
BEFORE UPDATE OF consolidation_id ON public.sicoob_orders
FOR EACH ROW EXECUTE FUNCTION public.protect_sicoob_order_consolidation_link();

DROP FUNCTION IF EXISTS public.consolidate_pa_orders(uuid, uuid);

CREATE OR REPLACE FUNCTION public.create_sicoob_order_consolidation(
  p_order_ids uuid[],
  p_seller_id uuid,
  p_idempotency_key uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_consolidation_id uuid;
  v_existing_group public.order_consolidations%ROWTYPE;
  v_cooperative_id uuid;
  v_count integer;
  v_total numeric;
BEGIN
  IF v_actor_id IS NULL OR p_idempotency_key IS NULL OR cardinality(p_order_ids) = 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Pedidos, vendedor e chave de idempotência são obrigatórios.';
  END IF;
  IF cardinality(p_order_ids) <> (SELECT count(DISTINCT id) FROM unnest(p_order_ids) id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A lista de pedidos contém duplicidades.';
  END IF;

  SELECT * INTO v_existing_group
    FROM public.order_consolidations WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing_group.consolidated_by IS DISTINCT FROM v_actor_id
       OR v_existing_group.vendedor_id IS DISTINCT FROM p_seller_id
       OR (SELECT count(*) FROM public.order_consolidation_orders co
            WHERE co.consolidation_id = v_existing_group.id) <> cardinality(p_order_ids)
       OR EXISTS (
         SELECT 1 FROM public.order_consolidation_orders co
          WHERE co.consolidation_id = v_existing_group.id
            AND NOT (co.order_id = ANY(p_order_ids))
       ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'A chave de idempotência já foi usada por outro usuário ou conteúdo.';
    END IF;
    RETURN v_existing_group.id;
  END IF;

  PERFORM 1 FROM public.sicoob_orders WHERE id = ANY(p_order_ids) FOR UPDATE;
  SELECT cooperative_id INTO v_cooperative_id
    FROM public.sicoob_orders
   WHERE id = ANY(p_order_ids)
   LIMIT 1;
  SELECT count(*), sum(total_amount)
    INTO v_count, v_total
    FROM public.sicoob_orders
   WHERE id = ANY(p_order_ids)
     AND cooperative_id IS NOT NULL
     AND pa_id IS NOT NULL
     AND status = 'confirmed'
     AND consolidation_id IS NULL
  ;
  IF v_count <> cardinality(p_order_ids)
     OR EXISTS (
       SELECT 1 FROM public.sicoob_orders
        WHERE id = ANY(p_order_ids) AND cooperative_id IS DISTINCT FROM v_cooperative_id
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Pedidos precisam estar confirmados, livres e na mesma Singular.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_cooperative_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE (p.user_id = p_seller_id OR p.id = p_seller_id)
      AND p.cooperativa_id = v_cooperative_id
      AND p.is_active IS TRUE
      AND p.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = p_seller_id AND ur.role::text = 'vendedor'
      )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Vendedor informado não possui vínculo ativo nesta Singular.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'create', true);
  INSERT INTO public.order_consolidations (
    singular_id, vendedor_id, status, total_value, order_count, consolidated_by, idempotency_key
  ) VALUES (
    v_cooperative_id, p_seller_id, 'pending_seller', v_total, v_count, v_actor_id, p_idempotency_key
  ) RETURNING id INTO v_consolidation_id;

  INSERT INTO public.order_consolidation_orders (consolidation_id, order_id, order_total_snapshot)
  SELECT v_consolidation_id, id, total_amount
    FROM public.sicoob_orders WHERE id = ANY(p_order_ids);
  UPDATE public.sicoob_orders SET consolidation_id = v_consolidation_id
   WHERE id = ANY(p_order_ids);
  PERFORM public.allocate_sicoob_consolidation_by_order_pa(v_consolidation_id);
  RETURN v_consolidation_id;
END;
$$;

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

DROP FUNCTION IF EXISTS public.record_sicoob_delivery_receipt(uuid, integer, integer, integer, text);
CREATE OR REPLACE FUNCTION public.record_sicoob_delivery_receipt(
  p_allocation_id uuid,
  p_idempotency_key uuid,
  p_received_quantity integer DEFAULT 0,
  p_damaged_quantity integer DEFAULT 0,
  p_missing_quantity integer DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_allocation public.sicoob_delivery_allocations%ROWTYPE;
  v_group public.order_consolidations%ROWTYPE;
  v_event_id uuid;
  v_has_issues boolean;
  v_all_complete boolean;
  v_destination_pa_id uuid;
  v_existing_event public.sicoob_delivery_receipt_events%ROWTYPE;
BEGIN
  IF p_idempotency_key IS NULL
     OR p_received_quantity < 0 OR p_damaged_quantity < 0 OR p_missing_quantity < 0
     OR p_received_quantity + p_damaged_quantity + p_missing_quantity <= 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe ao menos uma quantidade positiva.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('sicoob-delivery-receipt:' || p_idempotency_key::text, 0));
  SELECT * INTO v_existing_event
    FROM public.sicoob_delivery_receipt_events
   WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing_event.allocation_id IS DISTINCT FROM p_allocation_id
       OR v_existing_event.received_quantity IS DISTINCT FROM p_received_quantity
       OR v_existing_event.damaged_quantity IS DISTINCT FROM p_damaged_quantity
       OR v_existing_event.missing_quantity IS DISTINCT FROM p_missing_quantity
       OR v_existing_event.notes IS DISTINCT FROM NULLIF(trim(p_notes), '')
       OR v_existing_event.received_by IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com outro recebimento.';
    END IF;
    RETURN v_existing_event.id;
  END IF;
  IF p_damaged_quantity + p_missing_quantity > 0
     AND length(trim(COALESCE(p_notes, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Descreva a divergência com ao menos 10 caracteres.';
  END IF;

  SELECT a.* INTO v_allocation
  FROM public.sicoob_delivery_allocations a WHERE a.id = p_allocation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Alocação não encontrada.'; END IF;
  SELECT c.* INTO v_group
  FROM public.sicoob_delivery_destinations d
  JOIN public.order_consolidations c ON c.id = d.consolidation_id
  WHERE d.id = v_allocation.destination_id FOR UPDATE OF c;
  SELECT pa_id INTO v_destination_pa_id
  FROM public.sicoob_delivery_destinations WHERE id = v_allocation.destination_id;
  IF v_group.status NOT IN ('sent', 'partially_received') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Recebimento permitido somente após o despacho.';
  END IF;
  IF NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_group.singular_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE (p.user_id = v_actor_id OR p.id = v_actor_id)
         AND p.pa_id = v_destination_pa_id
         AND p.is_active IS TRUE
         AND p.deleted_at IS NULL
         AND EXISTS (
           SELECT 1 FROM public.user_roles ur
           WHERE ur.user_id = v_actor_id AND ur.role::text IN ('gerente_pa', 'comprador_pac')
         )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  IF v_allocation.received_quantity + v_allocation.damaged_quantity + v_allocation.missing_quantity
     + p_received_quantity + p_damaged_quantity + p_missing_quantity > v_allocation.quantity THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O recebimento supera a quantidade destinada.';
  END IF;

  PERFORM set_config('app.sicoob_consolidation_operation', 'receive', true);
  INSERT INTO public.sicoob_delivery_receipt_events (
    idempotency_key, allocation_id, received_quantity, damaged_quantity, missing_quantity, notes, received_by
  ) VALUES (
    p_idempotency_key, p_allocation_id, p_received_quantity, p_damaged_quantity, p_missing_quantity,
    NULLIF(trim(p_notes), ''), v_actor_id
  ) RETURNING id INTO v_event_id;
  UPDATE public.sicoob_delivery_allocations SET
    received_quantity = received_quantity + p_received_quantity,
    damaged_quantity = damaged_quantity + p_damaged_quantity,
    missing_quantity = missing_quantity + p_missing_quantity,
    updated_at = now()
  WHERE id = p_allocation_id;

  SELECT bool_and(a.received_quantity + a.damaged_quantity + a.missing_quantity = a.quantity),
         bool_or(a.damaged_quantity > 0 OR a.missing_quantity > 0)
    INTO v_all_complete, v_has_issues
    FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
   WHERE d.consolidation_id = v_group.id;
  UPDATE public.order_consolidations SET
    status = CASE
      WHEN v_all_complete AND v_has_issues THEN 'received_with_issues'
      WHEN v_all_complete THEN 'received'
      ELSE 'partially_received'
    END,
    received_at = CASE WHEN v_all_complete THEN now() ELSE NULL END,
    updated_at = now()
  WHERE id = v_group.id;
  IF v_all_complete THEN
    PERFORM set_config('app.sicoob_order_status_comment', 'Recebimento integral do lote consolidado ' || v_group.id::text || '.', true);
    UPDATE public.sicoob_orders o
       SET status = 'completed', updated_at = now()
      FROM public.order_consolidation_orders co
     WHERE co.consolidation_id = v_group.id
       AND co.order_id = o.id
       AND o.status = 'logistic';
    IF NOT FOUND OR EXISTS (
      SELECT 1
        FROM public.order_consolidation_orders co
        JOIN public.sicoob_orders o ON o.id = co.order_id
       WHERE co.consolidation_id = v_group.id
         AND o.status <> 'completed'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um pedido do lote mudou; atualize a página.';
    END IF;
  END IF;
  RETURN v_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sicoob_actor_can_manage_consolidation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sicoob_actor_can_receive_consolidation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sicoob_actor_can_receive_destination(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sicoob_actor_can_view_all_consolidation(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sicoob_consolidation_sellers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_sicoob_consolidation_records() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_sicoob_order_consolidation_link() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_sicoob_order_consolidation(uuid[], uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.allocate_sicoob_consolidation_by_order_pa(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.dispatch_sicoob_order_consolidation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_sicoob_delivery_receipt(uuid, uuid, integer, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sicoob_order_consolidation(uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_manage_consolidation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_receive_consolidation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_receive_destination(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_view_all_consolidation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sicoob_consolidation_sellers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_sicoob_consolidation_by_order_pa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_order_consolidation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_sicoob_delivery_receipt(uuid, uuid, integer, integer, integer, text) TO authenticated;
