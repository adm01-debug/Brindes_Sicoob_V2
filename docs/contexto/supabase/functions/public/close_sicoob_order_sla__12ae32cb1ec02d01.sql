CREATE OR REPLACE FUNCTION public.close_sicoob_order_sla()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Só transição de status chega aqui (o gatilho é OF status), então não há
  -- regravação periódica: cada ciclo encerrado sobrescreve `sla_closed_*` com
  -- os dados do ciclo que acabou de terminar. Bloquear quando `sla_closed_at`
  -- já existia impedia a diretoria de registrar o ciclo da escalação.
  IF OLD.sla_deadline IS NOT NULL
     AND OLD.status IN ('waiting_approval', 'escalated_to_board')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.sla_closed_at := now();
    NEW.sla_closed_status := CASE
      WHEN OLD.sla_deadline < now() THEN 'critical'
      WHEN OLD.sla_deadline < now() + interval '9 hours 36 minutes' THEN 'warning'
      ELSE 'normal'
    END;
    -- Desfecho do ciclo medido ANTES de a aprovação reescrever o prazo:
    -- recusado nunca vira "aprovado com atraso", e a escalação fecha o ciclo
    -- com o desfecho real, mesmo que `set_sicoob_order_sla_deadline` abra um
    -- novo prazo no mesmo UPDATE (é a mesma linha, então `sla_closed_*` fica).
    NEW.sla_closed_outcome := CASE
      WHEN NEW.status = 'rejected' THEN 'rejected'
      WHEN NEW.status = 'cancelled' THEN 'cancelled'
      WHEN NEW.status = 'escalated_to_board' THEN 'escalated'
      ELSE 'approved'
    END;
  END IF;

  RETURN NEW;
END;
$function$
