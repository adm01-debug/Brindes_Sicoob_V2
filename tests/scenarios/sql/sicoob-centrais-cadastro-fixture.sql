-- Estado de partida de sicoob_centrais: apenas "Authenticated read for centrais"
-- (migration 20260517124846), sem nenhuma política de escrita.
CREATE SCHEMA auth;
CREATE ROLE authenticated;

CREATE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $fn$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;

CREATE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $fn$
  SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated')
$fn$;

CREATE TYPE public.app_role AS ENUM ('admin', 'dev', 'supervisor', 'gestor_compras', 'gerente_pa', 'comprador_pac', 'comprador_singular');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL
);

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$fn$;

CREATE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  SELECT public.has_role(_user_id, 'admin')
$fn$;

CREATE TABLE public.sicoob_centrais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text,
  region text,
  logo_url text,
  primary_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.sicoob_centrais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read for centrais" ON public.sicoob_centrais FOR SELECT USING (auth.role() = 'authenticated');

-- Espelha o vínculo real (cooperativas.central_id, sem ON DELETE) para provar o
-- 23503 ao excluir uma Central com Singular vinculada.
CREATE TABLE public.cooperativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  central_id uuid REFERENCES public.sicoob_centrais(id)
);

ALTER TABLE public.cooperativas ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT SELECT ON public.sicoob_centrais TO authenticated;
