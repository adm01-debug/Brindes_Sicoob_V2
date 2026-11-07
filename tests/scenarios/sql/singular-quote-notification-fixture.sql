-- Esquema mínimo para validar elegibilidade de destinatários em PostgreSQL isolado.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE TYPE public.quote_status AS ENUM (
  'draft', 'pending', 'sent', 'approved', 'rejected', 'expired',
  'pending_singular_approval', 'approved_singular', 'rejected_singular'
);

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE public.profiles (
  user_id uuid NOT NULL UNIQUE,
  cooperativa_id uuid,
  role text,
  is_active boolean DEFAULT true,
  deleted_at timestamptz
);
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid,
  singular_id uuid,
  quote_number text,
  status public.quote_status NOT NULL DEFAULT 'pending',
  rejection_notes text,
  approved_at timestamptz,
  approved_by uuid,
  row_version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid, user_id uuid,
  action text, description text, field_changed text, old_value text,
  new_value text, metadata jsonb
);
CREATE TABLE public.workspace_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
  title text NOT NULL, message text NOT NULL, type text NOT NULL,
  category text NOT NULL, action_url text, metadata jsonb
);

CREATE FUNCTION public.can_manage_quote_scope(uuid, uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION public.assert_quote_transition(uuid, public.quotes, text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
