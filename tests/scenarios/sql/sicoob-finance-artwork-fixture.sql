CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE auth.users (id uuid PRIMARY KEY);

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
INSERT INTO storage.buckets VALUES ('sicoob-order-documents', 'sicoob-order-documents', false);

CREATE TABLE public.sicoob_orders (
  id uuid PRIMARY KEY,
  created_by uuid,
  status text,
  total_amount numeric(14,2),
  is_pilot_order boolean DEFAULT false
);
CREATE TABLE public.user_roles (user_id uuid, role text);

CREATE FUNCTION public.sicoob_actor_can_manage_fulfillment(p_actor_id uuid, p_order_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.sicoob_orders WHERE id = p_order_id AND created_by = p_actor_id)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_actor_id AND role = 'supervisor')
$$;

CREATE POLICY storage_owner_read ON storage.objects
FOR SELECT TO authenticated USING (owner = auth.uid());

CREATE FUNCTION public.assert_sicoob_approval_actor(
  p_actor_id uuid, p_order_id uuid, p_requester_id uuid DEFAULT NULL, p_board_only boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_actor_id = p_requester_id
     OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_actor_id AND role = 'supervisor') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Aprovador inválido.';
  END IF;
END;
$$;
