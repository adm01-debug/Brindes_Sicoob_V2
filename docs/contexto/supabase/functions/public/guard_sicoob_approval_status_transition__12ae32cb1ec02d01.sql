CREATE OR REPLACE FUNCTION public.guard_sicoob_approval_status_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operation text := current_setting('app.sicoob_approval_operation', true);
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status, NEW.status) = ('pending', 'waiting_approval')
     AND v_operation IS DISTINCT FROM 'prepare' AND v_operation IS DISTINCT FROM 'request' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A entrada em aprovação exige preparação ou solicitação formal.';
  END IF;

  IF (OLD.status, NEW.status) = ('waiting_approval', 'escalated_to_board')
     AND v_operation IS DISTINCT FROM 'escalate' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A escalação exige solicitação formal para a Diretoria.';
  END IF;

  IF NEW.status = 'confirmed'
     AND v_operation IS DISTINCT FROM 'confirm' AND v_operation IS DISTINCT FROM 'approve' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A confirmação exige uma decisão formal de alçada.';
  END IF;

  IF NEW.status = 'rejected'
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A rejeição exige motivo e decisão formal.';
  END IF;

  RETURN NEW;
END;
$function$
