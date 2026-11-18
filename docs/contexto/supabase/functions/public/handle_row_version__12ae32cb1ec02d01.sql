CREATE OR REPLACE FUNCTION public.handle_row_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_table_owner name := pg_catalog.pg_get_userbyid((
    SELECT relation.relowner
    FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = TG_RELID
  ));
BEGIN
  IF current_setting('app.quote_sync_metadata', true) = 'true'
     AND current_user = v_table_owner THEN
    NEW.row_version := OLD.row_version;
  ELSE
    NEW.row_version := OLD.row_version + 1;
  END IF;
  RETURN NEW;
END;
$function$
