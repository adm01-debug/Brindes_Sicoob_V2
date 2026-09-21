-- Reconciliação 16/09/2026 — achado sistêmico durante a execução exaustiva
-- do plano. Registrado como documentação as-built (já executado via MCP).
--
-- ACHADO: 195 das 214 tabelas de `public` concedem TRUNCATE para anon e
-- authenticated. Raiz do problema: ALTER DEFAULT PRIVILEGES do papel
-- `postgres`/`supabase_admin` neste projeto concede arwdDxtm (INSERT,
-- SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) a anon/authenticated
-- em toda tabela nova por padrão — é assim que o Supabase opera (espera que
-- RLS seja o portão real). O problema: TRUNCATE **não é coberto por RLS no
-- Postgres**, então nenhuma policy o restringe, mesmo em tabelas com RLS
-- bem configurado. Descoberto ao investigar por que as 9 partições novas de
-- admin_audit_log (Etapa 40) ficaram sem RLS (bug desta sessão, corrigido
-- separadamente) — ao verificar as partições irmãs mais antigas, elas
-- também tinham TRUNCATE aberto, o que levou a checar o schema inteiro.
--
-- Nenhum client legítimo (supabase-js/PostgREST) precisa de TRUNCATE — a
-- API REST nem expõe esse verbo. É só um caminho de SQL direto (ex.: um RPC
-- com SQL dinâmico mal guardado, como o achado da inspect_query_plan da
-- Etapa 31) que conseguiria disparar isso. Revogar custa zero e fecha uma
-- classe inteira de risco de perda de dados em massa.

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE TRUNCATE ON public.%I FROM anon, authenticated', t);
  END LOOP;
END $$;

-- Fecha a raiz para tabelas futuras criadas pelo papel `postgres` (dono
-- padrão das migrations). Não altera o default ACL de `supabase_admin`
-- (papel interno do Supabase, fora do nosso controle).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM anon, authenticated;
