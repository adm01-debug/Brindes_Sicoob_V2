CREATE OR REPLACE FUNCTION public.get_sicoob_approval_delivery_summary(p_request_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('delivered',count(*) FILTER (WHERE state='delivered'),
    'pending',count(*) FILTER (WHERE state IN ('pending','sending','retry')),
    'uncertain',count(*) FILTER (WHERE state='uncertain'),
    'failed',count(*) FILTER (WHERE state='failed'), 'cancelled',count(*) FILTER (WHERE state='cancelled'))
  FROM public.sicoob_approval_deliveries WHERE p_request_id IS NULL OR request_id=p_request_id;
$function$
