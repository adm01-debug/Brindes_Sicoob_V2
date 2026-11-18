-- Recuperado de PR #119 (fix/hermes-h164991-simulacao-final), fechada sem merge em 31/10/2026.
-- Arquivo original: 20261018131850_harden_access_blocked_log_and_marketing_view_acl.sql.
-- Renumerado para aplicar depois das migrations ja presentes no ledger ao vivo.
-- Aplicacao validada por dry-run no projeto cfmzkthhgliqelozlmwu dentro de
-- transacao revertida (BEGIN/ROLLBACK) em 18/11/2026.
--
-- Adaptada: cria a policy administrativa de SELECT que o preflight original
-- exigia pre-existente e que o banco oficial nao tem.

-- Restringe a ingestão de logs de bloqueio ao backend e torna a view de
-- taxonomia de marketing somente leitura para os consumidores da API.

DO $preflight$
DECLARE
  access_log_oid oid := to_regclass('public.access_blocked_log');
  marketing_view_oid oid := to_regclass('public.catalog_marketing_term_usage');
BEGIN
  IF access_log_oid IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = access_log_oid AND relkind IN ('r', 'p')
  ) THEN
    RAISE EXCEPTION 'Tabela obrigatória ausente: public.access_blocked_log';
  END IF;

  IF marketing_view_oid IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = marketing_view_oid AND relkind = 'v'
  ) THEN
    RAISE EXCEPTION 'View obrigatória ausente: public.catalog_marketing_term_usage';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = access_log_oid AND relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS precisa permanecer habilitada em public.access_blocked_log';
  END IF;
END
$preflight$;

-- Remove INSERT/FOR ALL policies que abrangem clientes ou PUBLIC. A política
-- administrativa de SELECT fica intacta e a ingestão fica restrita ao backend.
DO $policies$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policy.polname
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = 'public.access_blocked_log'::regclass
      AND policy.polcmd IN ('a', '*')
      AND (
        0::oid = ANY(policy.polroles)
        OR 'anon'::regrole::oid = ANY(policy.polroles)
        OR 'authenticated'::regrole::oid = ANY(policy.polroles)
      )
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.access_blocked_log',
      existing_policy.polname
    );
  END LOOP;
END
$policies$;

-- ADAPTACAO 18/11/2026: no banco oficial public.access_blocked_log tinha uma
-- unica policy -- INSERT para PUBLIC com WITH CHECK (true) -- e nenhuma policy
-- administrativa de SELECT. O preflight original exigia essa policy ja existente
-- e por isso a migration abortava. Aqui ela e criada com helper semantico.
DROP POLICY IF EXISTS "Admins read blocked access logs" ON public.access_blocked_log;
CREATE POLICY "Admins read blocked access logs"
  ON public.access_blocked_log
  FOR SELECT TO authenticated
  USING (public.can_manage((SELECT auth.uid())));

DROP POLICY IF EXISTS "System insert blocked logs" ON public.access_blocked_log;
DROP POLICY IF EXISTS "Service can insert blocked logs" ON public.access_blocked_log;
DROP POLICY IF EXISTS "Service role inserts blocked access logs" ON public.access_blocked_log;
CREATE POLICY "Service role inserts blocked access logs"
  ON public.access_blocked_log
  FOR INSERT TO service_role
  WITH CHECK (true);

REVOKE ALL ON TABLE public.access_blocked_log FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.access_blocked_log TO authenticated;
GRANT INSERT ON TABLE public.access_blocked_log TO service_role;

-- A view de uso não recebe operações de escrita nem privilégios herdados de
-- PUBLIC. security_invoker foi definido na migration que cria a view.
REVOKE ALL ON TABLE public.catalog_marketing_term_usage
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.catalog_marketing_term_usage TO authenticated, service_role;

DO $assert$
DECLARE
  access_log_oid oid := 'public.access_blocked_log'::regclass;
  marketing_view_oid oid := 'public.catalog_marketing_term_usage'::regclass;
BEGIN
  IF NOT has_table_privilege('authenticated', access_log_oid, 'SELECT')
     OR has_table_privilege('anon', access_log_oid, 'SELECT')
     OR has_table_privilege('anon', access_log_oid, 'INSERT')
     OR has_table_privilege('authenticated', access_log_oid, 'INSERT')
     OR has_table_privilege('authenticated', access_log_oid, 'UPDATE')
     OR has_table_privilege('authenticated', access_log_oid, 'DELETE')
     OR has_table_privilege('authenticated', access_log_oid, 'TRUNCATE')
     OR has_table_privilege('authenticated', access_log_oid, 'REFERENCES')
     OR has_table_privilege('authenticated', access_log_oid, 'TRIGGER')
     OR NOT has_table_privilege('service_role', access_log_oid, 'INSERT')
     OR has_table_privilege('service_role', access_log_oid, 'UPDATE')
     OR has_table_privilege('service_role', access_log_oid, 'DELETE')
     OR has_table_privilege('service_role', access_log_oid, 'TRUNCATE') THEN
    RAISE EXCEPTION 'ACL inválida em public.access_blocked_log';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = access_log_oid
      AND policy.polname = 'Service role inserts blocked access logs'
      AND policy.polcmd = 'a'
      AND policy.polroles = ARRAY['service_role'::regrole::oid]
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = access_log_oid
      AND policy.polcmd IN ('a', '*')
      AND (
        0::oid = ANY(policy.polroles)
        OR 'anon'::regrole::oid = ANY(policy.polroles)
        OR 'authenticated'::regrole::oid = ANY(policy.polroles)
      )
  ) THEN
    RAISE EXCEPTION 'Políticas de INSERT em access_blocked_log não estão limitadas a service_role';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = access_log_oid
      AND policy.polcmd = 'r'
      AND pg_catalog.pg_get_expr(policy.polqual, policy.polrelid) ILIKE '%can_manage%'
  ) THEN
    RAISE EXCEPTION 'A política administrativa de SELECT foi removida';
  END IF;

  IF has_table_privilege('anon', marketing_view_oid, 'SELECT')
     OR has_table_privilege('authenticated', marketing_view_oid, 'INSERT')
     OR has_table_privilege('authenticated', marketing_view_oid, 'UPDATE')
     OR has_table_privilege('authenticated', marketing_view_oid, 'DELETE')
     OR has_table_privilege('authenticated', marketing_view_oid, 'TRUNCATE')
     OR has_table_privilege('authenticated', marketing_view_oid, 'REFERENCES')
     OR has_table_privilege('authenticated', marketing_view_oid, 'TRIGGER')
     OR has_table_privilege('service_role', marketing_view_oid, 'INSERT')
     OR has_table_privilege('service_role', marketing_view_oid, 'UPDATE')
     OR has_table_privilege('service_role', marketing_view_oid, 'DELETE')
     OR has_table_privilege('service_role', marketing_view_oid, 'TRUNCATE')
     OR NOT has_table_privilege('authenticated', marketing_view_oid, 'SELECT')
     OR NOT has_table_privilege('service_role', marketing_view_oid, 'SELECT') THEN
    RAISE EXCEPTION 'ACL inválida em public.catalog_marketing_term_usage';
  END IF;
END
$assert$;
