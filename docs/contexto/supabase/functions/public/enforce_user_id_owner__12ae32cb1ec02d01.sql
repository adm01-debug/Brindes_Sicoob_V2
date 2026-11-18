CREATE OR REPLACE FUNCTION public.enforce_user_id_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := v_uid;
    RETURN NEW;
  END IF;

  IF NEW.user_id <> v_uid AND NOT public._can_act_on_behalf_of_others() THEN
    RAISE EXCEPTION 'Não autorizado: user_id (%) difere do usuário autenticado (%).',
      NEW.user_id, v_uid USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_user_id_owner failed: %', SQLERRM;
    RETURN NEW;
END;
$function$
