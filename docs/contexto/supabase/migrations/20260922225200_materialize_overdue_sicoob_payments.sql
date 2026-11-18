-- Materializa o vencimento no banco para que relatórios, exportações e todas as
-- interfaces observem o mesmo estado financeiro, no calendário de Brasília.
CREATE OR REPLACE FUNCTION public.protect_sicoob_order_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
REVOKE ALL ON FUNCTION public.protect_sicoob_order_payment() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_overdue_sicoob_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  PERFORM set_config('app.sicoob_payment_operation', 'overdue', true);
  UPDATE public.sicoob_order_payments
     SET status = 'overdue', updated_at = clock_timestamp()
   WHERE status = 'pending'
     AND due_date < (clock_timestamp() AT TIME ZONE 'America/Sao_Paulo')::date;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_overdue_sicoob_payments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_overdue_sicoob_payments() TO service_role;

-- Corrige o estado já vencido no momento da implantação.
SELECT public.mark_overdue_sicoob_payments();

DO $block$
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'sicoob-materialize-overdue-payments';
END;
$block$;

SELECT cron.schedule(
  'sicoob-materialize-overdue-payments',
  '17 * * * *',
  $cron$SELECT public.mark_overdue_sicoob_payments();$cron$
);
