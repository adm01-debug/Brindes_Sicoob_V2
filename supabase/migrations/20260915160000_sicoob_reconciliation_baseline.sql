-- Baseline aditiva para o projeto Sicoob em construção.
-- Não reaplica as migrations históricas: o banco já contém parte do modelo
-- operacional, porém não possui o respectivo histórico no ledger remoto.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS singular_id uuid,
  ADD COLUMN IF NOT EXISTS carteira_id uuid;

CREATE OR REPLACE FUNCTION public.get_user_pa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pa_id
  FROM public.profiles
  WHERE user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_user_singular_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT singular_id
  FROM public.profiles
  WHERE user_id = auth.uid() OR id = auth.uid()
  LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.order_consolidations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singular_id uuid NOT NULL,
  vendedor_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_value numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_value >= 0),
  order_count integer NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  consolidated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.order_consolidations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sicoob_orders
  ADD COLUMN IF NOT EXISTS consolidation_id uuid REFERENCES public.order_consolidations(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS order_number text,
  ADD COLUMN IF NOT EXISTS approval_policy_id uuid,
  ADD COLUMN IF NOT EXISTS approval_policy_version text,
  ADD COLUMN IF NOT EXISTS approval_policy_snapshot jsonb;

UPDATE public.sicoob_orders
SET order_number = 'SIC-' || upper(substring(id::text, 1, 8))
WHERE order_number IS NULL OR btrim(order_number) = '';

ALTER TABLE public.sicoob_orders
  ALTER COLUMN order_number SET DEFAULT ('SIC-' || upper(substring(gen_random_uuid()::text, 1, 8))),
  ALTER COLUMN order_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_sicoob_orders_order_number
  ON public.sicoob_orders(order_number);

ALTER TABLE public.sicoob_order_items
  ADD COLUMN IF NOT EXISTS product_image_url text,
  ADD COLUMN IF NOT EXISTS product_sku text,
  ADD COLUMN IF NOT EXISTS color_name text,
  ADD COLUMN IF NOT EXISTS color_hex text,
  ADD COLUMN IF NOT EXISTS variant_id uuid,
  ADD COLUMN IF NOT EXISTS variant_sku text,
  ADD COLUMN IF NOT EXISTS size_code text,
  ADD COLUMN IF NOT EXISTS personalization_snapshot jsonb;

REVOKE ALL ON FUNCTION public.get_user_pa_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_singular_id() FROM PUBLIC;
