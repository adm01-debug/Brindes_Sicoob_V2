-- Incremento atômico dos contadores de métricas do endpoint de webhook inbound.
-- Substitui o read-modify-write em nível de aplicação (A-025) para eliminar
-- a race condition quando múltiplas requisições chegam simultaneamente.
CREATE OR REPLACE FUNCTION public.increment_webhook_endpoint_metrics(
  p_id          uuid,
  p_received_at timestamptz,
  p_invalid     boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inbound_webhook_endpoints
  SET
    last_received_at = p_received_at,
    total_received   = COALESCE(total_received, 0) + 1,
    total_invalid    = COALESCE(total_invalid,  0) + CASE WHEN p_invalid THEN 1 ELSE 0 END
  WHERE id = p_id;
END;
$$;

COMMENT ON FUNCTION public.increment_webhook_endpoint_metrics(uuid, timestamptz, boolean) IS
  'Atualiza atomicamente last_received_at, total_received e total_invalid do endpoint.
   Chamada pela edge function webhook-inbound em substituição ao UPDATE com valores lidos
   previamente (read-modify-write), eliminando a race condition sob carga concorrente.';
