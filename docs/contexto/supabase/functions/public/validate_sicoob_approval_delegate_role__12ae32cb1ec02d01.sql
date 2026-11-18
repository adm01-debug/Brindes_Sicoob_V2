CREATE OR REPLACE FUNCTION public.validate_sicoob_approval_delegate_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id=NEW.delegate_id AND role::text='comprador_pac'
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE='42501',
      MESSAGE='O substituto precisa possuir o papel operacional comprador_pac.';
  END IF;
  RETURN NEW;
END;
$function$
