-- Regras locais para IDs do catálogo externo; não cria cópia de produtos/técnicas.
-- Falha se um dos nomes já existir: nesse caso, inspecionar o objeto real antes
-- de autorizar grants ou substituir um schema desconhecido.
DO $$
BEGIN
  IF to_regclass('public.product_group_components') IS NOT NULL
     OR to_regclass('public.product_group_locations') IS NOT NULL
     OR to_regclass('public.product_group_location_techniques') IS NOT NULL
     OR to_regclass('public.product_component_location_techniques') IS NOT NULL THEN
    RAISE EXCEPTION 'Templates de personalização já existem; reconcilie o schema antes de aplicar.';
  END IF;
  IF to_regclass('public.product_groups') IS NULL
     OR to_regclass('public.product_group_members') IS NULL
     OR to_regclass('public.product_components') IS NULL
     OR to_regclass('public.product_component_locations') IS NULL THEN
    RAISE EXCEPTION 'Dependência local de personalização ausente.';
  END IF;
END $$;

ALTER TABLE public.product_component_locations
  ADD COLUMN IF NOT EXISTS max_area_cm2 numeric(10,2),
  ADD COLUMN IF NOT EXISTS area_image_url text;

CREATE TABLE public.product_group_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_group_id uuid NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  component_code text NOT NULL,
  component_name text NOT NULL,
  is_personalizable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_group_id, component_code)
);
CREATE INDEX product_group_components_group_order_idx
  ON public.product_group_components(product_group_id, sort_order);

CREATE TABLE public.product_group_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_component_id uuid NOT NULL REFERENCES public.product_group_components(id) ON DELETE CASCADE,
  location_code text NOT NULL,
  location_name text NOT NULL,
  max_width_cm numeric(10,2),
  max_height_cm numeric(10,2),
  max_area_cm2 numeric(10,2),
  area_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_component_id, location_code),
  CHECK (max_width_cm IS NULL OR max_width_cm > 0),
  CHECK (max_height_cm IS NULL OR max_height_cm > 0),
  CHECK (max_area_cm2 IS NULL OR max_area_cm2 > 0)
);
CREATE INDEX product_group_locations_component_idx
  ON public.product_group_locations(group_component_id);

CREATE TABLE public.product_group_location_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_location_id uuid NOT NULL REFERENCES public.product_group_locations(id) ON DELETE CASCADE,
  technique_id text NOT NULL CHECK (length(btrim(technique_id)) > 0),
  technique_code text NOT NULL CHECK (length(btrim(technique_code)) > 0),
  max_colors integer CHECK (max_colors IS NULL OR max_colors > 0),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_location_id, technique_id)
);
CREATE INDEX product_group_location_techniques_location_idx
  ON public.product_group_location_techniques(group_location_id);
CREATE UNIQUE INDEX product_group_location_techniques_one_default_idx
  ON public.product_group_location_techniques(group_location_id)
  WHERE is_default AND is_active;

CREATE TABLE public.product_component_location_techniques (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_location_id uuid NOT NULL REFERENCES public.product_component_locations(id) ON DELETE CASCADE,
  technique_id text NOT NULL CHECK (length(btrim(technique_id)) > 0),
  composed_code text NOT NULL,
  max_colors integer CHECK (max_colors IS NULL OR max_colors > 0),
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (component_location_id, technique_id)
);
CREATE INDEX product_component_location_techniques_location_idx
  ON public.product_component_location_techniques(component_location_id);
CREATE UNIQUE INDEX product_component_location_techniques_one_default_idx
  ON public.product_component_location_techniques(component_location_id)
  WHERE is_default AND is_active;

ALTER TABLE public.product_group_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_group_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_group_location_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_component_location_techniques ENABLE ROW LEVEL SECURITY;

CREATE POLICY group_components_read ON public.product_group_components
  FOR SELECT TO authenticated USING (true);
CREATE POLICY group_components_admin ON public.product_group_components
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY group_locations_read ON public.product_group_locations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY group_locations_admin ON public.product_group_locations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY group_techniques_read ON public.product_group_location_techniques
  FOR SELECT TO authenticated USING (true);
