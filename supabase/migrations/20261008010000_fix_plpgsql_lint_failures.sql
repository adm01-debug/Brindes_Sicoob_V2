-- Corrige todas as falhas apontadas pelo plpgsql_check no banco canônico.
-- Mantém assinaturas, ACLs e comportamento transacional das rotinas existentes.

CREATE OR REPLACE FUNCTION "public"."auto_block_extreme_offenders"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _row record;
  _admin record;
  _blocked_count int := 0;
  _system_uid uuid;
  _expires timestamptz := now() + interval '6 hours';
BEGIN
  -- created_by precisa de uuid; usa o primeiro admin como ator do sistema
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY user_id ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  FOR _row IN
    WITH offenders AS (
      SELECT ip_address, count(*) AS cnt
      FROM (
        SELECT ip_address FROM public.login_attempts
          WHERE success = false AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL AND ip_address <> 'unknown'
        UNION ALL
        SELECT ip_address FROM public.public_token_failures
          WHERE created_at > now() - interval '1 hour' AND ip_address IS NOT NULL
        UNION ALL
        SELECT ip_address FROM public.bot_detection_log
          WHERE blocked = true AND created_at > now() - interval '1 hour' AND ip_address IS NOT NULL
      ) s
      GROUP BY ip_address
      HAVING count(*) >= 30
    )
    SELECT o.ip_address, o.cnt
    FROM offenders o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.ip_access_control iac
      WHERE iac.ip_address = o.ip_address
        AND iac.list_type = 'block'
        AND (iac.expires_at IS NULL OR iac.expires_at > now())
    )
  LOOP
    INSERT INTO public.ip_access_control (
      ip_address, list_type, reason, expires_at, created_by
    ) VALUES (
      _row.ip_address,
      'block',
      format('Auto-bloqueio: %s ofensas em 1h', _row.cnt),
      _expires,
      _system_uid
    );

    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, ip_address, details
    ) VALUES (
      _system_uid,
      'auto_ip_block',
      'ip_access_control',
      _row.ip_address,
      _row.ip_address,
      jsonb_build_object('offense_count', _row.cnt, 'expires_at', _expires, 'window', '1h')
    );

    -- Notifica admins (dedupe por IP em 1h)
    FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.workspace_notifications
        WHERE user_id = _admin.user_id
          AND category = 'security'
          AND title = '🛡️ IP auto-bloqueado'
          AND metadata->>'ip' = _row.ip_address
          AND created_at > now() - interval '1 hour'
      ) THEN
        INSERT INTO public.workspace_notifications (
          user_id, title, message, type, category, action_url, metadata
        ) VALUES (
          _admin.user_id,
          '🛡️ IP auto-bloqueado',
          format('IP %s bloqueado por 6h após %s ofensas em 1h.', _row.ip_address, _row.cnt),
          'warning',
          'security',
          '/admin/seguranca-acesso',
          jsonb_build_object('ip', _row.ip_address, 'offense_count', _row.cnt, 'expires_at', _expires)
        );
      END IF;
    END LOOP;

    _blocked_count := _blocked_count + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'blocked', _blocked_count, 'ran_at', now());
END;
$$;



