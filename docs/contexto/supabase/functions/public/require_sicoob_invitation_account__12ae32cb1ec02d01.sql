CREATE OR REPLACE FUNCTION public.require_sicoob_invitation_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE lower(u.email) = NEW.email
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Crie a conta do usuário antes de emitir o convite institucional.';
  END IF;
  RETURN NEW;
END;
$function$
