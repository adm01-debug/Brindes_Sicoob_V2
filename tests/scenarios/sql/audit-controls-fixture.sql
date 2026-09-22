-- Somente para PostgreSQL descartável com dados sintéticos.
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role BYPASSRLS; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
$$ SELECT current_setting('request.jwt.claim.role', true) $$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
CREATE TYPE public.app_role AS ENUM ('admin','dev','gestor_compras','gerente_pa');
CREATE TABLE auth.users(id uuid PRIMARY KEY, email varchar(255));
CREATE TABLE public.user_roles(user_id uuid, role public.app_role);
CREATE FUNCTION public.has_role(p_user uuid, p_role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS(SELECT FROM user_roles WHERE user_id=p_user AND role=p_role) $$;
CREATE FUNCTION public.is_dev(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT public.has_role(p_user, 'dev') $$;
CREATE TABLE public.profiles(id uuid PRIMARY KEY, user_id uuid, full_name text);
CREATE TABLE public.step_up_audit_log(
  id uuid DEFAULT gen_random_uuid(), created_at timestamptz DEFAULT now(), user_id uuid,
  action text, metadata jsonb DEFAULT '{}', challenge_id uuid, token_id uuid,
  ip_address inet, user_agent text, event_type text
);
ALTER TABLE public.step_up_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY leitura_propria_ou_dev ON public.step_up_audit_log FOR SELECT TO authenticated
  USING (user_id=auth.uid() OR public.is_dev(auth.uid()));
GRANT SELECT ON public.step_up_audit_log, public.profiles TO authenticated, service_role;
CREATE TABLE public.cooperativas(id uuid, user_id uuid);
ALTER TABLE public.cooperativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY apenas_insercao ON public.cooperativas FOR INSERT TO authenticated WITH CHECK (true);
CREATE TABLE public.admin_audit_log(id integer, user_id uuid) PARTITION BY RANGE(id);
CREATE TABLE public.admin_audit_log_p1 PARTITION OF public.admin_audit_log FOR VALUES FROM(0) TO(100);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log_p1 ENABLE ROW LEVEL SECURITY;
INSERT INTO auth.users VALUES
 ('00000000-0000-0000-0000-000000000001','proprio@example.invalid'),
 ('00000000-0000-0000-0000-000000000002','outro@example.invalid'),
 ('00000000-0000-0000-0000-000000000003','dev@example.invalid');
INSERT INTO public.profiles VALUES
 ('00000000-0000-0000-0000-000000000101','00000000-0000-0000-0000-000000000001','Perfil próprio'),
 ('00000000-0000-0000-0000-000000000102','00000000-0000-0000-0000-000000000002','Outro perfil');
INSERT INTO public.user_roles VALUES ('00000000-0000-0000-0000-000000000003','dev');
INSERT INTO public.step_up_audit_log(user_id,event_type) VALUES
 ('00000000-0000-0000-0000-000000000001','full_scope_granted'),
 ('00000000-0000-0000-0000-000000000002','full_scope_granted');
