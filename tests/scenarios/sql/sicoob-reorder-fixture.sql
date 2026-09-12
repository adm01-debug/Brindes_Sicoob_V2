-- Esquema mínimo e sintético para validar a recompra Sicoob sem rede.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE public.cooperativas (
  id uuid PRIMARY KEY,
  nome text NOT NULL
);
CREATE TABLE public.postos_atendimento (
  id uuid PRIMARY KEY,
  cooperativa_id uuid NOT NULL REFERENCES public.cooperativas(id),
  nome text NOT NULL
);
CREATE TABLE public.organizations (id uuid PRIMARY KEY);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  cooperativa_id uuid,
  pa_id uuid,
  organization_id uuid,
  is_active boolean DEFAULT true,
  deleted_at timestamptz
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role text NOT NULL
);
CREATE TABLE public.sicoob_orders (
  id uuid PRIMARY KEY,
  pa_id uuid,
  cooperative_id uuid,
  created_by uuid,
  status text NOT NULL,
  total_amount numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.sicoob_order_items (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES public.sicoob_orders(id),
  product_id uuid,
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE SEQUENCE public.quote_number_seq;
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL DEFAULT ('ORC-' || nextval('public.quote_number_seq')),
  client_id uuid,
  client_name text,
  seller_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  internal_notes text,
  organization_id uuid,
  pa_id uuid,
  singular_id uuid,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id text,
  product_name text NOT NULL,
  product_sku text,
  product_image_url text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  subtotal numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  color_name text,
  color_hex text,
  size_code text,
  notes text,
  kit_group_id text,
  kit_name text,
  source_variant_id text,
  source_variant_sku text,
  catalog_checked_at timestamptz,
  sort_order integer DEFAULT 0
);
CREATE TABLE public.quote_item_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id uuid NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  technique_id text,
  technique_name text,
  colors_count integer,
  width_cm numeric,
  height_cm numeric,
  personalized_quantity integer,
  setup_cost numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE FUNCTION public.set_quote_hierarchy()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  SELECT pa_id, cooperativa_id INTO NEW.pa_id, NEW.singular_id
    FROM public.profiles WHERE user_id = NEW.seller_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER tr_set_quote_hierarchy
BEFORE INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.set_quote_hierarchy();
