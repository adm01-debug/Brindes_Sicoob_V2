-- Esquema mínimo para validar eventos de status Sicoob em PostgreSQL isolado.
-- Não usa dados, credenciais ou instâncias compartilhadas.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

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
  role text NOT NULL
);

CREATE TABLE public.sicoob_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperative_id uuid,
  pa_id uuid,
  created_by uuid,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric DEFAULT 0,
  sla_status text,
  updated_at timestamptz NOT NULL DEFAULT now()
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
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
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