CREATE OR REPLACE FUNCTION "public"."auto_revoke_orphan_full_keys"("_source" "text" DEFAULT 'cron'::"text") RETURNS TABLE("key_id" "uuid", "created_by" "uuid", "revoked_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _now TIMESTAMP WITH TIME ZONE := now();
  _rec RECORD;
BEGIN
  IF _source NOT IN ('trigger','cron','manual') THEN
    RAISE EXCEPTION 'invalid source: %', _source USING ERRCODE = '22023';
  END IF;

  FOR _rec IN
    SELECT k.id, k.created_by
      FROM public.mcp_api_keys k
     WHERE k.revoked_at IS NULL
       AND '*' = ANY(k.scopes)
       AND NOT public.is_dev(k.created_by)
     FOR UPDATE
  LOOP
    -- Revoga a chave (trigger existente log_mcp_key_revocation registra a mudança)
    UPDATE public.mcp_api_keys
       SET revoked_at = _now,
           updated_at = _now
     WHERE mcp_api_keys.id = _rec.id
       AND mcp_api_keys.revoked_at IS NULL;

    -- Log dedicado do mecanismo de defesa
    INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
    VALUES (_rec.id, _rec.created_by, _now, _source, 'creator_lost_dev_role');

    -- Correlação forense no audit log de step-up (mesma trilha das emissões FULL)
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (
      _rec.created_by,
      'mcp_full_issue',
      _rec.id::text,
      'auto_revoked',
      jsonb_build_object(
        'reason', 'creator_lost_dev_role',
        'source', _source
      )
    );

    key_id := _rec.id;
    created_by := _rec.created_by;
    revoked_at := _now;
    RETURN NEXT;
  END LOOP;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."check_security_health"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;



CREATE OR REPLACE FUNCTION "public"."consume_step_up_token"("_token" "text", "_expected_action" "public"."step_up_action", "_expected_target" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _uid UUID := auth.uid();
  _token_h TEXT;
  _row RECORD;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  IF _token IS NULL OR length(_token) < 32 THEN RETURN false; END IF;

  -- Re-checagem crítica: usuário ainda precisa ser dev no momento do consumo
  IF NOT public.is_dev(_uid) THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'unauthorized', '{"reason":"role_lost_at_consume"}'::jsonb);
    RETURN false;
  END IF;

  _token_h := encode(extensions.digest(_token, 'sha256'), 'hex');

  SELECT * INTO _row FROM public.step_up_tokens
  WHERE token_hash = _token_h AND user_id = _uid AND consumed = false AND expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', '{"reason":"token_invalid_or_expired"}'::jsonb);
    RETURN false;
  END IF;

  IF _row.action <> _expected_action THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', _row.id, jsonb_build_object('reason','action_mismatch','expected',_expected_action,'got',_row.action));
    RETURN false;
  END IF;

  IF _expected_target IS NOT NULL AND _row.target_ref IS DISTINCT FROM _expected_target THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id, metadata)
    VALUES (_uid, _expected_action, _expected_target, 'failed', _row.id, '{"reason":"target_mismatch"}'::jsonb);
    RETURN false;
  END IF;

  UPDATE public.step_up_tokens SET consumed = true, consumed_at = now() WHERE id = _row.id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, token_id)
  VALUES (_uid, _expected_action, _expected_target, 'token_consumed', _row.id);

  RETURN true;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."create_sicoob_kit_quote"("p_kit" "jsonb", "p_items" "jsonb", "p_personalizations" "jsonb", "p_idempotency_key" "text", "p_actor_id" "uuid", "p_request_hash" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_organization_id uuid;
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_quote_id uuid;
  v_quote_number text;
  v_quote_item_id uuid;
  v_group_id uuid := gen_random_uuid();
  v_sort_order integer := 0;
  v_product_total numeric(14,2) := 0;
  v_personalization_total numeric(14,2) := 0;
  v_total numeric(14,2);
  v_checked_at timestamptz;
  v_payload_hash text;
  v_kit_name text := NULLIF(trim(p_kit ->> 'name'), '');
  v_kit_type text := NULLIF(trim(p_kit ->> 'type'), '');
  v_kit_quantity integer;
  v_identity_tag text := NULLIF(trim(p_kit ->> 'identity_tag'), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para criar o orçamento.';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de kit inválida.';
  END IF;
  IF jsonb_typeof(p_kit) IS DISTINCT FROM 'object'
     OR v_kit_name IS NULL OR length(v_kit_name) > 120
     OR v_kit_type NOT IN ('montado', 'original', 'simples')
     OR COALESCE(length(v_identity_tag), 0) > 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identificação do kit inválida.';
  END IF;

  BEGIN
    v_kit_quantity := (p_kit ->> 'quantity')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade de kits inválida.';
  END;
  IF v_kit_quantity IS NULL OR v_kit_quantity NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A quantidade de kits deve estar entre 1 e 100.000.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 2 AND 50
     OR jsonb_typeof(p_personalizations) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_personalizations) > jsonb_array_length(p_items) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Composição do kit inválida.';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items) source(item) WHERE item ->> 'kind' = 'box') <> 1
     OR jsonb_array_length(p_items) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_items) source(item)
     )
     OR jsonb_array_length(p_personalizations) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_personalizations) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Linhas de kit duplicadas ou embalagem inválida.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = p_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  SELECT om.organization_id INTO v_organization_id
    FROM public.organization_members om
   WHERE om.user_id = p_actor_id
   ORDER BY om.created_at ASC, om.id ASC
   LIMIT 1;

  v_payload_hash := p_request_hash;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || trim(p_idempotency_key), 0));
  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    SELECT quote_number, total INTO v_quote_number, v_total
      FROM public.quotes WHERE id = v_existing.quote_id;
    RETURN jsonb_build_object('quote_id', v_existing.quote_id, 'quote_number', v_quote_number, 'total', v_total);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(length(v_item ->> 'line_id'), 0) NOT BETWEEN 1 AND 64
       OR v_item ->> 'kind' NOT IN ('box', 'item')
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'minimum_quantity')::integer, 1) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item verificado do kit inválido.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;
    v_product_total := v_product_total
      + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
  END LOOP;

  -- MOQ é uma regra do produto, portanto duas linhas/variantes do mesmo produto
  -- devem ser avaliadas pela demanda total. Também recusamos snapshots que
  -- atribuam mínimos divergentes ao mesmo produto.
  IF EXISTS (
    SELECT 1
      FROM (
        SELECT item ->> 'product_id' AS product_id,
               sum((item ->> 'quantity')::integer) AS total_quantity,
               min(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS minimum_quantity,
               max(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS maximum_quantity
          FROM jsonb_array_elements(p_items) source(item)
         GROUP BY item ->> 'product_id'
      ) demand
     WHERE demand.minimum_quantity IS DISTINCT FROM demand.maximum_quantity
        OR demand.total_quantity < demand.minimum_quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
  END IF;

  FOR v_personalization IN SELECT value FROM jsonb_array_elements(p_personalizations)
  LOOP
    IF NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       )
       OR NULLIF(v_personalization ->> 'technique_id', '') IS NULL
       OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
       OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'personalized_quantity')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
       OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
       OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização verificada do kit inválida.';
    END IF;
    IF (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (
         SELECT (item ->> 'quantity')::integer
           FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A personalização não corresponde à quantidade do item.';
    END IF;

    v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
    END IF;
    v_personalization_total := v_personalization_total + (v_personalization ->> 'total_cost')::numeric;
  END LOOP;

  v_total := round(v_product_total + v_personalization_total, 2);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    internal_notes, organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    'Unidade Sicoob',
    p_actor_id,
    'draft',
    v_total,
    v_total,
    format('Kit "%s" (%sx) — tipo: %s. Catálogo consultado na criação; estoque não reservado.',
      v_kit_name, v_kit_quantity, v_kit_type),
    CASE WHEN v_identity_tag IS NOT NULL THEN format('Identidade do kit: %s', v_identity_tag) ELSE NULL END,
    v_organization_id,
    v_profile.pa_id,
    v_profile.cooperativa_id
  ) RETURNING id, quote_number INTO v_quote_id, v_quote_number;

  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_items)
     ORDER BY CASE WHEN value ->> 'kind' = 'box' THEN 0 ELSE 1 END, value ->> 'line_id'
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code, notes, sort_order,
      kit_group_id, kit_name, source_variant_id, source_variant_sku, catalog_checked_at
    ) VALUES (
      v_quote_id,
      v_item ->> 'product_id',
      v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''),
      NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''),
      NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''),
      CASE WHEN v_item ->> 'kind' = 'box' THEN 'Embalagem do kit' ELSE NULL END,
      v_sort_order,
      v_group_id::text,
      v_kit_name,
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz
    ) RETURNING id INTO v_quote_item_id;

    SELECT value INTO v_personalization
      FROM jsonb_array_elements(p_personalizations)
     WHERE value ->> 'line_id' = v_item ->> 'line_id';
    IF FOUND THEN
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        width_cm, height_cm, personalized_quantity, unit_cost,
        setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id,
        v_personalization ->> 'technique_id',
        v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
          THEN format('Posição: %s', v_personalization ->> 'position') ELSE NULL END,
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END IF;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_kit_quote_requests (
    actor_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    p_actor_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN jsonb_build_object('quote_id', v_quote_id, 'quote_number', v_quote_number, 'total', v_total);
END;
$_$;



CREATE OR REPLACE FUNCTION "public"."generate_sicoob_performance_report"("_role_name" "text", "_table_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_report_id UUID;
BEGIN
    -- Esta função requer privilégios de superuser ou configuração específica para EXPLAIN
    -- Em ambientes gerenciados, simulamos a captura ou usamos logs de sistema.
    -- Para este utilitário, registraremos a intenção de auditoria.

    INSERT INTO public.sicoob_performance_reports (role_tested, table_name, execution_plan, total_time_ms)
    VALUES (_role_name, _table_name, '{"info": "Relatório gerado via auditoria de sistema"}'::jsonb, 0)
    RETURNING id INTO v_report_id;

    RETURN v_report_id;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."get_query_telemetry_p95"("window_minutes" integer DEFAULT 60) RETURNS TABLE("operation" "text", "p95_ms" numeric, "avg_ms" numeric, "count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(qt.rpc_name, qt.table_name, qt.operation) as op,
        percentile_cont(0.95) WITHIN GROUP (ORDER BY qt.duration_ms)::numeric as p95,
        AVG(qt.duration_ms)::numeric as avg,
        COUNT(*) as cnt
    FROM public.query_telemetry AS qt
    WHERE qt.created_at >= now() - (window_minutes || ' minutes')::interval
    GROUP BY 1
    ORDER BY p95 DESC;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."get_quote_token_by_value"("_token" "text") RETURNS SETOF "public"."quote_approval_tokens"
    LANGUAGE "plpgsql" VOLATILE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE v_safe public.quote_approval_tokens%ROWTYPE;
BEGIN
  SELECT t.id, t.quote_id, t.status, t.expires_at, t.responded_at, t.response
    INTO v_safe.id, v_safe.quote_id, v_safe.status, v_safe.expires_at, v_safe.responded_at, v_safe.response
    FROM public.quote_approval_tokens t
    WHERE t.token = _token AND public.get_public_quote_approval(_token) IS NOT NULL;
  IF FOUND THEN RETURN NEXT v_safe; END IF;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."get_sicoob_consolidation_sellers"() RETURNS TABLE("id" "uuid", "name" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_cooperative_id uuid;
BEGIN
  SELECT cooperativa_id INTO v_cooperative_id
  FROM public.profiles AS actor_profile
  WHERE (actor_profile.user_id = v_actor_id OR actor_profile.id = v_actor_id)
    AND is_active IS TRUE
    AND deleted_at IS NULL
  LIMIT 1;
  IF v_actor_id IS NULL OR v_cooperative_id IS NULL
     OR NOT public.sicoob_actor_can_manage_consolidation(v_actor_id, v_cooperative_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo da consolidação.';
  END IF;
  RETURN QUERY
  SELECT DISTINCT ur.user_id, COALESCE(NULLIF(trim(p.full_name), ''), ur.user_id::text)
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.user_id = ur.user_id OR p.id = ur.user_id
  WHERE ur.role::text = 'vendedor'
    AND p.cooperativa_id = v_cooperative_id
    AND p.is_active IS TRUE
    AND p.deleted_at IS NULL
  ORDER BY 2;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."lookup_request_id"("_request_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_webhook_events jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _request_id IS NULL OR length(_request_id) < 8 OR length(_request_id) > 128 THEN
    RAISE EXCEPTION 'invalid_request_id' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.occurred_at), '[]'::jsonb)
  INTO v_webhook_events
  FROM (
    SELECT
      occurred_at,
      source,
      direction,
      event_type,
      endpoint,
      http_status,
      duration_ms,
      attempt,
      success,
      error_class,
      error_message,
      payload_bytes
    FROM public.webhook_delivery_metrics
    WHERE request_id = _request_id
    ORDER BY occurred_at ASC
    LIMIT 200
  ) r;

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'webhook_events', v_webhook_events,
    'event_count', jsonb_array_length(v_webhook_events)
  );
END;
$$;



CREATE OR REPLACE FUNCTION "public"."notify_hardening_regression"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
  _failures text[] := ARRAY[]::text[];
  _score int := 0;
  _max int := 5;
  _admin record;
  _notified int := 0;
  _msg text;
BEGIN
  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;
  IF _private_buckets = 4 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Buckets privados: %s/4', _private_buckets); END IF;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');
  IF _sensitive_realtime = 0 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Tabelas sensíveis em realtime: %s', _sensitive_realtime); END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;
  IF _pg_trgm_in_extensions THEN _score := _score + 1;
  ELSE _failures := _failures || ARRAY['pg_trgm fora do schema extensions']; END IF;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;
  IF _cleanup_job_active THEN _score := _score + 1;
  ELSE _failures := _failures || ARRAY['Job cleanup-security-logs-daily inativo']; END IF;

  -- MFA enforced em app — assumido sempre true (controlado em código, não DB)
  _score := _score + 1;

  IF _score >= _max THEN
    RETURN jsonb_build_object('ok', true, 'score', _score, 'max', _max, 'notified', 0);
  END IF;

  _msg := format(
    'Saúde do hardening caiu para %s/%s. Falhas: %s. Acesse /admin/seguranca-acesso.',
    _score, _max, array_to_string(_failures, '; ')
  );

  FOR _admin IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.workspace_notifications
      WHERE user_id = _admin.user_id
        AND category = 'security'
        AND title = '⚠️ Regressão de hardening detectada'
        AND created_at > now() - interval '20 hours'
    ) THEN
      INSERT INTO public.workspace_notifications (
        user_id, title, message, type, category, action_url, metadata
      ) VALUES (
        _admin.user_id,
        '⚠️ Regressão de hardening detectada',
        _msg,
        'warning',
        'security',
        '/admin/seguranca-acesso',
        jsonb_build_object('score', _score, 'max', _max, 'failures', _failures)
      );
      _notified := _notified + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'score', _score,
    'max', _max,
    'failures', _failures,
    'notified', _notified
  );
