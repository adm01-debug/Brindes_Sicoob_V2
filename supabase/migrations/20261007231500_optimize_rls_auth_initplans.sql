-- Avalia os helpers de Auth uma única vez por consulta nas policies RLS.
-- O ALTER POLICY preserva nome, papéis, comando e permissividade; somente as
-- expressões USING/WITH CHECK são regravadas com scalar subqueries (initplans).

DO $migration$
DECLARE
  v_policy record;
  v_statement text;
  v_qual text;
  v_check text;
  v_candidates integer;
  v_remaining integer;
BEGIN
  SELECT count(*)
  INTO v_candidates
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      COALESCE(qual, '') ~ 'auth\.(uid|role|jwt)\(\)'
      OR COALESCE(with_check, '') ~ 'auth\.(uid|role|jwt)\(\)'
    )
    AND CONCAT_WS(' ', qual, with_check) !~* 'select\s+auth\.(uid|role|jwt)\(\)';

  IF v_candidates <> 426 THEN
    RAISE EXCEPTION
      'Conjunto RLS initplan divergente: esperado 426 policies, encontrado %',
      v_candidates;
  END IF;

  FOR v_policy IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        COALESCE(qual, '') ~ 'auth\.(uid|role|jwt)\(\)'
        OR COALESCE(with_check, '') ~ 'auth\.(uid|role|jwt)\(\)'
      )
      AND CONCAT_WS(' ', qual, with_check) !~* 'select\s+auth\.(uid|role|jwt)\(\)'
    ORDER BY tablename, policyname
  LOOP
    v_statement := format(
      'ALTER POLICY %I ON %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );

    IF v_policy.qual IS NOT NULL THEN
      v_qual := replace(
        replace(
          replace(v_policy.qual, 'auth.uid()', '(SELECT auth.uid())'),
          'auth.role()', '(SELECT auth.role())'
        ),
        'auth.jwt()', '(SELECT auth.jwt())'
      );
      v_statement := v_statement || format(' USING (%s)', v_qual);
    END IF;

    IF v_policy.with_check IS NOT NULL THEN
      v_check := replace(
        replace(
          replace(v_policy.with_check, 'auth.uid()', '(SELECT auth.uid())'),
          'auth.role()', '(SELECT auth.role())'
        ),
        'auth.jwt()', '(SELECT auth.jwt())'
      );
      v_statement := v_statement || format(' WITH CHECK (%s)', v_check);
    END IF;

    EXECUTE v_statement;
  END LOOP;

  SELECT count(*)
  INTO v_remaining
  FROM pg_policies
  WHERE schemaname = 'public'
    AND (
      COALESCE(qual, '') ~ 'auth\.(uid|role|jwt)\(\)'
      OR COALESCE(with_check, '') ~ 'auth\.(uid|role|jwt)\(\)'
    )
    AND CONCAT_WS(' ', qual, with_check) !~* 'select\s+auth\.(uid|role|jwt)\(\)';

  IF v_remaining <> 0 THEN
    RAISE EXCEPTION
      'Ainda existem % policies RLS sem initplan para helpers de Auth',
      v_remaining;
  END IF;
END
$migration$;