CREATE POLICY group_techniques_admin ON public.product_group_location_techniques
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY product_techniques_read ON public.product_component_location_techniques
  FOR SELECT TO authenticated USING (true);
CREATE POLICY product_techniques_admin ON public.product_component_location_techniques
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.product_group_components, public.product_group_locations,
  public.product_group_location_techniques, public.product_component_location_techniques FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_group_components,
  public.product_group_locations, public.product_group_location_techniques,
  public.product_component_location_techniques TO authenticated, service_role;

-- A substituição inteira ocorre na transação de uma RPC. Falhas de FK,
-- validação ou RLS deixam a personalização anterior intacta.
CREATE FUNCTION public.copy_group_personalization_to_product(p_membership_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_catalog AS $$
DECLARE
  v_member record;
  v_group_component record;
  v_group_location record;
  v_group_technique record;
  v_component_id uuid;
  v_location_id uuid;
  v_copied integer := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR NOT COALESCE(public.has_role(auth.uid(), 'admin'::public.app_role), false)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Apenas administradores podem copiar regras.';
  END IF;

  SELECT id, product_id, product_group_id INTO v_member
    FROM public.product_group_members WHERE id = p_membership_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Associação de produto não encontrada.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_member.product_id, 0));
  IF NOT EXISTS (SELECT 1 FROM public.product_group_components
                 WHERE product_group_id = v_member.product_group_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Grupo sem componentes.';
  END IF;

  DELETE FROM public.product_component_location_techniques pt
  USING public.product_component_locations pl, public.product_components pc
  WHERE pt.component_location_id = pl.id AND pl.component_id = pc.id
    AND pc.product_id = v_member.product_id;
  DELETE FROM public.product_component_locations pl
  USING public.product_components pc
  WHERE pl.component_id = pc.id AND pc.product_id = v_member.product_id;
  DELETE FROM public.product_components WHERE product_id = v_member.product_id;

  FOR v_group_component IN
    SELECT * FROM public.product_group_components
    WHERE product_group_id = v_member.product_group_id ORDER BY sort_order, id
  LOOP
    INSERT INTO public.product_components
      (product_id, component_code, component_name, is_personalizable, is_active, sort_order)
    VALUES (v_member.product_id, v_group_component.component_code,
      v_group_component.component_name, v_group_component.is_personalizable,
      v_group_component.is_active, v_group_component.sort_order)
    RETURNING id INTO v_component_id;
    v_copied := v_copied + 1;

    FOR v_group_location IN
      SELECT * FROM public.product_group_locations
      WHERE group_component_id = v_group_component.id ORDER BY id
    LOOP
      INSERT INTO public.product_component_locations
        (component_id, location_code, location_name, max_width_cm,
         max_height_cm, max_area_cm2, area_image_url, is_active)
      VALUES (v_component_id, v_group_location.location_code,
        v_group_location.location_name, v_group_location.max_width_cm,
        v_group_location.max_height_cm, v_group_location.max_area_cm2,
        v_group_location.area_image_url, v_group_location.is_active)
      RETURNING id INTO v_location_id;

      FOR v_group_technique IN
        SELECT * FROM public.product_group_location_techniques
        WHERE group_location_id = v_group_location.id ORDER BY id
      LOOP
        INSERT INTO public.product_component_location_techniques
          (component_location_id, technique_id, composed_code, max_colors,
           is_default, is_active)
        VALUES (v_location_id, v_group_technique.technique_id,
          concat_ws('-', v_group_component.component_code,
            v_group_location.location_code, v_group_technique.technique_code),
          v_group_technique.max_colors, v_group_technique.is_default,
          v_group_technique.is_active);
      END LOOP;
    END LOOP;
  END LOOP;

  UPDATE public.product_group_members SET use_group_rules = false
  WHERE id = v_member.id;
  RETURN v_copied;
END; $$;
REVOKE ALL ON FUNCTION public.copy_group_personalization_to_product(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_group_personalization_to_product(uuid)
  TO authenticated, service_role;
