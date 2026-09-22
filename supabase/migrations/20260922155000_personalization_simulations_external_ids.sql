-- Simulações são registros do portal; produto e cliente vêm de catálogos externos.
-- A migration histórica 20251214212212 dependia de products/bitrix_clients locais
-- inexistentes neste projeto e não deve ser aplicada em paralelo a esta tabela.
CREATE TABLE public.personalization_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text,
  product_id text,
  product_name text NOT NULL,
  product_sku text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  product_unit_price numeric NOT NULL DEFAULT 0 CHECK (product_unit_price >= 0),
  simulation_data jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(simulation_data) = 'array'),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX personalization_simulations_seller_created_idx
  ON public.personalization_simulations(seller_id, created_at DESC);

CREATE TRIGGER update_personalization_simulations_updated_at
  BEFORE UPDATE ON public.personalization_simulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.personalization_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY personalization_simulations_owner_select
  ON public.personalization_simulations FOR SELECT TO authenticated
  USING (seller_id = auth.uid());
CREATE POLICY personalization_simulations_owner_insert
  ON public.personalization_simulations FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());
CREATE POLICY personalization_simulations_owner_update
  ON public.personalization_simulations FOR UPDATE TO authenticated
  USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());
CREATE POLICY personalization_simulations_owner_delete
  ON public.personalization_simulations FOR DELETE TO authenticated
  USING (seller_id = auth.uid());

REVOKE ALL ON TABLE public.personalization_simulations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.personalization_simulations TO authenticated, service_role;
