
-- ============================================================================
-- ONDA A — OPERAÇÃO DE PEDIDOS COMPLETA
-- ============================================================================

-- 1) Helper: é dono do pedido OU admin/manager
CREATE OR REPLACE FUNCTION public.is_order_owner_or_admin(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (
        o.seller_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR public.has_role(auth.uid(), 'dev'::app_role)
      )
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_order_owner_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_order_owner_or_admin(uuid) TO authenticated;

-- 2) Atualizar trigger de validação de fulfillment_status para suportar workflow operacional expandido
CREATE OR REPLACE FUNCTION public.validate_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.fulfillment_status IS NOT NULL AND NEW.fulfillment_status NOT IN (
    'unfulfilled', 'partially_fulfilled', 'fulfilled',
    'in_production', 'in_separation', 'in_transit', 'delivered', 'completed', 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_order_status() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 3) order_logistics_tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_logistics_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tracking_code text,
  carrier text,
  carrier_url text,
  estimated_delivery date,
  actual_delivery_at timestamptz,
  delivery_photo_url text,
  recipient_name text,
  weight_kg numeric(10,3),
  volumes integer,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_order ON public.order_logistics_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_logistics_tracking_code ON public.order_logistics_tracking(tracking_code) WHERE tracking_code IS NOT NULL;

ALTER TABLE public.order_logistics_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logistics_select_owner_admin" ON public.order_logistics_tracking
  FOR SELECT TO authenticated
  USING (public.is_order_owner_or_admin(order_id));

CREATE POLICY "logistics_insert_owner_admin" ON public.order_logistics_tracking
  FOR INSERT TO authenticated
  WITH CHECK (public.is_order_owner_or_admin(order_id));

CREATE POLICY "logistics_update_owner_admin" ON public.order_logistics_tracking
  FOR UPDATE TO authenticated
  USING (public.is_order_owner_or_admin(order_id))
  WITH CHECK (public.is_order_owner_or_admin(order_id));

CREATE POLICY "logistics_delete_admin" ON public.order_logistics_tracking
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "logistics_deny_anon" ON public.order_logistics_tracking
  FOR ALL TO anon USING (false) WITH CHECK (false);

-- ============================================================================
-- 4) order_invoices (Notas Fiscais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  access_key text,
  serie text,
  issue_date date,
  due_date date,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  pdf_url text,
  xml_url text,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'cancelled', 'overdue')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.order_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.order_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.order_invoices(due_date) WHERE status IN ('issued','overdue');

ALTER TABLE public.order_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices_select_owner_admin" ON public.order_invoices
  FOR SELECT TO authenticated USING (public.is_order_owner_or_admin(order_id));
CREATE POLICY "invoices_insert_owner_admin" ON public.order_invoices
  FOR INSERT TO authenticated WITH CHECK (public.is_order_owner_or_admin(order_id));
CREATE POLICY "invoices_update_owner_admin" ON public.order_invoices
  FOR UPDATE TO authenticated USING (public.is_order_owner_or_admin(order_id)) WITH CHECK (public.is_order_owner_or_admin(order_id));
CREATE POLICY "invoices_delete_admin" ON public.order_invoices
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role));
CREATE POLICY "invoices_deny_anon" ON public.order_invoices FOR ALL TO anon USING (false) WITH CHECK (false);

-- ============================================================================
-- 5) order_payments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.order_invoices(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL CHECK (payment_method IN ('pix','boleto','transfer','credit_card','debit_card','cash','other')),
  payment_date date NOT NULL,
  receipt_url text,
  reference text,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.order_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.order_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.order_payments(payment_date);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_owner_admin" ON public.order_payments
  FOR SELECT TO authenticated USING (public.is_order_owner_or_admin(order_id));
CREATE POLICY "payments_insert_owner_admin" ON public.order_payments
  FOR INSERT TO authenticated WITH CHECK (public.is_order_owner_or_admin(order_id));
CREATE POLICY "payments_update_owner_admin" ON public.order_payments
  FOR UPDATE TO authenticated USING (public.is_order_owner_or_admin(order_id)) WITH CHECK (public.is_order_owner_or_admin(order_id));
CREATE POLICY "payments_delete_admin" ON public.order_payments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role));
CREATE POLICY "payments_deny_anon" ON public.order_payments FOR ALL TO anon USING (false) WITH CHECK (false);

-- ============================================================================
-- 6) order_pilot_approvals
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_pilot_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid,
  mockup_url text NOT NULL,
  mockup_thumbnail_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','revision')),
  reviewer_name text,
  reviewer_notes text,
  reviewed_at timestamptz,
  revision_round integer NOT NULL DEFAULT 1 CHECK (revision_round > 0),
  parent_approval_id uuid REFERENCES public.order_pilot_approvals(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pilot_order ON public.order_pilot_approvals(order_id);
CREATE INDEX IF NOT EXISTS idx_pilot_status ON public.order_pilot_approvals(status);

ALTER TABLE public.order_pilot_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_select_owner_admin" ON public.order_pilot_approvals
  FOR SELECT TO authenticated USING (public.is_order_owner_or_admin(order_id));
CREATE POLICY "pilot_insert_owner_admin" ON public.order_pilot_approvals
  FOR INSERT TO authenticated WITH CHECK (public.is_order_owner_or_admin(order_id));
CREATE POLICY "pilot_update_owner_admin" ON public.order_pilot_approvals
  FOR UPDATE TO authenticated USING (public.is_order_owner_or_admin(order_id)) WITH CHECK (public.is_order_owner_or_admin(order_id));
CREATE POLICY "pilot_delete_admin" ON public.order_pilot_approvals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role));
CREATE POLICY "pilot_deny_anon" ON public.order_pilot_approvals FOR ALL TO anon USING (false) WITH CHECK (false);

