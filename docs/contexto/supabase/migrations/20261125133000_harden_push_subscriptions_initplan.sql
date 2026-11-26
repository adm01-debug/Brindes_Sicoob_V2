-- Saneia a deriva de produção que trava o lote da allowlist.
--
-- A política de push_subscriptions aparece no banco oficial com `auth.uid()` direto no
-- USING, enquanto o padrão do projeto (20261007231500_optimize_rls_auth_initplans.sql)
-- avalia os helpers de Auth com initplan — `(SELECT auth.uid())`. A guarda de contrato do
-- lote recusa esse formato (cláusula c44), então todo APLICAR falhava antes de gravar
-- qualquer migration pendente. Aqui a política volta ao padrão; sem ela em produção o
-- bloco não faz nada.
DO $migration$
DECLARE
  v_qual text;
  v_novo text;
BEGIN
  IF to_regclass('public.push_subscriptions') IS NULL THEN
    RETURN;
  END IF;

  SELECT qual INTO v_qual
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'push_subscriptions'
    AND policyname = 'Users can manage own subscriptions';

  IF v_qual IS NULL THEN
    RETURN;
  END IF;

  IF v_qual ~* 'select\s+auth\.(uid|role|jwt)\(\)' THEN
    RETURN;
  END IF;

  v_qual := replace(
    replace(
      replace(v_qual, 'auth.uid()', '(SELECT auth.uid())'),
      'auth.role()', '(SELECT auth.role())'
    ),
    'auth.jwt()', '(SELECT auth.jwt())'
  );

  EXECUTE format(
    'ALTER POLICY %I ON %I.%I USING (%s)',
    'Users can manage own subscriptions',
    'public',
    'push_subscriptions',
    v_qual
  );

  SELECT qual INTO v_novo
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'push_subscriptions'
    AND policyname = 'Users can manage own subscriptions';

  IF v_novo IS NULL OR v_novo !~* 'select\s+auth\.uid\(\)' THEN
    RAISE EXCEPTION
      'push_subscriptions sem initplan apos o saneamento: %',
      COALESCE(v_novo, '<sem USING>');
  END IF;
END
$migration$;