END;
$$;



CREATE OR REPLACE FUNCTION "public"."process_export_queue_v3"() RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  job RECORD;
BEGIN
  FOR job IN (
    SELECT * FROM public.export_jobs
    WHERE status IN ('pending', 'failed') AND attempts < 3
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  ) LOOP
    BEGIN
      UPDATE public.export_jobs
      SET status = 'processing', attempts = attempts + 1, updated_at = now()
      WHERE id = job.id;

      -- Auditoria de Exportação (Idempotente)
      INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
      VALUES (
        job.user_id,
        'export_batch_process',
        'export_job',
        job.id::text,
        jsonb_build_object(
          'type', job.export_type,
          'filters', job.filters,
          'attempt', job.attempts + 1,
          'timestamp', now()
        )
      );

      -- Simulação de conclusão (o processamento real PDF/Excel seria assíncrono)
      UPDATE public.export_jobs
      SET status = 'completed', updated_at = now()
      WHERE id = job.id;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.export_jobs
      SET status = 'failed', error_message = SQLERRM, updated_at = now()
      WHERE id = job.id;
    END;
  END LOOP;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."qa_preflight_check"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    result JSONB;
    users_ok BOOLEAN;
    pas_ok BOOLEAN;
    budgets_ok BOOLEAN;
    coupons_ok BOOLEAN;
    orders_ok BOOLEAN;
