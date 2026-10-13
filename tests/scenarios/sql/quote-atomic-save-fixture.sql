CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  client_id text,
  client_name text,
  client_email text,
  client_phone text,
  client_company text,
  seller_id uuid NOT NULL,
  organization_id uuid,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  total_cost numeric DEFAULT 0,
  negotiation_markup_percent numeric NOT NULL DEFAULT 0,
  payment_terms text,
  delivery_time text,
  shipping_type text,
  shipping_cost numeric DEFAULT 0,
  notes text,
  internal_notes text,
  valid_until timestamptz,
  is_latest_version boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  row_version integer NOT NULL DEFAULT 1,
  parent_quote_id uuid,
  approved_by uuid,
  approved_at timestamptz,
  approved_pdf_url text,
  rejection_notes text,
  client_response text,
  client_response_at timestamptz,
  client_response_notes text,
  sent_at timestamptz,
  deleted_at timestamptz,
  pa_id uuid,
  singular_id uuid,
  consolidation_id uuid,
  reorder_source_order_id uuid,
  reorder_source_quote_id uuid,
  catalog_revalidated_at timestamptz,
  catalog_valid_until timestamptz,
  catalog_stock_is_reserved boolean NOT NULL DEFAULT false,
  reorder_price_changed_items integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id text,
  product_name text NOT NULL CHECK (product_name <> 'FALHAR'),
  product_sku text,
  product_image_url text,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  unit_cost numeric DEFAULT 0,
  subtotal numeric,
  color_name text,
  color_hex text,
  notes text,
  sort_order integer,
  kit_group_id text,
  kit_name text,
  size_code text,
  gender text,
  source_variant_id text,
  source_variant_sku text,
  price_confirmed_at timestamptz,
  catalog_checked_at timestamptz,
  catalog_available_stock integer,
  catalog_minimum_quantity integer,
  catalog_valid_until timestamptz,
  catalog_stock_is_reserved boolean NOT NULL DEFAULT false,
  historical_unit_price numeric(14,4),
  price_changed boolean NOT NULL DEFAULT false
);

CREATE TABLE public.quote_item_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id uuid NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  technique_id text,
  technique_name text,
  colors_count integer,
  positions_count integer,
  area_cm2 numeric,
  width_cm numeric,
  height_cm numeric,
  personalized_quantity integer,
  setup_cost numeric,
  unit_cost numeric,
  total_cost numeric,
  notes text
);

CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.can_view_all_sales() RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION public.get_user_org_ids(p_user_id uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE AS $$ SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid $$;

CREATE FUNCTION public.append_quote_history_note(
  p_quote_id uuid,
  p_action text,
  p_description text,
  p_field_changed text DEFAULT NULL,
  p_old_value text DEFAULT NULL,
  p_new_value text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = p_quote_id AND q.seller_id = auth.uid()
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem acesso ao orçamento.';
  END IF;
  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, metadata
  ) VALUES (
    p_quote_id, auth.uid(), p_action, p_description, COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE FUNCTION public.handle_row_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_quotes_row_version BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.handle_row_version();

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_item_personalizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_owner ON public.quotes TO authenticated
USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY quote_item_owner ON public.quote_items TO authenticated
USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.seller_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.seller_id = auth.uid()));
CREATE POLICY quote_personalization_owner ON public.quote_item_personalizations TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id
  WHERE qi.id = quote_item_id AND q.seller_id = auth.uid()
)) WITH CHECK (EXISTS (
  SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id
  WHERE qi.id = quote_item_id AND q.seller_id = auth.uid()
));
CREATE POLICY quote_history_owner ON public.quote_history TO authenticated
USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.seller_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND q.seller_id = auth.uid()));

GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.quote_history FROM authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_all_sales() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_quote_history_note(uuid, text, text, text, text, text, jsonb) TO authenticated;
