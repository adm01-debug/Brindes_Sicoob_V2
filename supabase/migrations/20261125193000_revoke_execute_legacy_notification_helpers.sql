-- =====================================================
-- Fecha o gate de SECURITY DEFINER nas helpers de notificacao
-- =====================================================
-- Origem do passivo (medido em producao em 25/11/2026 pelo RPC
-- audit_security_definer_acl(), o mesmo consumido por
-- scripts/check-security-definer-acl.mjs):
--
--   cleanup_old_notifications()          anon + PUBLIC com EXECUTE
--   is_dnd_active(p_user_id uuid)        anon + PUBLIC com EXECUTE
--
-- cleanup_old_notifications(): o contrato final (RETURNS VOID, SECURITY DEFINER,
-- search_path=public, EXECUTE so para service_role) esta em
-- 20261125100000_notification_functions_contract.sql. Este arquivo repete o
-- REVOKE de forma guardada porque o bootstrap legado 004_notification_functions.sql
-- recria a funcao em replay com a ACL default (PUBLIC EXECUTE) e porque o lote de
-- aplicacao pode chegar aqui com o contrato ja satisfeito.
--
-- is_dnd_active(p_user_id uuid): sobrecarga legada criada por
-- 004_notification_functions.sql. Nao tem consumidor em src/, supabase/functions
-- nem em nenhuma migration: o unico uso e o da versao sem argumento
-- is_dnd_active(), corrigida em 20260312110229 e consumida com auth.uid().
-- Como a sobrecarga com argumento le notification_preferences de qualquer
-- user_id, mante-la executavel por anon permitia a um visitante nao autenticado
-- consultar a janela de silencio de outro usuario (leitura via SECURITY DEFINER).
-- Fica restrita ao service_role; nenhum DELETE/DROP e feito, entao nenhum
-- consumidor interno (que roda como owner) perde acesso.
--
-- A versao sem argumento continua executavel por authenticated, porque e RPC
-- revisada do frontend (20260427114657 PASSO 3); aqui so se garante que ela nao
-- volte a PUBLIC/anon.

DO $sicoob_acl$
BEGIN
  IF to_regprocedure('public.cleanup_old_notifications()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role';
  END IF;

  IF to_regprocedure('public.is_dnd_active(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_dnd_active(uuid) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_dnd_active(uuid) FROM anon';
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_dnd_active(uuid) FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_dnd_active(uuid) TO service_role';
  END IF;

  IF to_regprocedure('public.is_dnd_active()') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_dnd_active() FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_dnd_active() FROM anon';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_dnd_active() TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_dnd_active() TO service_role';
  END IF;
END $sicoob_acl$;

-- Assercao: o lote inteiro roda numa unica transacao, entao qualquer helper ainda
-- exposta a PUBLIC/anon aborta a aplicacao em vez de deixar o gate vermelho passar.
DO $sicoob_acl_assert$
DECLARE
  v_violacao RECORD;
BEGIN
  SELECT p.proname AS nome, pg_get_function_identity_arguments(p.oid) AS args
    INTO v_violacao
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND p.proname IN ('cleanup_old_notifications', 'is_dnd_active')
    AND (
      has_function_privilege('anon', p.oid, 'EXECUTE')
      OR EXISTS (
        SELECT 1
        FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
        WHERE a.grantee = 0
          AND a.privilege_type = 'EXECUTE'
      )
    )
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'ACL de helper de notificacao ainda exposta: public.%(%)',
      v_violacao.nome, v_violacao.args;
  END IF;

  IF NOT has_function_privilege('service_role', 'public.cleanup_old_notifications()', 'EXECUTE') THEN
    RAISE EXCEPTION 'cleanup_old_notifications() perdeu EXECUTE do service_role';
  END IF;

  IF to_regprocedure('public.is_dnd_active()') IS NOT NULL
     AND NOT has_function_privilege('authenticated', 'public.is_dnd_active()', 'EXECUTE') THEN
    RAISE EXCEPTION 'is_dnd_active() perdeu EXECUTE do authenticated';
  END IF;
END $sicoob_acl_assert$;