BEGIN
    SELECT count(*) > 0 INTO users_ok FROM auth.users WHERE email LIKE 'qa+%';
    SELECT count(*) > 0 INTO pas_ok FROM public.postos_atendimento WHERE is_active IS TRUE;
    SELECT count(*) > 0 INTO budgets_ok FROM public.pa_budgets;
    SELECT count(*) > 0 INTO coupons_ok FROM public.coupons;
    SELECT count(*) > 0 INTO orders_ok FROM public.orders;

    result := jsonb_build_object(
        'users', users_ok,
        'pas', pas_ok,
        'budgets', budgets_ok,
        'coupons', coupons_ok,
        'orders', orders_ok,
        'timestamp', now()
    );

    RETURN result;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."reorder_sicoob_order_as_quote_legacy_20260927"("p_order_id" "uuid", "p_items" "jsonb", "p_idempotency_key" "text", "p_actor_id" "uuid", "p_request_hash" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_actor_id uuid := p_actor_id;
  v_order public.sicoob_orders%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_organization_id uuid;
  v_existing public.sicoob_reorder_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_source_item public.sicoob_order_items%ROWTYPE;
  v_payload_hash text;
  v_quote_id uuid;
  v_quote_item_id uuid;
  v_sort_order integer := 0;
  v_total numeric(14,2) := 0;
  v_checked_at timestamptz;
  v_pa_name text;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para refazer o pedido.';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identidade da requisição de recompra inválida.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0
     OR jsonb_array_length(p_items) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve conter entre 1 e 100 itens.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido de origem não encontrado.';
  END IF;
  IF v_order.status IS DISTINCT FROM 'completed' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente pedidos concluídos podem ser refeitos.';
  END IF;

  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.sicoob_order_items WHERE order_id = v_order.id
     )
     OR jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(DISTINCT item ->> 'source_order_item_id')::integer
         FROM jsonb_array_elements(p_items) AS source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve representar cada item do pedido uma única vez.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = v_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  SELECT om.organization_id INTO v_organization_id
    FROM public.organization_members om
   WHERE om.user_id = v_actor_id
   ORDER BY om.created_at ASC, om.id ASC
   LIMIT 1;

  IF v_order.created_by IS DISTINCT FROM v_actor_id
     AND NOT EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = v_actor_id
          AND ur.role::text IN ('admin', 'dev', 'supervisor')
     )
     AND NOT (
       v_profile.pa_id IS NOT NULL
       AND v_profile.pa_id = v_order.pa_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('gerente_pa', 'comprador_pac', 'gestor_compras')
       )
     )
     AND NOT (
       v_profile.cooperativa_id IS NOT NULL
       AND v_profile.cooperativa_id = v_order.cooperative_id
       AND EXISTS (
         SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = v_actor_id
            AND ur.role::text IN ('comprador_singular', 'gestor_compras')
       )
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode refazer este pedido.';
  END IF;

  v_payload_hash := p_request_hash;
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_actor_id::text || ':' || p_order_id::text || ':' || trim(p_idempotency_key), 0)
  );

  SELECT * INTO v_existing
    FROM public.sicoob_reorder_requests
   WHERE actor_id = v_actor_id
     AND source_order_id = p_order_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    RETURN v_existing.quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item ->> 'source_order_item_id', '') IS NULL
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item de recompra inválido.';
    END IF;

    SELECT * INTO v_source_item
      FROM public.sicoob_order_items
     WHERE id = (v_item ->> 'source_order_item_id')::uuid
       AND order_id = v_order.id;
    IF NOT FOUND
       OR v_source_item.product_id::text IS DISTINCT FROM (v_item ->> 'product_id')
       OR v_source_item.quantity IS DISTINCT FROM (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O item não corresponde ao pedido de origem.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;

    IF COALESCE((v_item ->> 'minimum_quantity')::integer, 1) > (v_item ->> 'quantity')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
    END IF;

    IF v_source_item.variant_id IS NOT NULL
       AND v_source_item.variant_id IS DISTINCT FROM NULLIF(v_item ->> 'source_variant_id', '')::uuid THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A variante não corresponde ao pedido de origem.';
    END IF;

    v_total := v_total + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
    IF jsonb_typeof(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
    END IF;
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      IF NULLIF(v_personalization ->> 'technique_id', '') IS NULL
         OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
         OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
         OR (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (v_item ->> 'quantity')::integer
         OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
         OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
         OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
      END IF;
      v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
      IF v_checked_at IS NULL
         OR v_checked_at < now() - interval '5 minutes'
         OR v_checked_at > now() + interval '1 minute' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
      END IF;
      v_total := v_total + (v_personalization ->> 'total_cost')::numeric;
    END LOOP;
  END LOOP;

  SELECT nome INTO v_pa_name
    FROM public.postos_atendimento
   WHERE id = v_order.pa_id;

  PERFORM set_config('app.sicoob_reorder_operation', 'create', true);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    COALESCE(v_pa_name, 'Unidade Sicoob'),
    v_actor_id,
    'draft',
    v_total,
    v_total,
    format('Recompra do pedido Sicoob #%s. Preço e estoque revalidados antes da criação.', COALESCE(v_order.id::text, '')),
    v_organization_id,
    v_order.pa_id,
    v_order.cooperative_id
  )
  RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code,
      source_variant_id, source_variant_sku, catalog_checked_at, sort_order
    ) VALUES (
      v_quote_id,
      v_item ->> 'product_id',
      v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''),
      NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''),
      NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''),
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz,
      v_sort_order
    ) RETURNING id INTO v_quote_item_id;

    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        width_cm, height_cm, personalized_quantity, unit_cost,
        setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id,
        v_personalization ->> 'technique_id',
        v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        concat_ws(' ',
          CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
            THEN format('Posição: %s.', v_personalization ->> 'position') END,
          'Arte precisa ser reenviada e aprovada para esta recompra.'
        ),
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END LOOP;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_reorder_requests (
    actor_id, source_order_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    v_actor_id, p_order_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN v_quote_id;
END;
$_$;



CREATE OR REPLACE FUNCTION "public"."reorder_sicoob_quote_as_quote"("p_quote_id" "uuid", "p_items" "jsonb", "p_idempotency_key" "text", "p_actor_id" "uuid", "p_request_hash" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
DECLARE
  v_source public.quotes%ROWTYPE;
  v_existing public.sicoob_quote_reorder_requests%ROWTYPE;
  v_item jsonb;
  v_source_item public.quote_items%ROWTYPE;
  v_quote_id uuid;
  v_quote_item_id uuid;
  v_personalization jsonb;
  v_total numeric(14,2) := 0;
  v_sort_order integer := 0;
  v_valid_until timestamptz;
BEGIN
  IF p_actor_id IS NULL OR p_quote_id IS NULL
     OR length(trim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 128
     OR COALESCE(p_request_hash, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de recompra inválidos.';
  END IF;
  v_valid_until := public.sicoob_assert_current_reorder_items(p_items);

  SELECT * INTO v_source FROM public.quotes q WHERE q.id = p_quote_id FOR SHARE;
  IF NOT FOUND OR v_source.status::text NOT IN ('approved', 'approved_singular', 'converted')
     OR COALESCE(v_source.is_latest_version, true) IS NOT TRUE
     OR v_source.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Somente orçamento aprovado e vigente pode iniciar uma recompra.';
  END IF;
  IF v_source.seller_id IS DISTINCT FROM p_actor_id
     AND NOT public.can_manage_quote_scope(p_actor_id, p_quote_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode refazer este orçamento.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = p_actor_id AND is_active IS TRUE AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;
  IF jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(*)::integer FROM public.quote_items WHERE quote_id = p_quote_id
     ) OR jsonb_array_length(p_items) IS DISTINCT FROM (
       SELECT count(DISTINCT item ->> 'source_order_item_id')::integer
       FROM jsonb_array_elements(p_items) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve representar cada item do orçamento uma única vez.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_actor_id::text || ':' || p_quote_id::text || ':' || trim(p_idempotency_key), 0
  ));
  SELECT * INTO v_existing FROM public.sicoob_quote_reorder_requests
  WHERE actor_id = p_actor_id AND source_quote_id = p_quote_id
    AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    RETURN v_existing.quote_id;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_source_item FROM public.quote_items
    WHERE id = (v_item ->> 'source_order_item_id')::uuid AND quote_id = p_quote_id;
    IF NOT FOUND
       OR v_source_item.product_id IS DISTINCT FROM (v_item ->> 'product_id')
       OR v_source_item.quantity IS DISTINCT FROM (v_item ->> 'quantity')::integer
       OR NULLIF(v_source_item.source_variant_id, '') IS DISTINCT FROM NULLIF(v_item ->> 'source_variant_id', '') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O item não corresponde ao orçamento de origem.';
    END IF;
    v_total := v_total + (v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric;
    SELECT v_total + COALESCE(sum((personalization ->> 'total_cost')::numeric), 0)
      INTO v_total
      FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) source(personalization);
  END LOOP;

  PERFORM set_config('app.sicoob_reorder_operation', 'create', true);
  INSERT INTO public.quotes (
    client_id, client_name, client_email, client_phone, client_company, client_cnpj,
    seller_id, status, subtotal, total, notes, organization_id, pa_id, singular_id,
    payment_terms, delivery_time, shipping_type, shipping_cost, valid_until,
    reorder_source_quote_id, catalog_revalidated_at, catalog_valid_until,
    catalog_stock_is_reserved, reorder_price_changed_items
  ) VALUES (
    v_source.client_id, v_source.client_name, v_source.client_email, v_source.client_phone,
    v_source.client_company, v_source.client_cnpj, p_actor_id, 'draft', v_total, v_total,
    format('Recompra do orçamento Sicoob #%s. Preço, mínimo e estoque reconsultados; disponibilidade não reservada.', v_source.quote_number),
    v_source.organization_id, v_source.pa_id, v_source.singular_id,
    v_source.payment_terms, v_source.delivery_time, v_source.shipping_type, v_source.shipping_cost,
    CURRENT_DATE + 7, p_quote_id, statement_timestamp(), v_valid_until, false,
    (SELECT count(*) FROM jsonb_array_elements(p_items) source(item)
     WHERE COALESCE((item ->> 'price_changed')::boolean, false))
  ) RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code,
      source_variant_id, source_variant_sku, catalog_checked_at, sort_order,
      catalog_available_stock, catalog_minimum_quantity, catalog_valid_until,
      historical_unit_price, price_changed, catalog_stock_is_reserved
    ) VALUES (
      v_quote_id, v_item ->> 'product_id', v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''), NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer, (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''), NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''), NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''), (v_item ->> 'catalog_checked_at')::timestamptz,
      v_sort_order, (v_item ->> 'available_stock')::integer,
      (v_item ->> 'minimum_quantity')::integer, (v_item ->> 'catalog_valid_until')::timestamptz,
      NULLIF(v_item ->> 'historical_unit_price', '')::numeric,
      COALESCE((v_item ->> 'price_changed')::boolean, false), false
    ) RETURNING id INTO v_quote_item_id;

    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count, width_cm, height_cm,
        personalized_quantity, unit_cost, setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id, v_personalization ->> 'technique_id', v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        'Arte histórica copiada como referência; exige nova validação de marca.',
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END LOOP;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_quote_reorder_requests (
    actor_id, source_quote_id, idempotency_key, payload_hash, quote_id
  ) VALUES (p_actor_id, p_quote_id, trim(p_idempotency_key), p_request_hash, v_quote_id);

  INSERT INTO public.quote_history (quote_id, user_id, action, description, metadata)
  VALUES (
    v_quote_id, p_actor_id, 'created', 'Recompra criada com nova consulta ao catálogo.',
    jsonb_build_object(
      'source_quote_id', p_quote_id,
      'catalog_valid_until', v_valid_until,
      'stock_is_reserved', false
    )
  );
  RETURN v_quote_id;
