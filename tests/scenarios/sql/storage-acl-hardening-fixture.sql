CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA vault;
CREATE SCHEMA net;
CREATE SCHEMA cron;

CREATE TABLE vault.decrypted_secrets (
  name text NOT NULL,
  decrypted_secret text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT statement_timestamp()
);

CREATE FUNCTION net.http_post(
  url text,
  headers jsonb,
  body jsonb,
  timeout_milliseconds integer
)
RETURNS bigint
LANGUAGE sql
AS $$ SELECT 77::bigint $$;

CREATE TABLE cron.job (
  jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  jobname text NOT NULL,
  schedule text NOT NULL,
  command text NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE cron.job_run_details (
  jobid bigint NOT NULL,
  status text,
  start_time timestamptz
);

CREATE FUNCTION cron.schedule(job_name text, cron_schedule text, sql_command text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  scheduled_id bigint;
BEGIN
  INSERT INTO cron.job(jobname, schedule, command)
  VALUES (job_name, cron_schedule, sql_command)
  RETURNING jobid INTO scheduled_id;
  RETURN scheduled_id;
END
$$;

CREATE FUNCTION cron.unschedule(scheduled_id bigint)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM cron.job WHERE jobid = scheduled_id;
  RETURN FOUND;
END
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  )
$$;

CREATE OR REPLACE FUNCTION storage.foldername(path text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_to_array(path, '/')
$$;

CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  public boolean NOT NULL DEFAULT false
);

CREATE TABLE storage.objects (
  id uuid PRIMARY KEY,
  bucket_id text NOT NULL,
  name text NOT NULL,
  owner uuid
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA storage, public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO service_role;

CREATE TABLE public.quotes (
  id uuid PRIMARY KEY,
  seller_id uuid NOT NULL
);

CREATE TABLE public.orders(id uuid PRIMARY KEY);
CREATE TABLE public.discount_approval_requests(id uuid PRIMARY KEY);
CREATE TABLE public.kit_share_tokens(id uuid PRIMARY KEY);

CREATE FUNCTION public.fixture_webhook_dispatch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN NEW;
END
$$;

CREATE TRIGGER trg_dispatch_webhook_quotes
AFTER INSERT ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.fixture_webhook_dispatch();
CREATE TRIGGER trg_dispatch_webhook_orders
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.fixture_webhook_dispatch();
CREATE TRIGGER trg_dispatch_webhook_discount
AFTER INSERT ON public.discount_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.fixture_webhook_dispatch();
CREATE TRIGGER trg_dispatch_webhook_kit_share
AFTER INSERT ON public.kit_share_tokens
FOR EACH ROW EXECUTE FUNCTION public.fixture_webhook_dispatch();

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role text NOT NULL,
  PRIMARY KEY (user_id, role)
);

GRANT SELECT ON public.quotes TO authenticated;

CREATE FUNCTION public.can_manage_quote_scope(actor_id uuid, quote_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.quotes
    WHERE id = quote_id
      AND seller_id = actor_id
  )
$$;

CREATE FUNCTION public.is_supervisor_or_above(actor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT actor_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = actor_id
        AND role IN ('supervisor', 'admin', 'dev')
    )
$$;

REVOKE ALL ON FUNCTION public.can_manage_quote_scope(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_supervisor_or_above(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_quote_scope(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_supervisor_or_above(uuid) TO authenticated, service_role;

CREATE FUNCTION public.get_sicoob_invitation(token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT jsonb_build_object('token', token) $$;

CREATE FUNCTION public.get_public_favorite_list(token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT jsonb_build_object('token', token) $$;

CREATE FUNCTION public.get_public_favorite_reactions(token text, anon_id text)
RETURNS TABLE(item_id uuid, emoji text, reaction_anon_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT NULL::uuid, token, anon_id WHERE false $$;

REVOKE ALL ON FUNCTION public.get_sicoob_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_favorite_list(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_favorite_reactions(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sicoob_invitation(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_favorite_list(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_favorite_reactions(text, text) TO anon, authenticated, service_role;

INSERT INTO storage.buckets(id, public)
VALUES ('proposals', true), ('quarantine', true);

INSERT INTO vault.decrypted_secrets(name, decrypted_secret) VALUES
  ('sicoob_project_url', 'https://fixture-project.supabase.co'),
  ('sicoob_internal_function_secret', repeat('s', 32));

INSERT INTO cron.job(jobname, schedule, command) VALUES
  ('webhook-retry-failed', '* * * * *', 'SELECT 1;'),
  ('webhook-logs-cleanup-daily', '0 3 * * *', 'SELECT 1;');

INSERT INTO cron.job_run_details(jobid, status, start_time)
SELECT jobid, 'succeeded', statement_timestamp()
FROM cron.job;

CREATE POLICY "Public Access to Proposals" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'proposals');

CREATE POLICY "Authenticated users can upload proposals" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proposals');

CREATE POLICY "Authenticated users can delete proposals" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'proposals');

CREATE POLICY "proposals_quote_scope_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'proposals'
  AND (
    owner = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = CASE
        WHEN (storage.foldername(name))[1] = 'quotes'
         AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (storage.foldername(name))[2]::uuid
        ELSE NULL
      END
        AND (q.seller_id = (SELECT auth.uid())
          OR public.can_manage_quote_scope((SELECT auth.uid()), q.id))
    )
  )
);

CREATE POLICY "proposals_quote_scope_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proposals' AND owner = (SELECT auth.uid()));

CREATE POLICY "proposals_quote_scope_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'proposals' AND owner = (SELECT auth.uid()))
WITH CHECK (bucket_id = 'proposals' AND owner = (SELECT auth.uid()));

CREATE POLICY "Sistema pode gerenciar quarentena" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'quarantine')
WITH CHECK (bucket_id = 'quarantine');

CREATE POLICY "Admins podem visualizar quarentena" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'quarantine'
  AND auth.jwt() ->> 'email' LIKE '%admin%'
);

INSERT INTO public.quotes(id, seller_id) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

INSERT INTO public.user_roles(user_id, role) VALUES
  ('00000000-0000-0000-0000-000000000003', 'supervisor');

INSERT INTO storage.objects(id, bucket_id, name, owner) VALUES
  ('20000000-0000-0000-0000-000000000001', 'proposals', 'avulso/owner.pdf', '00000000-0000-0000-0000-000000000001'),
  ('20000000-0000-0000-0000-000000000002', 'proposals', 'quotes/10000000-0000-0000-0000-000000000001/proposta.pdf', '00000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000003', 'proposals', 'quotes/10000000-0000-0000-0000-000000000001/privada.pdf', '00000000-0000-0000-0000-000000000004'),
  ('20000000-0000-0000-0000-000000000004', 'quarantine', 'suspect/arquivo.pdf', '00000000-0000-0000-0000-000000000002');
