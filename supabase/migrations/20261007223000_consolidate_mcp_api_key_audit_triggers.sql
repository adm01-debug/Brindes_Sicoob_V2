-- Consolida a auditoria de mcp_api_keys no trigger unificado e resiliente.
-- Três triggers legados permaneciam ativos em paralelo, duplicavam eventos e
-- audit_mcp_key_revoke usava auth.uid() sem fallback. Em chamadas legítimas via
-- service_role, isso produzia user_id NULL e abortava a própria revogação.

DROP TRIGGER IF EXISTS trg_audit_mcp_key_insert ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_audit_mcp_key_revoke ON public.mcp_api_keys;
DROP TRIGGER IF EXISTS trg_log_mcp_key_changes ON public.mcp_api_keys;

DROP FUNCTION IF EXISTS public.audit_mcp_key_insert();
DROP FUNCTION IF EXISTS public.audit_mcp_key_revoke();
DROP FUNCTION IF EXISTS public.log_mcp_key_changes();

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.mcp_api_keys'::regclass
      AND tgname = 'trg_audit_mcp_api_keys'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'trg_audit_mcp_api_keys ausente após consolidação';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.mcp_api_keys'::regclass
      AND tgname = 'trg_guard_mcp_api_keys'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'trg_guard_mcp_api_keys ausente após consolidação';
  END IF;
END
$migration$;

COMMENT ON FUNCTION public.audit_mcp_api_keys_changes() IS
  'Auditoria canônica de INSERT, UPDATE e DELETE em mcp_api_keys; resiliente a falhas do log e compatível com service_role.';
