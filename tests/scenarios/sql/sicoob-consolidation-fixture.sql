CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY);

CREATE TABLE public.user_roles (user_id uuid, role text);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  user_id uuid,
  is_active boolean,
  deleted_at timestamptz,
  cooperativa_id uuid,
  pa_id uuid
);
CREATE TABLE public.postos_atendimento (
  id uuid PRIMARY KEY,
  cooperativa_id uuid NOT NULL,
  nome text NOT NULL,
  codigo text NOT NULL,
  endereco text,
  cidade text,
  uf text
);
CREATE TABLE public.order_consolidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singular_id uuid NOT NULL,
  vendedor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_value numeric(12,2) NOT NULL DEFAULT 0,
  order_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  consolidated_by uuid
);
CREATE TABLE public.sicoob_orders (
  id uuid PRIMARY KEY,
  cooperative_id uuid,
  pa_id uuid,
  total_amount numeric(14,2),
  status text,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.sicoob_order_items (
  id uuid PRIMARY KEY,
  order_id uuid REFERENCES public.sicoob_orders(id),
  product_name text,
  quantity integer
);

ALTER TABLE public.order_consolidations ENABLE ROW LEVEL SECURITY;

