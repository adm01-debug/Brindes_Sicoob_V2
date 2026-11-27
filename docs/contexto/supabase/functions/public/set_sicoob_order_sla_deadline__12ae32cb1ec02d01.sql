CREATE OR REPLACE FUNCTION public.set_sicoob_order_sla_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entrou_em_aprovacao boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_entrou_em_aprovacao := NEW.status IN ('waiting_approval', 'escalated_to_board');
  ELSE
    v_entrou_em_aprovacao := NEW.status IN ('waiting_approval', 'escalated_to_board')
      AND OLD.status IS DISTINCT FROM NEW.status;
  END IF;

  IF v_entrou_em_aprovacao THEN
    NEW.sla_deadline := now() + interval '48 hours';
    NEW.sla_status := 'normal';
  END IF;

  RETURN NEW;
END;
$function$
