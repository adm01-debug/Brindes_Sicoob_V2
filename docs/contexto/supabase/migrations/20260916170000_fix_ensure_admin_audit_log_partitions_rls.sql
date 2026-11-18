-- Reconciliação 16/09/2026 — continuação do achado da Etapa 40/31.
-- A função ensure_admin_audit_log_partitions() (criada nesta mesma sessão,
-- migration 20260916120000) só fazia CREATE TABLE ... PARTITION OF, sem
-- ligar RLS nem criar as policies na partição nova -- o mesmo bug das 9
-- partições manuais, mas rodando todo mês via pg_cron, para sempre, se não
-- fosse corrigido aqui. Registrado como documentação as-built (já executado
-- via MCP e testado com re-chamada idempotente sobre as 15 partições
-- existentes, sem erro).

CREATE OR REPLACE FUNCTION public.ensure_admin_audit_log_partitions(months_ahead integer DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_month date;
  v_name text;
BEGIN
  FOR i IN 0..months_ahead LOOP
    v_month := date_trunc('month', now())::date + (i || ' months')::interval;
    v_name := 'admin_audit_log_y' || to_char(v_month, 'YYYY') || '_m' || to_char(v_month, 'MM');
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.admin_audit_log FOR VALUES FROM (%L) TO (%L)',
      v_name, v_month, v_month + interval '1 month'
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.%I', v_name);
    EXECUTE format($p$CREATE POLICY "Admins can insert audit logs" ON public.%I FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role))$p$, v_name);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can view audit logs" ON public.%I', v_name);
    EXECUTE format($p$CREATE POLICY "Admins can view audit logs" ON public.%I FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role))$p$, v_name);
    EXECUTE format('REVOKE TRUNCATE ON public.%I FROM anon, authenticated', v_name);
  END LOOP;
END;
$function$;

-- Corrige retroativamente as 9 partições que já tinham sido criadas sem
-- RLS/policies por esta função antes da correção.
DO $$
DECLARE
  p text;
BEGIN
  FOREACH p IN ARRAY ARRAY['admin_audit_log_y2026_m07','admin_audit_log_y2026_m08','admin_audit_log_y2026_m09',
    'admin_audit_log_y2026_m10','admin_audit_log_y2026_m11','admin_audit_log_y2026_m12',
    'admin_audit_log_y2027_m01','admin_audit_log_y2027_m02','admin_audit_log_y2027_m03']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.%I', p);
    EXECUTE format($f$CREATE POLICY "Admins can insert audit logs" ON public.%I FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role))$f$, p);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can view audit logs" ON public.%I', p);
    EXECUTE format($f$CREATE POLICY "Admins can view audit logs" ON public.%I FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role))$f$, p);
  END LOOP;
END $$;
