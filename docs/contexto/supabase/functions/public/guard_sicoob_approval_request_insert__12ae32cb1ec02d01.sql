CREATE OR REPLACE FUNCTION public.guard_sicoob_approval_request_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.sicoob_approval_operation', true) IS DISTINCT FROM 'request' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'A solicitação de aprovação exige a RPC formal.';
  END IF;

  IF auth.uid() IS NULL OR NEW.requester_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'O solicitante informado não corresponde à identidade autenticada.';
  END IF;

  RETURN NEW;
END;
$function$
