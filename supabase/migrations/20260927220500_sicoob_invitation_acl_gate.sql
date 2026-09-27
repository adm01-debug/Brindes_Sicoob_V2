-- Alinha o novo preview público por token à allowlist revisada do gate e fecha
-- grants herdados de uma trigger function legada detectados pela auditoria.

REVOKE ALL ON FUNCTION public.guard_quote_governance_write()
  FROM PUBLIC, anon, authenticated;

DO $audit$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.audit_security_definer_acl()'::regprocedure)
    INTO v_definition;

  IF position('public.get_sicoob_invitation(text)' IN v_definition) = 0 THEN
    IF position('public.get_public_quote_approval(text)' IN v_definition) = 0 THEN
      RAISE EXCEPTION 'Versão inesperada do gate ACL; revisar antes de aplicar.';
    END IF;
    EXECUTE replace(
      v_definition,
      '''public.get_public_quote_approval(text)''',
      '''public.get_public_quote_approval(text)'', ''public.get_sicoob_invitation(text)'''
    );
  END IF;
END;
$audit$;

COMMENT ON FUNCTION public.get_sicoob_invitation(text) IS
'Preview público de convite por token opaco de 256 bits; retorna email mascarado e contexto mínimo, sem expor o token persistido.';
