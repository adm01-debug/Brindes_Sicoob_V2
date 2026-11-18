CREATE OR REPLACE FUNCTION public.preserve_catalog_marketing_term_authorship()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by é imutável em catalog_marketing_terms';
  END IF;

  NEW.updated_by := (SELECT auth.uid());
  RETURN NEW;
END;
$function$