-- ============================================================================
-- 7) order_comments (chat por pedido)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.order_comments(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id),
  author_role text,
  content text NOT NULL CHECK (length(content) > 0 AND length(content) <= 4000),
  attachments jsonb DEFAULT '[]'::jsonb,
  read_by jsonb DEFAULT '[]'::jsonb,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_comments_order ON public.order_comments(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.order_comments(author_id);

ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_owner_admin" ON public.order_comments
  FOR SELECT TO authenticated USING (public.is_order_owner_or_admin(order_id));
CREATE POLICY "comments_insert_self" ON public.order_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_order_owner_or_admin(order_id) AND author_id = auth.uid());
CREATE POLICY "comments_update_self" ON public.order_comments
  FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
CREATE POLICY "comments_delete_self_or_admin" ON public.order_comments
  FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role));
CREATE POLICY "comments_deny_anon" ON public.order_comments FOR ALL TO anon USING (false) WITH CHECK (false);

-- ============================================================================
-- 8) order_templates + order_template_items (recompra)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(name) > 0 AND length(name) <= 200),
  description text,
  source_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  client_id text,
  is_favorite boolean NOT NULL DEFAULT false,
  use_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_user ON public.order_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_favorite ON public.order_templates(user_id, is_favorite) WHERE is_favorite = true;

ALTER TABLE public.order_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_select_self_or_admin" ON public.order_templates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role));
CREATE POLICY "templates_insert_self" ON public.order_templates
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "templates_update_self" ON public.order_templates
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "templates_delete_self" ON public.order_templates
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "templates_deny_anon" ON public.order_templates FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.order_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.order_templates(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  variant_sku text,
  product_name text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(14,4),
  notes text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_items_template ON public.order_template_items(template_id, position);

ALTER TABLE public.order_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "template_items_select_via_template" ON public.order_template_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND (t.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role))));
CREATE POLICY "template_items_insert_via_template" ON public.order_template_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "template_items_update_via_template" ON public.order_template_items
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "template_items_delete_via_template" ON public.order_template_items
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.order_templates t WHERE t.id = template_id AND t.user_id = auth.uid()));
CREATE POLICY "template_items_deny_anon" ON public.order_template_items FOR ALL TO anon USING (false) WITH CHECK (false);

-- ============================================================================
-- 9) order_audit_events (timeline fim-a-fim)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.order_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_category text NOT NULL CHECK (event_category IN ('status','logistics','invoice','payment','pilot','comment','system')),
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  actor_role text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_order ON public.order_audit_events(order_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_category ON public.order_audit_events(event_category);

ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select_owner_admin" ON public.order_audit_events
  FOR SELECT TO authenticated USING (public.is_order_owner_or_admin(order_id));
-- Insert apenas via trigger SECURITY DEFINER
CREATE POLICY "audit_no_direct_write" ON public.order_audit_events
  FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "audit_deny_anon" ON public.order_audit_events FOR ALL TO anon USING (false) WITH CHECK (false);

-- ============================================================================
-- 10) Trigger genérico de auditoria — registra mudança de status do pedido
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor_name text;
BEGIN
  IF (TG_OP = 'UPDATE') AND (NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status OR NEW.status IS DISTINCT FROM OLD.status) THEN
    SELECT COALESCE(p.full_name, p.email, 'Sistema') INTO _actor_name
      FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1;

    INSERT INTO public.order_audit_events (order_id, event_type, event_category, actor_id, actor_name, description, metadata)
    VALUES (
      NEW.id,
      'status_changed',
      'status',
      auth.uid(),
      _actor_name,
      format('Status alterado de %s → %s', COALESCE(OLD.fulfillment_status, '-'), COALESCE(NEW.fulfillment_status, '-')),
      jsonb_build_object(
        'old_status', OLD.status, 'new_status', NEW.status,
        'old_fulfillment', OLD.fulfillment_status, 'new_fulfillment', NEW.fulfillment_status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_order_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_order_status_change();

-- ============================================================================
-- 11) updated_at triggers para todas as novas tabelas
-- ============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'order_logistics_tracking','order_invoices','order_payments',
    'order_pilot_approvals','order_comments','order_templates'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;
      CREATE TRIGGER trg_%I_updated_at
        BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;

-- ============================================================================
-- 12) Storage buckets para anexos (NF, comprovantes, fotos de entrega)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-documents', 'order-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "order_docs_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'order-documents');

CREATE POLICY "order_docs_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'order-documents');

CREATE POLICY "order_docs_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'order-documents' AND owner = auth.uid());

CREATE POLICY "order_docs_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'order-documents' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)));
