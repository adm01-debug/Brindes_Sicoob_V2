CREATE OR REPLACE FUNCTION public.validate_order_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transitions jsonb := '{
    "draft": ["pending", "cancelled"],
    "pending": ["waiting_approval", "cancelled"],
    "waiting_approval": ["confirmed", "rejected", "escalated_to_board", "cancelled"],
    "escalated_to_board": ["confirmed", "rejected", "cancelled"],
    "confirmed": ["logistic", "in_production", "cancelled"],
    "logistic": ["completed", "cancelled"],
    "in_production": ["in_separation", "cancelled"],
    "in_separation": ["in_transit", "cancelled"],
    "in_transit": ["delivered", "cancelled"],
    "delivered": ["completed", "cancelled"],
    "completed": [],
    "rejected": ["draft", "pending"],
    "cancelled": []
  }'::jsonb;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    v_transitions ? OLD.status AND
    NEW.status = ANY (ARRAY(
      SELECT jsonb_array_elements_text(v_transitions -> OLD.status)
    ))
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = format('Transição de status inválida: de %s para %s', OLD.status, NEW.status);
  END IF;

  RETURN NEW;
END;
$function$
