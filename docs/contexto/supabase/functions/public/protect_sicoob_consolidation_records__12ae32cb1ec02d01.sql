CREATE OR REPLACE FUNCTION public.protect_sicoob_consolidation_records()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operation text := current_setting('app.sicoob_consolidation_operation', true);
BEGIN
  IF TG_TABLE_NAME = 'sicoob_delivery_receipt_events' AND TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Eventos de recebimento são imutáveis.';
  END IF;
  IF COALESCE(v_operation, '') NOT IN ('create', 'allocate', 'dispatch', 'receive') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Consolidação só pode ser alterada pelo fluxo transacional.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
