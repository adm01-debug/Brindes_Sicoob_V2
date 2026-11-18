-- Recuperado da PR #83 (claude/fix-drop-allow-all-rls-260929-1342), fechada sem
-- merge em 01/10/2026, e da PR #286 (claude/fix-rls-allow-all-261117-0844).
-- Arquivo original: 20260929134200_drop_allow_all_permissive_policies.sql.
--
-- POR QUE FOI ADAPTADA (evidencia colhida no projeto cfmzkthhgliqelozlmwu em
-- 18/11/2026, leitura de pg_policy e to_regclass):
--
--   1. public.categories, public.suppliers e public.products NAO EXISTEM mais no
--      banco oficial. `DROP POLICY IF EXISTS` tolera policy ausente, nao relacao
--      ausente: o arquivo original aborta com 42P01 em public.categories. O
--      dry-run com BEGIN/ROLLBACK confirmou essa falha.
--   2. Em public.quotes a policy "Allow all" ja nao existe: ela foi absorvida por
--      20261007233000_consolidate_permissive_rls_policies.sql e as expressoes
--      consolidadas (sicoob_merged_*) nao contem `true` -- sao predicados por
--      papel. O DROP, portanto, nao tem mais efeito nessa tabela.
--
-- O DROP sozinho virou inerte. Para nao perder a intencao da PR original, esta
-- migration mantem o DROP (agora guardado por to_regclass, idempotente e seguro
-- em qualquer ordem de aplicacao) e acrescenta uma CATRACA permanente: falha se
-- existir qualquer policy PERMISSIVE `FOR ALL USING (true)` concedida a PUBLIC,
-- anon ou authenticated em qualquer tabela de public. Isso protege o banco de
-- hoje para frente, que o DROP historico nao faz.
--
-- Estado verificado antes de aplicar: 2 policies `FOR ALL USING (true)` existem
-- em public (ip_access_control e request_rate_limits), ambas restritas a
-- service_role -- legitimas e fora do escopo da catraca.

DO $drop_allow_all$
DECLARE
  alvo text;
BEGIN
  FOREACH alvo IN ARRAY ARRAY[
    'public.categories',
    'public.suppliers',
    'public.products',
    'public.quotes'
  ]
  LOOP
    IF to_regclass(alvo) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %s', 'Allow all', alvo);
    END IF;
  END LOOP;
END
$drop_allow_all$;

DO $catraca$
DECLARE
  violacao text;
BEGIN
  SELECT string_agg(
           format('%s.%s (policy %s)', ns.nspname, cls.relname, pol.polname),
           ', ' ORDER BY cls.relname, pol.polname
         )
    INTO violacao
    FROM pg_catalog.pg_policy pol
    JOIN pg_catalog.pg_class cls ON cls.oid = pol.polrelid
    JOIN pg_catalog.pg_namespace ns ON ns.oid = cls.relnamespace
   WHERE ns.nspname = 'public'
     AND pol.polpermissive
     AND pol.polcmd = '*'
     AND btrim(COALESCE(pg_catalog.pg_get_expr(pol.polqual, pol.polrelid), '')) = 'true'
     AND (
       0::oid = ANY(pol.polroles)
       OR 'anon'::regrole::oid = ANY(pol.polroles)
       OR 'authenticated'::regrole::oid = ANY(pol.polroles)
     );

  IF violacao IS NOT NULL THEN
    RAISE EXCEPTION
      'Policy PERMISSIVE FOR ALL USING (true) exposta a PUBLIC/anon/authenticated anula o RLS: %',
      violacao;
  END IF;
END
$catraca$;