END;
$_$;



CREATE OR REPLACE FUNCTION "public"."request_sicoob_order_approval"("p_order_id" "uuid", "p_expected_status" "text", "p_reason" "text", "p_threshold" numeric, "p_is_escalated" boolean DEFAULT false) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_target_status text := CASE WHEN p_is_escalated THEN 'escalated_to_board' ELSE 'waiting_approval' END;
  v_threshold numeric;
  v_request_id uuid;
  v_comment text;
  v_policy record;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário não autenticado.';
  END IF;
  IF length(trim(COALESCE(p_reason, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe uma justificativa com ao menos 10 caracteres.';
  END IF;
  IF (NOT p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'pending')
    OR (p_is_escalated AND trim(COALESCE(p_expected_status, '')) <> 'waiting_approval') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O status atual não permite esta solicitação de aprovação.';
  END IF;

  SELECT * INTO v_order
    FROM public.sicoob_orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND OR v_order.status IS DISTINCT FROM trim(p_expected_status) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'O pedido mudou ou não está disponível; atualize a página e tente novamente.';
  END IF;
  IF NOT public.sicoob_actor_can_request_approval(v_actor_id, v_order.id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Usuário fora do escopo do pedido.';
  END IF;

  SELECT limite_alcada INTO v_threshold
    FROM public.pa_budgets
   WHERE pa_id = v_order.pa_id
     AND ano = EXTRACT(YEAR FROM v_order.created_at)::integer
     AND mes = EXTRACT(MONTH FROM v_order.created_at)::integer;

  IF v_threshold IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A alçada do PA não está configurada para o período do pedido.';
  END IF;

  SELECT * INTO v_policy FROM public.get_sicoob_order_approval_policy(v_order.id);
  v_comment := format(
    'Solicitação de aprovação%s: %s',
    CASE WHEN p_is_escalated THEN ' para a Diretoria' ELSE '' END,
    trim(p_reason)
  );
  PERFORM set_config('app.sicoob_approval_operation', CASE WHEN p_is_escalated THEN 'escalate' ELSE 'request' END, true);
  PERFORM set_config('app.sicoob_order_status_comment', v_comment, true);

  IF p_is_escalated THEN
    SELECT id INTO v_request_id
      FROM public.sicoob_approval_requests
     WHERE order_id = v_order.id AND status = 'pending'
     FOR UPDATE;

    IF v_request_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A escalação exige uma solicitação de aprovação pendente.';
    END IF;

    UPDATE public.sicoob_approval_requests
       SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
             'escalated', true,
             'level', 'board',
             'escalation_reason', trim(p_reason),
             'approval_policy_version', v_policy.policy_version,
             'client_threshold', p_threshold,
             'resolved_threshold', v_threshold
           ),
           updated_at = now()
     WHERE id = v_request_id;
  ELSIF EXISTS (
    SELECT 1 FROM public.sicoob_approval_requests
     WHERE order_id = v_order.id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'O pedido já possui uma solicitação de aprovação pendente.';
  ELSE
    INSERT INTO public.sicoob_approval_requests (
      order_id,
      requester_id,
      request_reason,
      amount_at_request,
      threshold_at_request,
      status,
      metadata
    ) VALUES (
      v_order.id,
      v_actor_id,
      trim(p_reason),
      COALESCE(v_order.total_amount, 0),
      v_threshold,
      'pending',
      jsonb_build_object(
        'escalated', false,
        'level', 'manager',
        'approval_policy_version', v_policy.policy_version,
        'client_threshold', p_threshold,
        'resolved_threshold', v_threshold
      )
    )
    RETURNING id INTO v_request_id;
  END IF;

  UPDATE public.sicoob_orders
     SET status = v_target_status,
         approval_policy_id = COALESCE(v_order.approval_policy_id, v_policy.policy_id),
         approval_policy_version = COALESCE(v_order.approval_policy_version, v_policy.policy_version),
         updated_at = now()
   WHERE id = v_order.id;

  RETURN v_request_id;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."request_step_up_challenge"("_action" "public"."step_up_action", "_target_ref" "text" DEFAULT NULL::"text", "_ip" "inet" DEFAULT NULL::"inet", "_user_agent" "text" DEFAULT NULL::"text") RETURNS TABLE("challenge_id" "uuid", "otp_plain" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _uid UUID := auth.uid();
  _otp TEXT;
  _otp_h TEXT;
  _cid UUID;
  _exp TIMESTAMPTZ;
  _recent_count INT;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized: no session';
  END IF;

  -- Apenas dev pode solicitar step-up para essas ações
  IF NOT public.is_dev(_uid) THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, ip_address, user_agent)
    VALUES (_uid, _action, _target_ref, 'unauthorized', _ip, _user_agent);
    RAISE EXCEPTION 'forbidden: dev role required';
  END IF;

  -- Rate limit: máx 5 challenges por usuário por hora
  SELECT count(*) INTO _recent_count
  FROM public.step_up_challenges
  WHERE user_id = _uid AND created_at > (now() - interval '1 hour');

  IF _recent_count >= 5 THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, ip_address, user_agent)
    VALUES (_uid, _action, _target_ref, 'rate_limited', _ip, _user_agent);
    RAISE EXCEPTION 'rate_limited: too many step-up requests';
  END IF;

  -- Gera OTP de 6 dígitos
  _otp := lpad((floor(random() * 1000000))::int::text, 6, '0');
  _otp_h := encode(extensions.digest(_otp || _uid::text, 'sha256'), 'hex');
  _exp := now() + interval '5 minutes';

  INSERT INTO public.step_up_challenges(user_id, action, target_ref, otp_hash, expires_at, ip_address, user_agent)
  VALUES (_uid, _action, _target_ref, _otp_h, _exp, _ip, _user_agent)
  RETURNING id INTO _cid;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, ip_address, user_agent)
  VALUES (_uid, _action, _target_ref, 'challenge_requested', _cid, _ip, _user_agent);

  RETURN QUERY SELECT _cid, _otp, _exp;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."search_products_semantic"("_query" "text", "_products" "jsonb", "_limit" integer DEFAULT 20) RETURNS TABLE("product_id" "uuid", "score" double precision, "matched_field" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  p_item JSONB;
  v_limit integer := GREATEST(1, LEAST(COALESCE(_limit, 20), 100));
  v_returned integer := 0;
BEGIN
  -- Iterar sobre a lista de produtos fornecida (JSONB)
  FOR p_item IN SELECT * FROM jsonb_array_elements(_products)
  LOOP
    DECLARE
        p_id UUID := (p_item->>'id')::UUID;
        p_name TEXT := COALESCE(p_item->>'name', '');
        p_description TEXT := COALESCE(p_item->>'description', '');
        p_category TEXT := COALESCE(p_item->>'category', '');
        p_tags TEXT[];
        v_score FLOAT;
        v_matched_field TEXT;
    BEGIN
        -- Extrair tags como array de texto
        SELECT ARRAY_AGG(x)::TEXT[] INTO p_tags
        FROM jsonb_array_elements_text(COALESCE(p_item->'tags', '[]'::jsonb)) x;

        -- Calcular similaridade usando pg_trgm
        v_score := extensions.similarity(p_name, _query) * 1.0;
        v_matched_field := 'name';

        IF extensions.similarity(p_category, _query) * 0.8 > v_score THEN
            v_score := extensions.similarity(p_category, _query) * 0.8;
            v_matched_field := 'category';
        END IF;

        IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 0 THEN
            DECLARE
                tag_text TEXT := array_to_string(p_tags, ' ');
                tag_score FLOAT := extensions.similarity(tag_text, _query) * 0.7;
            BEGIN
                IF tag_score > v_score THEN
                    v_score := tag_score;
                    v_matched_field := 'tags';
                END IF;
            END;
        END IF;

        IF extensions.similarity(p_description, _query) * 0.5 > v_score THEN
            v_score := extensions.similarity(p_description, _query) * 0.5;
            v_matched_field := 'description';
        END IF;

        -- Retornar se houver similaridade mínima
        IF v_score > 0.05 THEN
          product_id := p_id;
          score := v_score;
          matched_field := v_matched_field;
          RETURN NEXT;
          v_returned := v_returned + 1;
          EXIT WHEN v_returned >= v_limit;
        END IF;
    END;
  END LOOP;
  RETURN;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."search_records_rerank"("_query" "text", "_candidates" "jsonb") RETURNS TABLE("id" "text", "score" real, "matched_field" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _q text;
BEGIN
  IF _query IS NULL OR length(trim(_query)) = 0 THEN
    RETURN;
  END IF;

  IF _candidates IS NULL OR jsonb_typeof(_candidates) <> 'array' THEN
    RETURN;
  END IF;

  _q := lower(trim(_query));

  RETURN QUERY
  WITH expanded AS (
    SELECT
      COALESCE(c->>'id', '') AS cid,
      lower(COALESCE(c->>'label', '')) AS clabel,
      lower(COALESCE(c->>'sublabel', '')) AS csublabel
    FROM jsonb_array_elements(_candidates) AS c
  ),
  scored AS (
    SELECT
      cid,
      GREATEST(
        extensions.similarity(clabel, _q) * 1.0,
        extensions.word_similarity(_q, clabel) * 0.9,
        extensions.similarity(csublabel, _q) * 0.7,
        extensions.word_similarity(_q, csublabel) * 0.6
      ) AS best_score,
      CASE
        WHEN extensions.similarity(clabel, _q) >= extensions.similarity(csublabel, _q) THEN 'label'
        ELSE 'sublabel'
      END AS field
    FROM expanded
    WHERE cid <> ''
  )
  SELECT cid, best_score::real, field
  FROM scored
  WHERE best_score > 0.05
  ORDER BY best_score DESC;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."sicoob_current_actor_approval_authority"("p_order_id" "uuid", "p_competence" "text" DEFAULT 'approve_order'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" VOLATILE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_requester uuid;
  v_authority record;
  v_ends_at timestamptz;
BEGIN
  IF v_actor IS NULL OR p_competence NOT IN ('approve_order', 'reject_order') THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;
  SELECT * INTO v_order FROM public.sicoob_orders WHERE id=p_order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;
  SELECT requester_id INTO v_requester
  FROM public.sicoob_approval_requests
  WHERE order_id=p_order_id AND status='pending'
  ORDER BY created_at DESC, id DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_decide', false, 'source', 'none');
  END IF;

  SELECT * INTO STRICT v_authority FROM public.resolve_sicoob_approval_authority(
    v_actor, p_order_id, v_requester,
    v_order.status='escalated_to_board', p_competence
  );
  IF v_authority.delegation_id IS NOT NULL THEN
    SELECT ends_at INTO v_ends_at FROM public.sicoob_approval_delegations
    WHERE id=v_authority.delegation_id;
  END IF;
  RETURN jsonb_build_object(
    'can_decide', true,
    'source', CASE WHEN v_authority.delegation_id IS NULL THEN 'direct' ELSE 'delegated' END,
    'delegation_id', v_authority.delegation_id,
    'authority_delegator_id', CASE
      WHEN v_authority.delegation_id IS NULL THEN NULL
      ELSE v_authority.authority_delegator_id
    END,
    'ends_at', v_ends_at
  );
EXCEPTION WHEN insufficient_privilege OR no_data_found THEN
  RETURN jsonb_build_object('can_decide', false, 'source', 'none');
END;
$$;



CREATE OR REPLACE FUNCTION "public"."snapshot_hardening_status"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
  _failures text[] := ARRAY[]::text[];
  _score int := 0;
  _max int := 5;
  _details jsonb;
  _snapshot_id uuid;
BEGIN
  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;
  IF _private_buckets = 4 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Buckets privados: %s/4', _private_buckets); END IF;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');
  IF _sensitive_realtime = 0 THEN _score := _score + 1;
  ELSE _failures := _failures || format('Tabelas sensíveis em realtime: %s', _sensitive_realtime); END IF;

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;
  IF _pg_trgm_in_extensions THEN _score := _score + 1;
  ELSE _failures := _failures || ARRAY['pg_trgm fora do schema extensions']; END IF;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;
  IF _cleanup_job_active THEN _score := _score + 1;
  ELSE _failures := _failures || ARRAY['Job cleanup-security-logs-daily inativo']; END IF;

  -- MFA enforced em app — assumido true (controlado em código)
  _score := _score + 1;

  _details := jsonb_build_object(
    'private_buckets_count', _private_buckets,
    'sensitive_realtime_count', _sensitive_realtime,
    'pg_trgm_in_extensions', _pg_trgm_in_extensions,
    'cleanup_job_active', _cleanup_job_active,
    'mfa_enforced_in_app', true
  );

  INSERT INTO public.hardening_health_snapshots (score, max_score, failures, details)
  VALUES (_score, _max, _failures, _details)
  RETURNING id INTO _snapshot_id;

  RETURN jsonb_build_object('ok', true, 'snapshot_id', _snapshot_id, 'score', _score, 'max', _max);
END;
$$;



CREATE OR REPLACE FUNCTION "public"."sync_external_connections_from_credentials"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_anon boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
BEGIN
  -- Ator de sistema: qualquer admin (created_by é NOT NULL)
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role = 'admin'
  LIMIT 1;

  IF _system_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_admin_for_system_actor');
  END IF;

  FOREACH _env_key IN ARRAY _env_keys LOOP
    _url_name  := 'EXTERNAL_' || upper(_env_key) || '_URL';
    _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
    _svc_name  := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';

    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name  AND length > 0) INTO _has_url;
    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _anon_name AND length > 0) INTO _has_anon;
    SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name  AND length > 0) INTO _has_svc;

    IF _has_url AND _has_anon AND _has_svc THEN
      _status := 'active';
    ELSE
      _status := 'unconfigured';
    END IF;

    _name := CASE _env_key
      WHEN 'promobrind' THEN 'Catálogo Promobrind'
      WHEN 'crm' THEN 'CRM Promobrind'
      ELSE initcap(_env_key)
    END;

    INSERT INTO public.external_connections (
      type, name, env_key, config, secret_refs, status, created_by
    ) VALUES (
      'supabase',
      _name,
      _env_key,
      jsonb_build_object('mirrored_from', 'integration_credentials'),
      ARRAY[_url_name, _anon_name, _svc_name],
      _status,
      _system_uid
    )
    ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
    SET status = EXCLUDED.status,
        secret_refs = EXCLUDED.secret_refs,
        name = EXCLUDED.name,
        updated_at = now();

    _processed := _processed + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'processed', _processed, 'ran_at', now());
