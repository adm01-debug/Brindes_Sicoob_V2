-- =====================================================
-- Envolve chamadas auth.*() das policies de public em subconsulta (c44)
-- =====================================================
-- Por que existe:
--   O aplicador allowlisted (scripts/db/apply-sicoob-migrations.mjs) valida, no
--   fim do lote, a clausula c44: nenhuma policy de public pode chamar
--   auth.uid()/auth.role()/auth.jwt() sem estar em subconsulta. Sem isso o
--   Postgres reavalia a funcao por linha, e a partir de 25/11/2026 a clausula
--   passou a derrubar o lote inteiro (runs 45616099206 e 45645307009):
--     [guarda] c44 falha: ... CONCAT_WS(' ', qual, with_check) !~* 'select\s+auth\.(uid|role|jwt)\(\)'
--   com isso a migration 20261125100000 ficou pendente e o gate
--   "SECURITY DEFINER ACL Scan" segue vermelho na main.
--
-- O que faz:
--   Percorre as policies de public (exceto admin_audit_log_y*, que o contrato
--   isenta) que chamam auth.*() sem subconsulta e as reescreve para o formato
--   (SELECT auth.*()) preservando o resto da expressao, os papeis e o comando.
--   ALTER POLICY mantem roles/permissive/cmd; so a expressao muda, e
--   (SELECT auth.uid()) e equivalente a auth.uid() em resultado.
--
-- Idempotente: policies ja conformes nao sao tocadas. O RAISE NOTICE lista o
--   que foi normalizado, para o log do aplicador registrar a evidencia.
-- Sem controle transacional (o lote ja roda em transacao propria).

DO $wrap_auth$
DECLARE
  alvo record;
  expr_uso text;
  expr_verificacao text;
  normalizadas text[] := ARRAY[]::text[];
BEGIN
  FOR alvo IN
    SELECT c.relname AS tabela,
           p.polname AS policy,
           pg_get_expr(p.polqual, p.polrelid) AS uso,
           pg_get_expr(p.polwithcheck, p.polrelid) AS verificacao
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname NOT LIKE 'admin_audit_log_y%'
       AND (
         COALESCE(pg_get_expr(p.polqual, p.polrelid), '') ~* 'auth\.(uid|role|jwt)\(\)'
         OR COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '') ~* 'auth\.(uid|role|jwt)\(\)'
       )
       AND CONCAT_WS(' ', pg_get_expr(p.polqual, p.polrelid), pg_get_expr(p.polwithcheck, p.polrelid))
           !~* 'select\s+auth\.(uid|role|jwt)\(\)'
  LOOP
    expr_uso := CASE
      WHEN alvo.uso IS NULL THEN NULL
      ELSE regexp_replace(alvo.uso, 'auth\.(uid|role|jwt)\(\)', '(SELECT auth.\1())', 'gi')
    END;
    expr_verificacao := CASE
      WHEN alvo.verificacao IS NULL THEN NULL
      ELSE regexp_replace(alvo.verificacao, 'auth\.(uid|role|jwt)\(\)', '(SELECT auth.\1())', 'gi')
    END;
    EXECUTE format(
      'ALTER POLICY %I ON public.%I%s%s',
      alvo.policy,
      alvo.tabela,
      CASE WHEN expr_uso IS NULL THEN '' ELSE ' USING (' || expr_uso || ')' END,
      CASE WHEN expr_verificacao IS NULL THEN '' ELSE ' WITH CHECK (' || expr_verificacao || ')' END
    );
    normalizadas := normalizadas || (alvo.tabela || '.' || alvo.policy);
  END LOOP;

  IF COALESCE(array_length(normalizadas, 1), 0) > 0 THEN
    RAISE NOTICE 'policies normalizadas para (SELECT auth.*()): %',
      array_to_string(normalizadas, ', ');
  ELSE
    RAISE NOTICE 'nenhuma policy de public precisava de normalizacao';
  END IF;
END;
$wrap_auth$;
