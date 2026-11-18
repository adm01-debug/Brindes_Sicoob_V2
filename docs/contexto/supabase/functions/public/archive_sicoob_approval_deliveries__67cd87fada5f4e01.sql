CREATE OR REPLACE FUNCTION public.archive_sicoob_approval_deliveries(p_batch_size integer DEFAULT 1000)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_count integer;
BEGIN
  IF p_batch_size NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Tamanho de lote inválido.' USING ERRCODE='22023';
  END IF;
  WITH candidates AS (
    SELECT d.id,
      CASE WHEN d.state IN ('delivered','cancelled') THEN 'delivered_or_cancelled_180d'
           ELSE 'failed_or_uncertain_365d' END AS reason
    FROM public.sicoob_approval_deliveries d
    WHERE ((d.state IN ('delivered','cancelled') AND d.updated_at < clock_timestamp()-interval '180 days')
       OR (d.state IN ('failed','uncertain') AND d.updated_at < clock_timestamp()-interval '365 days'))
      AND NOT EXISTS (SELECT 1 FROM public.sicoob_approval_deliveries child WHERE child.supersedes_delivery_id=d.id)
    ORDER BY d.updated_at,d.id FOR UPDATE SKIP LOCKED LIMIT p_batch_size
  ), archived AS (
    INSERT INTO public.sicoob_approval_delivery_archive(delivery_id,delivery_record,retention_reason)
    SELECT d.id,to_jsonb(d),c.reason FROM candidates c
    JOIN public.sicoob_approval_deliveries d ON d.id=c.id
    ON CONFLICT(delivery_id) DO NOTHING RETURNING delivery_id
  )
  DELETE FROM public.sicoob_approval_deliveries d USING archived a WHERE d.id=a.delivery_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
