-- Reduz a superfície RPC anônima ao mínimo necessário. Estas funções ficaram
-- temporariamente na allowlist conservadora da migration 20260922164000 até a
-- revisão de todos os chamadores.

-- Fluxos de step-up e telemetria exigem sessão autenticada. Os corpos já
-- validam auth.uid(), mas o ACL também deve expressar essa pré-condição.
REVOKE EXECUTE ON FUNCTION public.consume_step_up_token(
  text, public.step_up_action, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_step_up_token(
  text, public.step_up_action, text
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_full_scope_grant(
  text, uuid, text, uuid, uuid, text, boolean, timestamptz, inet, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_full_scope_grant(
  text, uuid, text, uuid, uuid, text, boolean, timestamptz, inet, text, text, jsonb
) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.log_rls_denial(
  text, text, text, text, uuid, uuid, text, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_rls_denial(
  text, text, text, text, uuid, uuid, text, text, text, text
) TO authenticated, service_role;

-- Estas rotinas são chamadas somente por Edge Functions com service_role. A
-- execução direta pelo navegador permitiria gravar falhas falsas ou consumir
-- CPU com lotes JSON arbitrários.
REVOKE EXECUTE ON FUNCTION public.record_public_token_failure(
  text, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_public_token_failure(
  text, text, text, text, text, text
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.search_products_semantic(
  text, jsonb, integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_products_semantic(
  text, jsonb, integer
) TO service_role;
