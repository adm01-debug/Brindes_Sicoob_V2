CREATE OR REPLACE FUNCTION public.trim_connection_test_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.connection_test_history
  WHERE connection_id = NEW.connection_id
    AND id NOT IN (
      SELECT id FROM public.connection_test_history
      WHERE connection_id = NEW.connection_id
      ORDER BY tested_at DESC
      LIMIT 200
    );
  RETURN NEW;
END;
$function$
