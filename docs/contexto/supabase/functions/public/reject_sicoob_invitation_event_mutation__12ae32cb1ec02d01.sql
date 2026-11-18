CREATE OR REPLACE FUNCTION public.reject_sicoob_invitation_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '55000',
    MESSAGE = 'Eventos de convite são imutáveis.';
END;
$function$
