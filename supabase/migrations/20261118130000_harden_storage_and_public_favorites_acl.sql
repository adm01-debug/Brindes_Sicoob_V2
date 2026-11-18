-- Recuperado de PR #119 (fix/hermes-h164991-simulacao-final), fechada sem merge em 31/10/2026.
-- Arquivo original: 20261016180000_harden_storage_and_public_favorites_acl.sql.
-- Renumerado para aplicar depois das migrations ja presentes no ledger ao vivo.
-- Aplicacao validada por dry-run no projeto cfmzkthhgliqelozlmwu dentro de
-- transacao revertida (BEGIN/ROLLBACK) em 18/11/2026.
--
-- Tambem cria public.get_connections_hub_operational_evidence, consumida por
-- supabase/functions/connections-hub-audit/index.ts:137 (recuperada na PR #291).

-- Reconcila o gate de SECURITY DEFINER com as RPCs públicas de favoritos e
-- fecha policies históricas de Storage que ampliavam o acesso por composição.

CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()
RETURNS TABLE(function_name text, arguments text, problem text, granted_to text)
LANGUAGE sql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH reviewed AS (
    SELECT to_regprocedure(signature)::oid AS oid
      FROM unnest(ARRAY[
        'public.get_sicoob_invitation(text)',
        'public.get_public_favorite_list(text)',
        'public.get_public_favorite_reactions(text,text)'
      ]) AS signatures(signature)
  ), defs AS (
    SELECT
      p.oid,
      p.proname::text AS name,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.prorettype = 'pg_catalog.trigger'::regtype AS is_trigger,
      EXISTS (SELECT 1 FROM reviewed r WHERE r.oid = p.oid) AS anon_intent,
      EXISTS (
        SELECT 1
          FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a
         WHERE a.grantee = 0
           AND a.privilege_type = 'EXECUTE'
      ) AS public_execute
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  )
  SELECT name, args, 'PUBLIC tem EXECUTE'::text, 'PUBLIC'::text
    FROM defs
   WHERE public_execute
  UNION ALL
  SELECT name, args, 'anon tem EXECUTE fora das assinaturas revisadas'::text, 'anon'::text
    FROM defs
   WHERE NOT anon_intent
     AND has_function_privilege('anon', oid, 'EXECUTE')
  UNION ALL
  SELECT name, args, 'authenticated tem EXECUTE em função de trigger'::text, 'authenticated'::text
    FROM defs
   WHERE is_trigger
     AND has_function_privilege('authenticated', oid, 'EXECUTE')
  ORDER BY 1, 2, 4;
$function$;

REVOKE EXECUTE ON FUNCTION public.audit_security_definer_acl()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_security_definer_acl()
  TO authenticated, service_role;

COMMENT ON FUNCTION public.audit_security_definer_acl() IS
'Audita EXECUTE efetivo em SECURITY DEFINER; as exceções anônimas revisadas são o convite e as RPCs mínimas de favoritos por token opaco.';

UPDATE storage.buckets
SET public = false
WHERE id IN ('proposals', 'quarantine');

-- Policies permissivas antigas continuam somando acesso às policies novas.
DROP POLICY IF EXISTS "Public Access to Proposals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload proposals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete proposals" ON storage.objects;
DROP POLICY IF EXISTS "proposals_select_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "proposals_quote_scope_delete" ON storage.objects;

-- ADAPTACAO 18/11/2026 — nao reintroduzir o ramo `owner`.
--
-- O arquivo original (PR #119, escrito em 16/10/2026) fazia o DELETE igual ao
-- SELECT: `owner = auth.uid() OR <escopo do orcamento>`. Em 06/11/2026 a main
-- ganhou 20261106200300_restrict_proposals_delete_scope.sql, que estreitou o
-- DELETE para SOMENTE o escopo atual do orcamento. Recuperar o predicado antigo
-- devolveria a quem subiu o PDF o poder de apaga-lo depois de perder o escopo do
-- orcamento — regressao de seguranca apontada na revisao desta PR.
--
-- Aqui o DELETE fica identico ao predicado vigente em producao (quote scope,
-- sem `owner`), e a assercao no fim do arquivo passa a exigir que o DELETE nao
-- contenha `owner`, em vez de exigir igualdade com o SELECT.
CREATE POLICY "proposals_quote_scope_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] = 'quotes'
  AND EXISTS (
    SELECT 1
    FROM public.quotes q
    WHERE q.id = CASE
      WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (storage.foldername(name))[2]::uuid
      ELSE NULL
    END
      AND (q.seller_id = (SELECT auth.uid())
        OR public.can_manage_quote_scope((SELECT auth.uid()), q.id))
  )
);

DROP POLICY IF EXISTS "Acesso restrito ao bucket de quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Public access to quarantine" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read quarantine" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Supervisores podem visualizar quarentena" ON storage.objects;

CREATE POLICY "Supervisores podem visualizar quarentena" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'quarantine'
  AND (SELECT public.is_supervisor_or_above((SELECT auth.uid())))
);