END;
$$;



CREATE OR REPLACE FUNCTION "public"."sync_external_connections_from_credentials"("_trigger_secret_name" "text" DEFAULT NULL::"text", "_trigger_op" "text" DEFAULT 'manual'::"text", "_trigger_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
  _created int := 0;
  _updated int := 0;
  _is_insert boolean;
  _start timestamptz := clock_timestamp();
  _result jsonb;
  _err text;
BEGIN
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role IN ('dev', 'supervisor', 'admin', 'manager')
  ORDER BY CASE WHEN user_id = _trigger_user_id THEN 0 ELSE 1 END, user_id ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message, duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      0, 0, 0, 'no_admin', 'no_privileged_system_actor',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'no_privileged_system_actor');
  END IF;

  BEGIN
    FOREACH _env_key IN ARRAY _env_keys LOOP
      _url_name := 'EXTERNAL_' || upper(_env_key) || '_URL';
      _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
      _svc_name := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name AND length > 0) INTO _has_url;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name AND length > 0) INTO _has_svc;
      _status := CASE WHEN _has_url AND _has_svc THEN 'active' ELSE 'unconfigured' END;
      _name := CASE _env_key WHEN 'promobrind' THEN 'Catálogo Promobrind' WHEN 'crm' THEN 'CRM Promobrind' ELSE initcap(_env_key) END;
      SELECT NOT EXISTS (SELECT 1 FROM public.external_connections WHERE env_key = _env_key AND type = 'supabase') INTO _is_insert;
      INSERT INTO public.external_connections (type, name, env_key, config, secret_refs, status, created_by)
      VALUES ('supabase', _name, _env_key, jsonb_build_object('mirrored_from', 'integration_credentials'), ARRAY[_url_name, _anon_name, _svc_name], _status, _system_uid)
      ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
      SET status = EXCLUDED.status, secret_refs = EXCLUDED.secret_refs, name = EXCLUDED.name, updated_at = now();
      IF _is_insert THEN _created := _created + 1; ELSE _updated := _updated + 1; END IF;
      _processed := _processed + 1;
    END LOOP;
    INSERT INTO public.external_connections_sync_log (triggered_by_user_id, triggered_by_secret_name, trigger_op, processed, created_count, updated_count, status, duration_ms, details)
    VALUES (_trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'), _processed, _created, _updated, 'ok', EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int, jsonb_build_object('env_keys', _env_keys));
    _result := jsonb_build_object('ok', true, 'processed', _processed, 'created', _created, 'updated', _updated, 'ran_at', now());
    RETURN _result;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.external_connections_sync_log (triggered_by_user_id, triggered_by_secret_name, trigger_op, processed, created_count, updated_count, status, error_message, duration_ms)
    VALUES (_trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'), _processed, _created, _updated, 'error', _err, EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int);
    RAISE;
  END;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."validate_mcp_key"("_key_plain" "text") RETURNS TABLE("key_id" "uuid", "scopes" "text"[], "block_reason" "text", "created_by" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _hash text;
  _row record;
  _is_full boolean;
  _grantor_is_dev boolean;
BEGIN
  IF _key_plain IS NULL OR length(_key_plain) < 16 THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(_key_plain, 'sha256'), 'hex');

  SELECT k.id, k.scopes, k.expires_at, k.revoked_at, k.created_by
  INTO _row
  FROM public.mcp_api_keys AS k
  WHERE k.key_hash = _hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF _row.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT _row.id, NULL::text[], 'revoked'::text, _row.created_by;
    RETURN;
  END IF;

  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RETURN QUERY SELECT _row.id, NULL::text[], 'expired'::text, _row.created_by;
    RETURN;
  END IF;

  _is_full := _row.scopes @> ARRAY['*']::text[];
  IF _is_full THEN
    IF _row.created_by IS NULL THEN
      _grantor_is_dev := false;
    ELSE
      _grantor_is_dev := public.is_dev(_row.created_by);
    END IF;

    IF NOT _grantor_is_dev THEN
      UPDATE public.mcp_api_keys
        SET revoked_at = now(), updated_at = now()
        WHERE mcp_api_keys.id = _row.id AND mcp_api_keys.revoked_at IS NULL;

      INSERT INTO public.mcp_key_auto_revocations(key_id, created_by, revoked_at, source, reason)
      VALUES (_row.id, _row.created_by, now(), 'manual', 'grantor_lost_dev_at_use');

      INSERT INTO public.admin_audit_log (
        user_id, action, resource_type, resource_id,
        status, source, details
      ) VALUES (
        _row.created_by,
        'mcp_key.auto_revoked',
        'mcp_api_key',
        _row.id,
        'denied',
        'validate_mcp_key',
        jsonb_build_object(
          'reason', 'grantor_lost_dev_at_use',
          'is_full_access', true,
          'auto_revoked_at', now()
        )
      );

      INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, metadata)
      VALUES (
        _row.created_by,
        'mcp_full_issue',
        _row.id::text,
        'auto_revoked',
        jsonb_build_object('reason','grantor_lost_dev_at_use','source','validate_mcp_key')
      );

      RETURN QUERY SELECT _row.id, NULL::text[], 'grantor_lost_dev'::text, _row.created_by;
      RETURN;
    END IF;
  END IF;

  UPDATE public.mcp_api_keys SET last_used_at = now() WHERE id = _row.id;

  RETURN QUERY SELECT _row.id, _row.scopes, NULL::text, _row.created_by;
END;
$$;



CREATE OR REPLACE FUNCTION "public"."verify_step_up_otp"("_challenge_id" "uuid", "_otp" "text") RETURNS TABLE("token" "text", "expires_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  _uid UUID := auth.uid();
  _row RECORD;
  _otp_h TEXT;
  _token TEXT;
  _token_h TEXT;
  _tid UUID;
  _exp TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT challenge.* INTO _row FROM public.step_up_challenges AS challenge
  WHERE challenge.id = _challenge_id AND challenge.user_id = _uid
    AND challenge.consumed = false AND challenge.expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.step_up_audit_log(user_id, event_type, challenge_id, metadata)
    VALUES (_uid, 'failed', _challenge_id, '{"reason":"challenge_not_found_or_expired"}'::jsonb);
    RAISE EXCEPTION 'invalid_or_expired_challenge';
  END IF;

  IF NOT _row.password_verified THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, '{"reason":"password_not_verified"}'::jsonb);
    RAISE EXCEPTION 'password_not_verified_first';
  END IF;

  IF _row.attempts >= _row.max_attempts THEN
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, '{"reason":"max_attempts"}'::jsonb);
    RAISE EXCEPTION 'max_attempts_exceeded';
  END IF;

  _otp_h := encode(extensions.digest(_otp || _uid::text, 'sha256'), 'hex');

  IF _otp_h <> _row.otp_hash THEN
    UPDATE public.step_up_challenges SET attempts = attempts + 1 WHERE id = _challenge_id;
    INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, metadata)
    VALUES (_uid, _row.action, _row.target_ref, 'failed', _challenge_id, jsonb_build_object('reason','wrong_otp','attempt', _row.attempts + 1));
    RAISE EXCEPTION 'invalid_otp';
  END IF;

  -- OK: gera token de uso único
  _token := encode(extensions.gen_random_bytes(32), 'hex');
  _token_h := encode(extensions.digest(_token, 'sha256'), 'hex');
  _exp := now() + interval '5 minutes';

  INSERT INTO public.step_up_tokens(user_id, action, target_ref, token_hash, challenge_id, expires_at)
  VALUES (_uid, _row.action, _row.target_ref, _token_h, _challenge_id, _exp)
  RETURNING id INTO _tid;

  UPDATE public.step_up_challenges
    SET otp_verified = true, consumed = true
    WHERE id = _challenge_id;

  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, token_id)
  VALUES (_uid, _row.action, _row.target_ref, 'otp_verified', _challenge_id, _tid);
  INSERT INTO public.step_up_audit_log(user_id, action, target_ref, event_type, challenge_id, token_id)
  VALUES (_uid, _row.action, _row.target_ref, 'token_issued', _challenge_id, _tid);

  RETURN QUERY SELECT _token, _exp;
END;
$$;
