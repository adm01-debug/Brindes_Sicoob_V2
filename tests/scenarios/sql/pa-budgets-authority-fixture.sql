CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE TYPE public.app_role AS ENUM (
  'admin', 'dev', 'supervisor', 'gestor_compras', 'gerente_pa'
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL,
  cooperativa_id uuid,
  pa_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz
);

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role public.app_role NOT NULL
);

CREATE TABLE public.postos_atendimento (
  id uuid PRIMARY KEY,
  cooperativa_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.pa_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_id uuid NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL,
  verba_total numeric NOT NULL DEFAULT 0,
  verba_consumida numeric NOT NULL DEFAULT 0,
  limite_alcada numeric,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pa_id, ano, mes)
);

CREATE FUNCTION public.sicoob_actor_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
        FROM public.profiles AS profile
       WHERE (profile.user_id = _user_id OR profile.id = _user_id)
         AND profile.is_active IS TRUE
         AND profile.deleted_at IS NULL
    );
$$;

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.sicoob_actor_is_active(_user_id)
    AND EXISTS (
      SELECT 1
        FROM public.user_roles AS actor_role
       WHERE actor_role.user_id = _user_id
         AND actor_role.role = _role
    );
$$;

CREATE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.sicoob_actor_is_active(_user_id)
    AND EXISTS (
      SELECT 1
        FROM public.user_roles AS actor_role
       WHERE actor_role.user_id = _user_id
         AND actor_role.role IN ('admin', 'dev', 'supervisor')
    );
$$;

-- Contrato vulnerável observado no banco antes da correção.
CREATE FUNCTION public.is_gestor_compras(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = 'gestor_compras'
  );
$$;

CREATE FUNCTION public.is_gerente_pa(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id AND role = 'gerente_pa'
  );
$$;

CREATE FUNCTION public.current_user_cooperativa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cooperativa_id FROM public.profiles
   WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE FUNCTION public.current_user_pa_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pa_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

ALTER TABLE public.pa_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY pa_budgets_anon_deny
ON public.pa_budgets AS RESTRICTIVE FOR ALL TO anon
USING (false) WITH CHECK (false);

CREATE POLICY merged_budget_select
ON public.pa_budgets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_gestor_compras()
  OR pa_id = public.current_user_pa_id()
);

CREATE POLICY merged_budget_insert
ON public.pa_budgets FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras());

CREATE POLICY merged_budget_update
ON public.pa_budgets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.is_gestor_compras()
  OR (public.is_gerente_pa() AND pa_id = public.current_user_pa_id())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.is_gestor_compras()
  OR (public.is_gerente_pa() AND pa_id = public.current_user_pa_id())
);

CREATE POLICY merged_budget_delete
ON public.pa_budgets FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_gestor_compras());

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public, auth TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pa_budgets TO authenticated;
GRANT ALL ON public.pa_budgets TO service_role;
GRANT SELECT ON public.profiles, public.user_roles, public.postos_atendimento TO authenticated;
