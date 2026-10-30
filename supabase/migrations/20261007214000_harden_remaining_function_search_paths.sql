-- Fecha os quatro avisos restantes de search_path mutável reportados pelo
-- advisor de segurança do Supabase. São trigger functions sem necessidade de
-- resolução dinâmica de objetos; pg_catalog e public bastam para seus corpos.

ALTER FUNCTION public.handle_updated_at()
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.sync_is_active_with_deleted_at()
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.determine_sicoob_order_flow_status()
  SET search_path TO pg_catalog, public;

ALTER FUNCTION public.update_notification_updated_at()
  SET search_path TO pg_catalog, public;

DO $migration$
DECLARE
  v_unsafe_count integer;
BEGIN
  SELECT count(*)
    INTO v_unsafe_count
  FROM pg_proc AS p
  WHERE p.oid = ANY (ARRAY[
    'public.handle_updated_at()'::regprocedure,
    'public.sync_is_active_with_deleted_at()'::regprocedure,
    'public.determine_sicoob_order_flow_status()'::regprocedure,
    'public.update_notification_updated_at()'::regprocedure
  ]::oid[])
    AND NOT COALESCE(
      p.proconfig @> ARRAY['search_path=pg_catalog, public']::text[],
      false
    );

  IF v_unsafe_count <> 0 THEN
    RAISE EXCEPTION 'Search path seguro não foi aplicado a % função(ões)', v_unsafe_count;
  END IF;
END;
$migration$;
