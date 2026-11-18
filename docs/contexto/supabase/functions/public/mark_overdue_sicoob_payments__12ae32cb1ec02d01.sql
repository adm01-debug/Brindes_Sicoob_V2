CREATE OR REPLACE FUNCTION public.mark_overdue_sicoob_payments()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  PERFORM set_config('app.sicoob_payment_operation', 'overdue', true);
  UPDATE public.sicoob_order_payments
     SET status = 'overdue', updated_at = clock_timestamp()
   WHERE status = 'pending'
     AND due_date < (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
