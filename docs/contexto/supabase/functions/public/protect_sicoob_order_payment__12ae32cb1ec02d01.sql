CREATE OR REPLACE FUNCTION public.protect_sicoob_order_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(current_setting('app.sicoob_payment_operation', true), '')
     NOT IN ('record', 'refund', 'overdue') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Pagamentos só podem ser alterados pelo fluxo financeiro formal.';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Registros financeiros não podem ser excluídos.';
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.order_id IS DISTINCT FROM OLD.order_id
    OR NEW.installment_number IS DISTINCT FROM OLD.installment_number
    OR NEW.created_by IS DISTINCT FROM OLD.created_by
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Identidade da parcela financeira é imutável.';
  END IF;
  RETURN NEW;
END;
$function$
