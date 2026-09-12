-- Esquema mínimo para validar guardas de alçada em PostgreSQL isolado.
-- Não contém dados ou credenciais de qualquer ambiente compartilhado.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TYPE public.app_role AS ENUM (
  'admin', 'manager', 'vendedor', 'supervisor', 'dev',
  'gestor_compras', 'gerente_pa', 'comprador_pac', 'comprador_singular'
);

CREATE TABLE public.cooperativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  cooperativa_id uuid,
  pa_id uuid,
  is_active boolean DEFAULT true,
  deleted_at timestamptz
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.pa_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_id uuid NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL,
  verba_total numeric(14,2) NOT NULL,
  verba_consumida numeric(14,2) NOT NULL DEFAULT 0 CHECK (verba_consumida >= 0),
  limite_alcada numeric(14,2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pa_id, ano, mes)
);

CREATE TABLE public.sicoob_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_id uuid,
  cooperative_id uuid,
  created_by uuid,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric(12,2) DEFAULT 0,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_remaining_budget numeric(12,2),
  sla_status text
);

CREATE TABLE public.sicoob_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT 'Item sintético',
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 1,
  total_price numeric(12,2) NOT NULL DEFAULT 1
);

CREATE TABLE public.sicoob_order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
  user_id uuid,
  previous_status text,
  new_status text NOT NULL,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.workspace_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  action_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sicoob_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id),
  requester_id uuid NOT NULL,
  approver_id uuid,
  status text NOT NULL DEFAULT 'pending',
  request_reason text,
  rejection_reason text,
  amount_at_request numeric NOT NULL,
  threshold_at_request numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sicoob_manager_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  order_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
