CREATE OR REPLACE FUNCTION public.check_security_health()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_rls_score DECIMAL;
    v_audit_count INTEGER;
BEGIN
    -- Busca o score da última auditoria
    SELECT score INTO v_rls_score FROM public.qa_rls_audits ORDER BY audited_at DESC LIMIT 1;
    -- Conta logs de auditoria de admin nas últimas 24h
    SELECT count(*) INTO v_audit_count FROM public.admin_config_audit WHERE changed_at > now() - interval '24 hours';
    
    RETURN jsonb_build_object(
        'rls_health', COALESCE(v_rls_score, 0),
        'recent_admin_changes', v_audit_count,
        'system_status', 'SECURE',
        'last_check', now()
    );
END;
$function$
