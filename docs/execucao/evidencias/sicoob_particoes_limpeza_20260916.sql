-- ============================================================
-- APLICAR NO SUPABASE SQL EDITOR — projeto cfmzkthhgliqelozlmwu
-- Etapa 40/41: cria particoes de admin_audit_log ate 03/2027,
-- reencaminha linhas presas na particao generica, remove 2
-- tabelas antigas vazias (admin_audit_log_old/archive)
-- Gerado em 16/09/2026
-- ============================================================
BEGIN;

-- 1) Remove as 2 tabelas legadas (confirmado: 0 linhas, sem uso no codigo)
DROP TABLE IF EXISTS public.admin_audit_log_old;
DROP TABLE IF EXISTS public.admin_audit_log_archive;

-- 2) Cria as particoes que faltam (hoje param em 2026-06; cobre ate
--    2027-03, dando 6+ meses de folga)
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

-- 3) Move linhas que estavam "perdidas" na particao generica (DEFAULT)
--    para a particao correta agora que ela existe. Seguro mesmo sem
--    saber as datas exatas: reinsere pelo pai, o Postgres roteia sozinho;
--    o que continuar sem particao especifica volta pro DEFAULT.
WITH moved AS (
  DELETE FROM public.admin_audit_log_default
  RETURNING *
)
INSERT INTO public.admin_audit_log SELECT * FROM moved;

-- 4) Funcao + agendamento (pg_cron) para criar automaticamente a
--    particao dos proximos 3 meses, todo dia 1 as 03:00 — evita que
--    isso volte a acontecer.
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

COMMIT;

-- ============================================================
-- VERIFICACAO — rode depois do COMMIT acima e me cole o resultado
-- ============================================================
select 'admin_audit_log_old' as tabela, to_regclass('public.admin_audit_log_old') as existe_ainda
union all select 'admin_audit_log_archive', to_regclass('public.admin_audit_log_archive');

select count(*) as linhas_na_particao_generica from public.admin_audit_log_default;

select count(*) as total_particoes from pg_inherits
where inhparent = 'public.admin_audit_log'::regclass;

select jobname, schedule, active from cron.job where jobname = 'ensure-admin-audit-log-partitions';
