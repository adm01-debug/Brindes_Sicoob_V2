CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TABLE public.view_security_source (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  secret text NOT NULL
);
INSERT INTO public.view_security_source VALUES
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'segredo-a');
ALTER TABLE public.view_security_source ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.view_security_source TO authenticated;
CREATE POLICY view_security_source_own
  ON public.view_security_source FOR SELECT TO authenticated
  USING (owner_id = (SELECT auth.uid()));

CREATE VIEW public.sicoob_budget_audit AS SELECT * FROM public.view_security_source;
CREATE VIEW public.telemetry_query_performance AS SELECT * FROM public.view_security_source;
CREATE VIEW public.v_full_scope_grants AS SELECT * FROM public.view_security_source;
CREATE VIEW public.v_sicoob_hierarchy AS SELECT * FROM public.view_security_source;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.notifications TO authenticated;
CREATE POLICY authenticated_create_notifications
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
