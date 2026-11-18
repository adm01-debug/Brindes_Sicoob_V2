CREATE OR REPLACE FUNCTION public.validate_main_order_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_transitions jsonb := '{
    "rascunho": ["enviado_gestor", "cancelado"],
    "enviado_gestor": ["aprovado_gestor", "rascunho", "cancelado"],
    "aprovado_gestor": ["enviado_vendedor", "cancelado"],
    "enviado_vendedor": ["em_producao", "cancelado"],
    "em_producao": ["em_separacao", "cancelado"],
    "em_separacao": ["em_transporte", "cancelado"],
    "em_transporte": ["entregue", "cancelado"],
    "entregue": ["concluido", "cancelado"],
    "concluido": [],
    "cancelado": []
  }'::jsonb;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    v_transitions ? OLD.status
    AND NEW.status = ANY (ARRAY(
      SELECT jsonb_array_elements_text(v_transitions -> OLD.status)
    ))
  ) THEN
    RAISE EXCEPTION 'Transição de status inválida no workflow: de % para %',
      OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$function$
