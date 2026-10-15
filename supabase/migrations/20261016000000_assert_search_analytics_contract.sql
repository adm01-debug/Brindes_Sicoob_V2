-- Certifica, sem reescrever a migration já aplicada, o contrato expand/contract
-- de search_analytics. Qualquer drift aborta este avanço e o lote atômico.

DO $assert$
DECLARE
  v_authenticated oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated');
  v_anon oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'anon');
  v_service_role oid := (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'service_role');
  v_table oid := pg_catalog.to_regclass('public.search_analytics');
  v_normalizer oid := pg_catalog.to_regprocedure('public.normalize_search_analytics_insert()');
  v_insert_check text;
  v_select_using text;
BEGIN
  IF v_table IS NULL OR NOT (
    SELECT c.relrowsecurity
    FROM pg_catalog.pg_class AS c
    WHERE c.oid = v_table
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: search_analytics não existe ou está sem RLS.';
  END IF;

  IF v_authenticated IS NULL OR v_anon IS NULL OR v_service_role IS NULL THEN
    RAISE EXCEPTION 'Contrato inválido: papéis Supabase obrigatórios ausentes.';
  END IF;

  IF v_normalizer IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_language AS l ON l.oid = p.prolang
    WHERE p.oid = v_normalizer
      AND l.lanname = 'plpgsql'
      AND p.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
      AND NOT p.prosecdef
      AND p.proconfig = ARRAY['search_path=pg_catalog, public']::text[]
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: normalizador não é SECURITY INVOKER com search_path canônico.';
  END IF;

  IF pg_catalog.has_function_privilege('anon', v_normalizer, 'EXECUTE')
    OR pg_catalog.has_function_privilege('authenticated', v_normalizer, 'EXECUTE')
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_proc AS p,
        LATERAL pg_catalog.aclexplode(
          COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
        ) AS acl
      WHERE p.oid = v_normalizer
        AND acl.grantee = 0
        AND acl.privilege_type = 'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Contrato inválido: normalizador possui EXECUTE direto por cliente.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS t
    WHERE t.tgrelid = v_table
      AND t.tgname = 'trg_normalize_search_analytics_insert'
      AND NOT t.tgisinternal
      AND t.tgenabled = 'O'
      AND t.tgtype = 7 -- ROW (1) + BEFORE (2) + INSERT (4)
      AND t.tgfoid = v_normalizer
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: trigger BEFORE INSERT não está ativo na origem normal.';
  END IF;

  IF (SELECT count(*) FROM pg_catalog.pg_policy WHERE polrelid = v_table) <> 2 THEN
    RAISE EXCEPTION 'Contrato inválido: conjunto de policies de search_analytics divergiu.';
  END IF;

  SELECT pg_catalog.pg_get_expr(p.polwithcheck, p.polrelid)
  INTO v_insert_check
  FROM pg_catalog.pg_policy AS p
  WHERE p.polrelid = v_table
    AND p.polname = 'Users insert own search analytics'
    AND p.polcmd = 'a'
    AND p.polpermissive
    AND p.polroles = ARRAY[v_authenticated]
    AND p.polqual IS NULL;

  IF pg_catalog.regexp_replace(
    replace(v_insert_check, 'auth.', ''), '[[:space:]]+', '', 'g'
  ) IS DISTINCT FROM
    '(((SELECTuid()ASuid)ISNOTNULL)AND((SELECTuid()ASuid)=user_id))' THEN
    RAISE EXCEPTION 'Contrato inválido: policy de INSERT não vincula autoria a auth.uid().';
  END IF;

  SELECT pg_catalog.pg_get_expr(p.polqual, p.polrelid)
  INTO v_select_using
  FROM pg_catalog.pg_policy AS p
  WHERE p.polrelid = v_table
    AND p.polname = 'Authorized users read search analytics'
    AND p.polcmd = 'r'
    AND p.polpermissive
    AND p.polroles = ARRAY[v_authenticated]
    AND p.polwithcheck IS NULL;

  IF pg_catalog.regexp_replace(
    replace(replace(v_select_using, 'auth.', ''), 'public.', ''),
    '[[:space:]]+', '', 'g'
  ) IS DISTINCT FROM
    '(((SELECTuid()ASuid)ISNOTNULL)AND(((SELECTuid()ASuid)=user_id)OR(SELECTis_manager_or_admin()ASis_manager_or_admin)))' THEN
    RAISE EXCEPTION 'Contrato inválido: policy de SELECT perdeu propriedade ou acesso gerencial.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS p
    JOIN pg_catalog.pg_depend AS d
      ON d.classid = 'pg_catalog.pg_policy'::pg_catalog.regclass
     AND d.objid = p.oid
     AND d.refclassid = 'pg_catalog.pg_proc'::pg_catalog.regclass
    WHERE p.polrelid = v_table
      AND p.polname = 'Users insert own search analytics'
      AND d.refobjid = 'auth.uid()'::pg_catalog.regprocedure
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS p
    JOIN pg_catalog.pg_depend AS d
      ON d.classid = 'pg_catalog.pg_policy'::pg_catalog.regclass
     AND d.objid = p.oid
     AND d.refclassid = 'pg_catalog.pg_proc'::pg_catalog.regclass
    WHERE p.polrelid = v_table
      AND p.polname = 'Authorized users read search analytics'
      AND d.refobjid = 'auth.uid()'::pg_catalog.regprocedure
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy AS p
    JOIN pg_catalog.pg_depend AS d
      ON d.classid = 'pg_catalog.pg_policy'::pg_catalog.regclass
     AND d.objid = p.oid
     AND d.refclassid = 'pg_catalog.pg_proc'::pg_catalog.regclass
    WHERE p.polrelid = v_table
      AND p.polname = 'Authorized users read search analytics'
      AND d.refobjid = 'public.is_manager_or_admin()'::pg_catalog.regprocedure
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: policies não dependem das funções autorizadoras canônicas.';
  END IF;

  IF NOT pg_catalog.has_table_privilege('authenticated', v_table, 'SELECT')
    OR NOT pg_catalog.has_table_privilege('authenticated', v_table, 'INSERT')
    OR pg_catalog.has_table_privilege('authenticated', v_table, 'UPDATE')
    OR pg_catalog.has_table_privilege('authenticated', v_table, 'DELETE')
    OR pg_catalog.has_table_privilege('authenticated', v_table, 'TRUNCATE')
    OR pg_catalog.has_table_privilege('authenticated', v_table, 'REFERENCES')
    OR pg_catalog.has_table_privilege('authenticated', v_table, 'TRIGGER')
    OR pg_catalog.has_table_privilege('authenticated', v_table, 'MAINTAIN')
    OR pg_catalog.has_table_privilege(
      'anon', v_table, 'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER'
    ) THEN
    RAISE EXCEPTION 'Contrato inválido: privilégios efetivos de search_analytics divergiram.';
  END IF;

  IF (
    SELECT COALESCE(
      array_agg(acl.privilege_type::text ORDER BY acl.privilege_type::text),
      ARRAY[]::text[]
    )
    FROM pg_catalog.pg_class AS c,
      LATERAL pg_catalog.aclexplode(
        COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
      ) AS acl
    WHERE c.oid = v_table
      AND acl.grantee = v_authenticated
  ) <> ARRAY['INSERT', 'SELECT']::text[]
    OR (
      SELECT COALESCE(
        array_agg(acl.privilege_type::text ORDER BY acl.privilege_type::text),
        ARRAY[]::text[]
      )
      FROM pg_catalog.pg_class AS c,
        LATERAL pg_catalog.aclexplode(
          COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
        ) AS acl
      WHERE c.oid = v_table
        AND acl.grantee = v_service_role
    ) <> ARRAY[
      'DELETE', 'INSERT', 'MAINTAIN', 'REFERENCES', 'SELECT', 'TRIGGER', 'TRUNCATE', 'UPDATE'
    ]::text[]
    OR EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS c,
        LATERAL pg_catalog.aclexplode(
          COALESCE(c.relacl, pg_catalog.acldefault('r', c.relowner))
        ) AS acl
      WHERE c.oid = v_table
        AND acl.grantee IN (0, v_anon)
    ) THEN
    RAISE EXCEPTION 'Contrato inválido: ACL direta de search_analytics divergente.';
  END IF;
END
$assert$;
