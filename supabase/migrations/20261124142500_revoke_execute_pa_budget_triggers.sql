-- 24/11/2026 — o ciclo de verba (20261122120000_pa_budget_full_lifecycle)
-- criou 7 funções RETURNS trigger SECURITY DEFINER depois do REVOKE genérico de
-- 20260922163000_revoke_trigger_function_rpc_access.sql, então elas nasceram de
-- novo com a ACL padrão do PostgreSQL para funções (EXECUTE para PUBLIC).
-- Em produção public.audit_security_definer_acl() passou a devolver 21 linhas
-- (7 funções × PUBLIC/anon/authenticated) e o job `compliance-audit` está
-- vermelho na main desde 23/11.
--
-- O que foi medido (Postgres 15 local, com a função de auditoria real do repo):
--   - `anon` NÃO consegue invocar função de trigger por SELECT/RPC: responde
--     "trigger functions can only be called as triggers". Não existe bypass de
--     RLS por /rest/v1/rpc aqui; o problema é privilégio desnecessário e o gate.
--   - O REVOKE não altera aplicação: o trigger continua disparando depois dele.
--   - Down = GRANT EXECUTE ... TO PUBLIC, que devolve as 21 linhas do gate.
--
-- Assinaturas conforme supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql
-- (tg_validate_order_allocations é recriada na linha 1358, mesma assinatura).

REVOKE EXECUTE ON FUNCTION public.tg_sync_pa_budget_planejada() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_recalc_pa_budget_states() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_pa_budget_entries_immutable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_pa_budget_entries_competencia_aberta() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_order_cost_center() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_validate_order_allocations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_sicoob_order_budget_after_insert() FROM PUBLIC, anon, authenticated;

-- Gate: nenhuma das 7 pode continuar aparecendo em audit_security_definer_acl().
-- Falha aqui = o REVOKE não cobriu a função que o gate enxerga.
DO $$
DECLARE
  sobrando integer;
  detalhe text;
BEGIN
  SELECT count(*), string_agg(DISTINCT a.function_name, ', ')
    INTO sobrando, detalhe
    FROM public.audit_security_definer_acl() a
   WHERE a.function_name IN (
     'tg_sync_pa_budget_planejada',
     'tg_recalc_pa_budget_states',
     'tg_pa_budget_entries_immutable',
     'tg_pa_budget_entries_competencia_aberta',
     'tg_set_order_cost_center',
     'tg_validate_order_allocations',
     'tg_sicoob_order_budget_after_insert'
   );

  IF sobrando > 0 THEN
    RAISE EXCEPTION 'Ainda há % permissão(ões) indevida(s) nas funções de trigger do ciclo de verba: %', sobrando, detalhe;
  END IF;
END
$$;
