CREATE OR REPLACE FUNCTION public.copy_group_personalization_to_product(p_membership_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
END; $function$
