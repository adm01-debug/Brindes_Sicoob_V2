CREATE OR REPLACE FUNCTION public.protect_sicoob_approval_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_operation text := current_setting('app.sicoob_approval_operation', true);
BEGIN
  IF NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
     OR NEW.request_reason IS DISTINCT FROM OLD.request_reason
     OR NEW.amount_at_request IS DISTINCT FROM OLD.amount_at_request
     OR NEW.threshold_at_request IS DISTINCT FROM OLD.threshold_at_request THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Os dados submetidos para aprovação são imutáveis.';
  END IF;

  IF NEW.metadata IS DISTINCT FROM OLD.metadata AND v_operation IS DISTINCT FROM 'escalate' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Os metadados da solicitação não podem ser alterados fora da escalação formal.';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'pending'
       OR (NEW.status = 'approved' AND v_operation IS DISTINCT FROM 'approve')
       OR (NEW.status = 'rejected' AND v_operation IS DISTINCT FROM 'reject') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O resultado da aprovação exige RPC de decisão formal.';
    END IF;
  END IF;

  IF NEW.approver_id IS DISTINCT FROM OLD.approver_id
     AND v_operation IS DISTINCT FROM 'approve'
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O aprovador só pode ser definido na decisão formal.';
  END IF;

  IF NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason
     AND v_operation IS DISTINCT FROM 'reject' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O motivo de rejeição só pode ser definido na decisão formal.';
  END IF;

  RETURN NEW;
END;
$function$
