CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TYPE public.app_role AS ENUM (
  'admin', 'manager', 'vendedor', 'supervisor', 'dev',
  'gestor_compras', 'gerente_pa', 'comprador_pac', 'comprador_singular'
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  pa_id uuid,
  cooperativa_id uuid
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
  audit_remaining_budget numeric(12,2)
);
CREATE TABLE public.sicoob_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sicoob_orders(id),
  requester_id uuid NOT NULL,
  approver_id uuid,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
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

-- PA exigido pela view de conciliação (nome do posto no relatório).
CREATE TABLE public.postos_atendimento (
  id uuid PRIMARY KEY,
  nome text NOT NULL
);

-- Cópia da view legada de conciliação, que somava apenas três estados. A
-- migration de correção precisa substituí-la pelo conjunto que o gatilho
-- debita; se a lista voltar a divergir, a simulação acusa discrepância.
CREATE VIEW public.sicoob_budget_audit AS
SELECT
    pb.pa_id,
    pa.nome as pa_nome,
    pb.ano,
    pb.mes,
    pb.verba_total,
    pb.verba_consumida as verba_registrada,
    COALESCE(SUM(so.total_amount), 0) as verba_calculada_pedidos,
    (pb.verba_consumida - COALESCE(SUM(so.total_amount), 0)) as discrepancia
FROM public.pa_budgets pb
JOIN public.postos_atendimento pa ON pb.pa_id = pa.id
LEFT JOIN public.sicoob_orders so ON so.pa_id = pb.pa_id
    AND so.status IN ('confirmed', 'logistic', 'completed')
    AND EXTRACT(YEAR FROM so.created_at) = pb.ano
    AND EXTRACT(MONTH FROM so.created_at) = pb.mes
GROUP BY pb.id, pa.nome;
