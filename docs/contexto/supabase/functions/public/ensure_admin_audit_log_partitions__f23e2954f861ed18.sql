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
    -- Toda particao nova precisa repetir RLS + policies + revoke de TRUNCATE
    -- manualmente -- particao filha NAO herda isso do pai automaticamente.
    -- Faltou aqui na primeira versao desta funcao (achado em 16/09/2026).
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_name);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.%I', v_name);
    EXECUTE format($p$CREATE POLICY "Admins can insert audit logs" ON public.%I FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role))$p$, v_name);
    EXECUTE format('DROP POLICY IF EXISTS "Admins can view audit logs" ON public.%I', v_name);
    EXECUTE format($p$CREATE POLICY "Admins can view audit logs" ON public.%I FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role))$p$, v_name);
    EXECUTE format('REVOKE TRUNCATE ON public.%I FROM anon, authenticated', v_name);
  END LOOP;
END;
$function$
