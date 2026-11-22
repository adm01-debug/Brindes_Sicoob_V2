-- Fixture mínima para validar o ciclo de verba em quatro estados (PLB-29/32).
-- Reproduz apenas os contratos que a migration 20261122120000 consome.

CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY);

CREATE TYPE public.app_role AS ENUM (
  'admin', 'dev', 'supervisor', 'gestor_compras', 'gerente_pa',
  'comprador_pac', 'comprador_singular', 'manager', 'vendedor'
);

CREATE TABLE public.cooperativas (
  id uuid PRIMARY KEY,
  nome text
);

CREATE TABLE public.postos_atendimento (
  id uuid PRIMARY KEY,
  cooperativa_id uuid NOT NULL REFERENCES public.cooperativas(id),
  nome text,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL,
  pa_id uuid,
  cooperativa_id uuid,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE public.pa_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_id uuid NOT NULL REFERENCES public.postos_atendimento(id),
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
  pa_id uuid REFERENCES public.postos_atendimento(id),
  cooperative_id uuid REFERENCES public.cooperativas(id),
  created_by uuid,
  status text NOT NULL DEFAULT 'draft',
  total_amount numeric(12,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_remaining_budget numeric(12,2)
);

CREATE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role IN ('admin', 'dev', 'supervisor')
  );
$$;

CREATE FUNCTION public.is_gestor_compras(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = 'gestor_compras'
  );
$$;

CREATE FUNCTION public.current_user_cooperativa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT cooperativa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE FUNCTION public.current_user_pa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT pa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Contrato preexistente (20260923130000): leitura do pedido por escopo.
CREATE FUNCTION public.sicoob_current_actor_can_read_order(p_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.sicoob_orders ord
     WHERE ord.id = p_order_id
       AND (
         public.is_admin(auth.uid())
         OR ord.created_by = auth.uid()
         OR ord.pa_id = public.current_user_pa_id()
         OR ord.cooperative_id = public.current_user_cooperativa_id()
       )
  );
$$;

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
GRANT SELECT ON public.profiles, public.user_roles TO authenticated;
-- Em producao o Supabase concede SELECT de todas as tabelas de `public` ao
-- papel `authenticated` e e a RLS que recorta as linhas. Sem esse grant a
-- fixture falha com "permission denied" antes de chegar na policy.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_gestor_compras(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_cooperativa_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_pa_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_read_order(uuid) TO authenticated, service_role;

-- Dados sintéticos. O consumo legado nasce no AGREGADO (antes da migration),
-- que é exatamente o cenário do achado L178.
INSERT INTO public.cooperativas (id, nome) VALUES
  ('00000000-0000-4000-8000-000000000010', 'Coop A'),
  ('00000000-0000-4000-8000-000000000011', 'Coop B');

INSERT INTO public.postos_atendimento (id, cooperativa_id, nome) VALUES
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010', 'PA A'),
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000011', 'PA B');

INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total, verba_consumida, limite_alcada)
SELECT '00000000-0000-4000-8000-000000000001',
       EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int, 1000, 150, 500;

INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total, verba_consumida, limite_alcada)
SELECT '00000000-0000-4000-8000-000000000002',
       EXTRACT(YEAR FROM now())::int, EXTRACT(MONTH FROM now())::int, 500, 0, 500;

-- Competência anterior do PA A, para o cenário de troca de período.
INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total, verba_consumida, limite_alcada)
SELECT '00000000-0000-4000-8000-000000000001',
       EXTRACT(YEAR FROM (now() - interval '1 month'))::int,
       EXTRACT(MONTH FROM (now() - interval '1 month'))::int, 300, 0, 500;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-4000-8000-000000000020'),
  ('00000000-0000-4000-8000-000000000021'),
  ('00000000-0000-4000-8000-000000000022'),
  ('00000000-0000-4000-8000-000000000023'),
  ('00000000-0000-4000-8000-000000000024');

-- 023: enxerga o pedido da Coop A por escopo, mas nao tem papel de verba.
-- 024: Gestor Singular (comprador_singular) da Coop A.
INSERT INTO public.profiles (user_id, pa_id, cooperativa_id) VALUES
  ('00000000-0000-4000-8000-000000000020', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000022', NULL, NULL),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000010');

INSERT INTO public.user_roles (user_id, role) VALUES
  ('00000000-0000-4000-8000-000000000020', 'gestor_compras'),
  ('00000000-0000-4000-8000-000000000021', 'gestor_compras'),
  ('00000000-0000-4000-8000-000000000022', 'admin'),
  ('00000000-0000-4000-8000-000000000024', 'comprador_singular');

INSERT INTO public.sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)
VALUES ('00000000-0000-4000-8000-000000000101',
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000010',
        '00000000-0000-4000-8000-000000000020', 'draft', 100);

-- Pedido ja consumido ANTES do livro existir: o valor dele esta somado em
-- `pa_budgets.verba_consumida` (150 = 60 deste pedido + 90 sem pedido) e nao
-- existe nenhuma linha em `pa_budget_entries`. O backfill precisa atribuir os
-- 60 ao pedido, senao a proxima transicao debita de novo.
INSERT INTO public.sicoob_orders (id, pa_id, cooperative_id, created_by, status, total_amount)
VALUES ('00000000-0000-4000-8000-000000000102',
        '00000000-0000-4000-8000-000000000001',
        '00000000-0000-4000-8000-000000000010',
        '00000000-0000-4000-8000-000000000020', 'delivered', 60);
