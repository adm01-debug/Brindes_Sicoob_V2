-- Esquema mínimo para validar a migração de versionamento em Postgres isolado.
-- Não usa dados, credenciais ou instâncias compartilhadas.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE FUNCTION public.can_manage_quotes(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE
AS $$ SELECT false $$;

CREATE SEQUENCE public.test_quote_number_sequence START 10001;

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE DEFAULT '',
  client_cnpj text,
  client_company text,
  client_email text,
  client_id text,
  client_name text,
  client_phone text,
  delivery_time text,
  discount_amount numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  internal_notes text,
  is_active boolean DEFAULT true,
  is_latest_version boolean NOT NULL DEFAULT true,
  negotiation_markup_percent numeric NOT NULL DEFAULT 0,
  notes text,
  organization_id uuid,
  pa_id uuid,
  parent_quote_id uuid REFERENCES public.quotes(id),
  payment_terms text,
  real_discount_percent numeric,
  real_subtotal numeric,
  seller_id uuid NOT NULL,
  shipping_cost numeric,
  shipping_type text,
  singular_id uuid,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  suggested_modifications jsonb,
  tags text[],
  total numeric NOT NULL DEFAULT 0,
  total_cost numeric,
  valid_until timestamptz,
  version integer NOT NULL DEFAULT 1,
  bitrix_deal_id text,
  bitrix_quote_id text,
  approved_at timestamptz,
  approved_by uuid,
  client_response text,
  client_response_at timestamptz,
  client_response_notes text,
  sent_at timestamptz,
  rejection_notes text,
  consolidation_id uuid,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.test_generate_quote_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.quote_number = '' THEN
    NEW.quote_number := nextval('public.test_quote_number_sequence')::text || '/26';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER test_generate_quote_number
BEFORE INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.test_generate_quote_number();

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  color_hex text,
  color_name text,
  display_order integer,
  gender text,
  kit_group_id uuid,
  kit_name text,
  notes text,
  price_confirmed_at timestamptz,
  product_id text,
  product_image_url text,
  product_name text NOT NULL,
  product_sku text,
  quantity integer NOT NULL DEFAULT 1,
  size_code text,
  sort_order integer,
  subtotal numeric,
  unit_cost numeric,
  unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_item_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id uuid NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  area_cm2 numeric,
  colors_count integer,
  height_cm numeric,
  notes text,
  personalized_quantity integer,
  positions_count integer,
  setup_cost numeric,
  technique_id text,
  technique_name text,
  total_cost numeric,
  unit_cost numeric,
  width_cm numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
