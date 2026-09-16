-- ============================================================
-- APLICAR NO SUPABASE SQL EDITOR — projeto cfmzkthhgliqelozlmwu
-- Rodada combinada: particoes/limpeza do log de auditoria (Etapa 40/41)
-- + fecha 2 policies abertas demais (Etapa 30)
-- Gerado em 16/09/2026
-- ============================================================
BEGIN;

-- ---------- PARTE 1: particoes e limpeza (Etapa 40/41) ----------

DROP TABLE IF EXISTS public.admin_audit_log_old;
DROP TABLE IF EXISTS public.admin_audit_log_archive;

CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2026_m07
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2026_m08
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2026_m09
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2026_m10
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2026_m11
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2026_m12
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2027_m01
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2027-01-01') TO ('2027-02-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2027_m02
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2027-02-01') TO ('2027-03-01');
CREATE TABLE IF NOT EXISTS public.admin_audit_log_y2027_m03
  PARTITION OF public.admin_audit_log FOR VALUES FROM ('2027-03-01') TO ('2027-04-01');

WITH moved AS (
  DELETE FROM public.admin_audit_log_default
  RETURNING *
)
INSERT INTO public.admin_audit_log SELECT * FROM moved;

CREATE OR REPLACE FUNCTION public.ensure_admin_audit_log_partitions(months_ahead integer DEFAULT 3)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_admin_audit_log_partitions(integer) FROM PUBLIC;

SELECT cron.schedule(
  'ensure-admin-audit-log-partitions',
  '0 3 1 * *',
  $$SELECT public.ensure_admin_audit_log_partitions(3)$$
) WHERE NOT EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ensure-admin-audit-log-partitions'
);

-- ---------- PARTE 2: fecha 2 policies abertas demais (Etapa 30) ----------

DROP POLICY IF EXISTS "Systems can create notifications" ON public.notifications;
CREATE POLICY "authenticated_create_notifications" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anyone_read_price_history" ON public.price_history;
CREATE POLICY "authenticated_read_price_history" ON public.price_history
FOR SELECT TO authenticated USING (true);

COMMIT;

-- ============================================================
-- VERIFICACAO — rode depois do COMMIT acima e me cole o resultado
-- ============================================================
select 'admin_audit_log_old' as item, (to_regclass('public.admin_audit_log_old') is null)::text as ok
union all select 'admin_audit_log_archive', (to_regclass('public.admin_audit_log_archive') is null)::text
union all select 'linhas na particao generica', (select count(*)::text from public.admin_audit_log_default)
union all select 'total de particoes', (select count(*)::text from pg_inherits where inhparent = 'public.admin_audit_log'::regclass)
union all select 'job de particao agendado', (exists(select 1 from cron.job where jobname='ensure-admin-audit-log-partitions'))::text
union all select 'notifications so autenticado', (exists(select 1 from pg_policies where tablename='notifications' and policyname='authenticated_create_notifications' and roles::text='{authenticated}'))::text
union all select 'price_history so autenticado', (exists(select 1 from pg_policies where tablename='price_history' and policyname='authenticated_read_price_history' and roles::text='{authenticated}'))::text;
