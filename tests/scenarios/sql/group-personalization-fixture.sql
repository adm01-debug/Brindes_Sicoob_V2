-- Contrato mínimo das quatro tabelas já expostas na API de construção.
CREATE TABLE public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_code text NOT NULL,
  group_name text NOT NULL, is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE public.product_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_group_id uuid NOT NULL REFERENCES public.product_groups(id),
  product_id text NOT NULL, use_group_rules boolean NOT NULL DEFAULT true
);
CREATE TABLE public.product_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id text NOT NULL,
  component_code text NOT NULL, component_name text NOT NULL,
  is_personalizable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true, sort_order integer DEFAULT 0
);
CREATE TABLE public.product_component_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES public.product_components(id),
  location_code text NOT NULL, location_name text NOT NULL,
  max_width_cm numeric, max_height_cm numeric, is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.product_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_component_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY group_member_admin ON public.product_group_members
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY component_admin ON public.product_components
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY location_admin ON public.product_component_locations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_group_members,
  public.product_components, public.product_component_locations TO authenticated, service_role;
INSERT INTO public.user_roles VALUES ('00000000-0000-0000-0000-000000000004', 'admin');
INSERT INTO public.product_groups(id, group_code, group_name) VALUES
 ('00000000-0000-0000-0000-000000000101', 'CANETAS', 'Canetas');
INSERT INTO public.product_group_members(id, product_group_id, product_id) VALUES
 ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000101', 'SKU-EXTERNO-1');
INSERT INTO public.product_components(id, product_id, component_code, component_name) VALUES
 ('00000000-0000-0000-0000-000000000103', 'SKU-EXTERNO-1', 'ANTERIOR', 'Regra anterior');
