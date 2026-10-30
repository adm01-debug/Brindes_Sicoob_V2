CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
CREATE SCHEMA extensions;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user)
$$;

CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'dev', 'supervisor', 'user');

CREATE TABLE public.organizations (id uuid PRIMARY KEY);
CREATE TABLE public.quotes (id uuid PRIMARY KEY);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role public.app_role NOT NULL
);
CREATE TABLE public.organization_members (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id)
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  email text,
  full_name text,
  role text
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'manager'::public.app_role)
      OR public.has_role(_user_id, 'dev'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$$;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  order_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
  client_id text,
  client_name text,
  client_email text,
  client_phone text,
  client_company text,
  quote_id uuid REFERENCES public.quotes(id),
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  internal_notes text,
  tracking_number text,
  shipping_type text,
  payment_terms text,
  delivery_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id),
  version integer NOT NULL DEFAULT 1,
  shipping_carrier text,
  shipping_delivery_forecast timestamptz,
  delivery_photo_url text,
  CONSTRAINT orders_fulfillment_status_check CHECK (
    fulfillment_status IN ('pending', 'in_production', 'in_separation', 'in_transit', 'delivered', 'completed', 'cancelled')
  )
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  product_id text,
  product_sku text,
  product_name text,
  product_image_url text,
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES public.organizations(id),
  CONSTRAINT order_items_order_id_fkey_uuid CHECK (true)
);

CREATE TABLE public.order_logistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tracking_code text,
  carrier_name text,
  estimated_delivery timestamptz,
  actual_delivery timestamptz,
  delivery_photo_url text,
  delivery_status text DEFAULT 'pending',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.order_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_category text NOT NULL CHECK (
    event_category IN ('status', 'logistics', 'invoice', 'payment', 'pilot', 'comment', 'system')
  ),
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  actor_role text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by_name text,
  category text DEFAULT 'status_change',
  observations text
);

CREATE TABLE public.outbound_webhooks (
  active boolean NOT NULL DEFAULT true,
  events text[] NOT NULL
);
CREATE TABLE public.qa_http_calls (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  url text NOT NULL,
  body text NOT NULL
);
CREATE OR REPLACE FUNCTION extensions.http_post(
  url text,
  body text,
  params jsonb,
  headers jsonb,
  timeout_milliseconds integer
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_id bigint;
BEGIN
  INSERT INTO public.qa_http_calls(url,body) VALUES (url,body) RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_quote_webhook_event()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.validate_status_fields()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.validate_main_order_status_transition()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.validate_order_fulfillment_transition()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.check_fulfillment_transition()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.fn_audit_order_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;

CREATE TRIGGER trg_validate_order_status BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();
CREATE TRIGGER tr_validate_main_order_status BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_main_order_status_transition();
CREATE TRIGGER tr_validate_order_fulfillment BEFORE UPDATE OF fulfillment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_order_fulfillment_transition();
CREATE TRIGGER tr_check_fulfillment_transition BEFORE UPDATE OF fulfillment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_fulfillment_transition();
CREATE TRIGGER tr_audit_order_status AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_order_status_change();
CREATE TRIGGER tr_audit_order_status_change AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_order_status_change();
CREATE TRIGGER trg_dispatch_webhook_orders AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_order_items" ON public.order_items
  FOR SELECT TO authenticated USING (true);

GRANT USAGE ON SCHEMA public, auth, extensions TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
GRANT SELECT, UPDATE ON public.orders TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
