CREATE OR REPLACE FUNCTION public.check_order_sla()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Fora do fluxo de aprovação o prazo é histórico: recalcular 'critical' ali
  -- devolvia o pedido já decidido ao contador de alertas a cada escrita.
  -- Em UPDATE, `status` só existe em NEW quando a coluna está no SET; nas
  -- escritas que mexem apenas em SLA (recálculo) o valor atual vem de OLD.
  IF NEW.sla_deadline IS NOT NULL
     AND COALESCE(
           CASE WHEN TG_OP = 'INSERT' THEN NEW.status ELSE OLD.status END,
           NEW.status
         ) IN ('pending', 'waiting_approval', 'escalated_to_board') THEN
    IF NEW.sla_deadline < now() THEN
      NEW.sla_status := 'critical';
    ELSIF NEW.sla_deadline < now() + interval '9 hours 36 minutes' THEN
      NEW.sla_status := 'warning';
    ELSE
      NEW.sla_status := 'normal';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