CREATE OR REPLACE FUNCTION public.dispatch_sicoob_connections_health_check()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, vault, net
AS $function$
DECLARE
  v_project_url text;
  v_internal_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_internal_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_internal_function_secret'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     OR length(COALESCE(v_internal_secret, '')) NOT BETWEEN 32 AND 512 THEN
    RAISE WARNING 'Health-check de conexões não configurado no Vault';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := v_project_url || '/functions/v1/connections-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sicoob-internal-secret', v_internal_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 40000
  ) INTO v_request_id;

  RETURN v_request_id;
END
$function$;

REVOKE ALL ON FUNCTION public.dispatch_sicoob_connections_health_check()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_sicoob_connections_health_check()
  TO service_role;

-- ADAPTACAO 18/11/2026: corpo em plpgsql com guarda to_regclass, recuperando a
-- melhoria que estava na PR #298 (fechada como redundante). A versao original da
-- PR #119 era LANGUAGE sql, e funcao SQL tem o corpo validado na criacao: sem a
-- extensao pg_cron instalada, o proprio CREATE FUNCTION falha. Era o mesmo tipo
-- de bug de replay do A-028. Os filtros, os nomes de job/trigger e o campo
-- `schedule` da PR #119 sao preservados, porque a assercao no fim deste arquivo
-- exige esses literais na definicao e a edge connections-hub-audit os consome.
CREATE OR REPLACE FUNCTION public.get_connections_hub_operational_evidence()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, cron
AS $function$
DECLARE
  v_cron jsonb := '[]'::jsonb;
  v_triggers jsonb := '[]'::jsonb;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL
     AND to_regclass('cron.job_run_details') IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(jobs)), '[]'::jsonb)
      INTO v_cron
      FROM (
        SELECT
          j.jobname AS name,
          j.active,
          j.schedule,
          r.status AS last_status,
          r.start_time AS last_run_at
        FROM cron.job j
        LEFT JOIN LATERAL (
          SELECT d.status, d.start_time
          FROM cron.job_run_details d
          WHERE d.jobid = j.jobid
          ORDER BY d.start_time DESC NULLS LAST
          LIMIT 1
        ) r ON true
        WHERE j.jobname IN ('webhook-retry-failed', 'webhook-logs-cleanup-daily')
      ) jobs;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(triggers)), '[]'::jsonb)
    INTO v_triggers
    FROM (
      SELECT
        c.relname AS table_name,
        t.tgname AS trigger_name,
        t.tgenabled <> 'D' AS enabled,
        p.proname AS function_name
      FROM pg_catalog.pg_trigger t
      JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
      WHERE NOT t.tgisinternal
        AND n.nspname = 'public'
        AND c.relname IN (
          'quotes', 'orders', 'discount_approval_requests', 'kit_share_tokens'
        )
        AND t.tgname IN (
          'trg_dispatch_webhook_quotes',
          'trg_dispatch_webhook_orders',
          'trg_dispatch_webhook_discount',
          'trg_dispatch_webhook_kit_share'
        )
    ) triggers;

  RETURN jsonb_build_object('cron_jobs', v_cron, 'triggers', v_triggers);
