CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$ SELECT NULL::uuid $$;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  public boolean NOT NULL DEFAULT false
);
INSERT INTO storage.buckets (id, public)
VALUES
  ('personalization-images', false),
  ('product-videos', false),
  ('supplier-logos', false),
  ('component-media', false);

CREATE SCHEMA cron;
CREATE TABLE cron.job (
  jobname text PRIMARY KEY,
  active boolean NOT NULL
);
INSERT INTO cron.job VALUES ('cleanup-security-logs-daily', true);

CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
CREATE TABLE public.workspace_notifications (
  user_id uuid,
  title text,
  message text,
  type text,
  category text,
  action_url text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.custom_kits (id uuid, user_id uuid);
CREATE TABLE public.device_login_notifications (id uuid, user_id uuid);
CREATE TABLE public.discount_approval_requests (id uuid, user_id uuid);
CREATE TABLE public.integration_credentials (id uuid, user_id uuid);
CREATE TABLE public.kit_comments (id uuid, user_id uuid);
CREATE TABLE public.login_attempts (id uuid, user_id uuid);
CREATE TABLE public.notifications (id uuid, user_id uuid);
CREATE TABLE public.orders (id uuid, user_id uuid);
CREATE TABLE public.product_views (id uuid, user_id uuid);
CREATE TABLE public.quotes (id uuid, user_id uuid);
CREATE TABLE public.search_analytics (id uuid, user_id uuid);
CREATE TABLE public.sicoob_orders (id uuid, user_id uuid);

DO $fixture$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'custom_kits',
    'device_login_notifications',
    'discount_approval_requests',
    'integration_credentials',
    'kit_comments',
    'login_attempts',
    'notifications',
    'orders',
    'product_views',
    'quotes',
    'search_analytics',
    'sicoob_orders'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    IF target_table <> 'login_attempts' THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()))',
        target_table || '_fixture_select',
        target_table
      );
    END IF;
  END LOOP;
END
$fixture$;

CREATE POLICY login_attempts_admin_fixture
ON public.login_attempts
FOR SELECT
TO authenticated
USING (false);

CREATE SCHEMA extensions;
CREATE EXTENSION pg_trgm WITH SCHEMA extensions;
CREATE PUBLICATION supabase_realtime;
