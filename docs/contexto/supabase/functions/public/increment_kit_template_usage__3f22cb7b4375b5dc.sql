CREATE OR REPLACE FUNCTION public.increment_kit_template_usage(_template_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  UPDATE public.kit_templates
  SET usage_count = usage_count + 1
  WHERE id = _template_id AND is_active = true;
END;
$function$