END
$function$;

REVOKE ALL ON FUNCTION public.get_connections_hub_operational_evidence()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_connections_hub_operational_evidence()
  TO service_role;

DO $schedule$
DECLARE
  v_project_url text;
  v_internal_secret text;
BEGIN
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'connections-health-check';

  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_internal_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_internal_function_secret'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url ~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     AND length(COALESCE(v_internal_secret, '')) BETWEEN 32 AND 512 THEN
    PERFORM cron.schedule(
      'connections-health-check',
      '7,22,37,52 * * * *',
      $cron$SELECT public.dispatch_sicoob_connections_health_check();$cron$
    );
  ELSE
    RAISE NOTICE 'Health-check de conexões não agendado: Vault ainda não configurado';
  END IF;
END
$schedule$;

DO $assert$
DECLARE
  v_proposals_select text;
  v_proposals_delete text;
  v_quarantine_read text;
  v_project_url text;
  v_internal_secret text;
  v_evidence_definition text;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = ANY (ARRAY[
        'Public Access to Proposals',
        'Authenticated users can upload proposals',
        'Authenticated users can delete proposals',
        'proposals_select_owner_or_admin',
        'Acesso restrito ao bucket de quarentena',
        'Public access to quarantine',
        'Authenticated read quarantine',
        'Admins podem visualizar quarentena'
      ])
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: policy histórica ampla ainda está ativa.';
  END IF;

  SELECT qual INTO v_proposals_select
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'proposals_quote_scope_select'
    AND roles = ARRAY['authenticated']::name[]
    AND cmd = 'SELECT';

  SELECT qual INTO v_proposals_delete
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'proposals_quote_scope_delete'
    AND roles = ARRAY['authenticated']::name[]
    AND cmd = 'DELETE';

  -- ADAPTACAO 18/11/2026: a assercao original exigia DELETE identico ao SELECT.
  -- O SELECT legitimamente inclui `owner = auth.uid()` (quem subiu le o proprio
  -- PDF); o DELETE nao pode incluir, senao o autor antigo apaga o PDF de um
  -- orcamento que ja nao e dele (20261106200300). O invariante correto e: o
  -- DELETE existe, exige a pasta quotes/<uuid> com escopo atual do orcamento, e
  -- NAO carrega o ramo `owner`.
  IF v_proposals_select IS NULL
     OR v_proposals_delete IS NULL
     OR v_proposals_delete ILIKE '%owner%'
     OR v_proposals_delete NOT LIKE '%can_manage_quote_scope%'
     OR v_proposals_delete NOT LIKE '%seller_id%' THEN
    RAISE EXCEPTION 'Contrato inválido: DELETE de proposals precisa ficar restrito ao escopo atual do orçamento, sem o ramo owner.';
  END IF;

  SELECT qual INTO v_quarantine_read
  FROM pg_catalog.pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Supervisores podem visualizar quarentena'
    AND roles = ARRAY['authenticated']::name[]
    AND cmd = 'SELECT';

  IF v_quarantine_read IS NULL
     OR v_quarantine_read NOT LIKE '%is_supervisor_or_above%'
     OR v_quarantine_read LIKE '%email%'
     OR v_quarantine_read LIKE '%jwt%'
     OR EXISTS (
       SELECT 1
       FROM pg_catalog.pg_policies
       WHERE schemaname = 'storage'
         AND tablename = 'objects'
         AND roles && ARRAY['public', 'anon']::name[]
         AND COALESCE(qual, '') LIKE '%quarantine%'
     ) THEN
    RAISE EXCEPTION 'Contrato inválido: leitura da quarentena não está vinculada ao RBAC.';
  END IF;

  IF (SELECT public FROM storage.buckets WHERE id = 'proposals') IS DISTINCT FROM false
     OR (SELECT public FROM storage.buckets WHERE id = 'quarantine') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Contrato inválido: bucket privado foi exposto publicamente.';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
       'anon', 'public.get_public_favorite_list(text)', 'EXECUTE'
     )
     OR NOT pg_catalog.has_function_privilege(
       'anon', 'public.get_public_favorite_reactions(text,text)', 'EXECUTE'
     )
     OR EXISTS (SELECT 1 FROM public.audit_security_definer_acl()) THEN
    RAISE EXCEPTION 'Contrato inválido: ACL das RPCs públicas revisadas está divergente.';
  END IF;

  IF NOT COALESCE((
       SELECT p.prosecdef
         AND p.proconfig = ARRAY['search_path=pg_catalog, public, vault, net']::text[]
         AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
         AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
         AND NOT pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
         AND NOT EXISTS (
           SELECT 1
           FROM pg_catalog.aclexplode(
             COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
           ) acl
           WHERE acl.grantee = 0
             AND acl.privilege_type = 'EXECUTE'
         )
       FROM pg_catalog.pg_proc p
       WHERE p.oid = 'public.dispatch_sicoob_connections_health_check()'::regprocedure
     ), false)
     OR NOT COALESCE((
       SELECT p.prosecdef
         AND p.proconfig = ARRAY['search_path=pg_catalog, public, cron']::text[]
         AND pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
         AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
         AND NOT pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
         AND NOT EXISTS (
           SELECT 1
           FROM pg_catalog.aclexplode(
             COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))
           ) acl
           WHERE acl.grantee = 0
             AND acl.privilege_type = 'EXECUTE'
         )
       FROM pg_catalog.pg_proc p
       WHERE p.oid = 'public.get_connections_hub_operational_evidence()'::regprocedure
     ), false) THEN
    RAISE EXCEPTION 'Contrato inválido: RPC operacional exposta fora de service_role.';
  END IF;

  v_evidence_definition := pg_catalog.pg_get_functiondef(
    'public.get_connections_hub_operational_evidence()'::regprocedure
  );
  IF v_evidence_definition NOT LIKE '%webhook-retry-failed%'
     OR v_evidence_definition NOT LIKE '%webhook-logs-cleanup-daily%'
     OR v_evidence_definition NOT LIKE '%trg_dispatch_webhook_quotes%'
     OR v_evidence_definition NOT LIKE '%trg_dispatch_webhook_orders%'
     OR v_evidence_definition NOT LIKE '%trg_dispatch_webhook_discount%'
     OR v_evidence_definition NOT LIKE '%trg_dispatch_webhook_kit_share%' THEN
    RAISE EXCEPTION 'Contrato inválido: evidência operacional não cobre crons e triggers.';
  END IF;

  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_internal_secret
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_internal_function_secret'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url ~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     AND length(COALESCE(v_internal_secret, '')) BETWEEN 32 AND 512 THEN
    IF (SELECT count(*) FROM cron.job WHERE jobname = 'connections-health-check') <> 1
       OR NOT EXISTS (
         SELECT 1
         FROM cron.job
         WHERE jobname = 'connections-health-check'
           AND active
           AND schedule = '7,22,37,52 * * * *'
           AND command = 'SELECT public.dispatch_sicoob_connections_health_check();'
       ) THEN
      RAISE EXCEPTION 'Contrato inválido: cron seguro de health-check não foi agendado.';
    END IF;
  ELSIF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'connections-health-check'
  ) THEN
    RAISE EXCEPTION 'Contrato inválido: cron foi agendado sem configuração válida no Vault.';
  END IF;
END
$assert$;
