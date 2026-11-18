CREATE OR REPLACE FUNCTION public.retry_failed_webhook_deliveries()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_project_url text;
  v_dispatcher_secret text;
  v_retried integer := 0;
  v_claimed integer := 0;
  v_skipped_active_lease integer := 0;
  v_skipped_max_attempts integer := 0;
  v_skipped_claim_conflicts integer := 0;
  v_enqueue_errors integer := 0;
  rec record;
  v_max_attempts integer;
  v_lock_acquired boolean;
  v_claim_id uuid;
BEGIN
  -- O lock transacional impede que a cron e uma chamada manual reservem em
  -- paralelo a mesma tentativa de retry.
  v_lock_acquired := pg_try_advisory_xact_lock(20261029, 213000);
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'ok', true, 'retried', 0, 'claimed', 0,
      'skipped_active_lease', 0, 'skipped_max_attempts', 0,
      'skipped_claim_conflicts', 0, 'enqueue_errors', 0,
      'skipped_busy', true
    );
  END IF;

  SELECT decrypted_secret INTO v_project_url
  FROM vault.decrypted_secrets
  WHERE name = 'sicoob_project_url'
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT decrypted_secret INTO v_dispatcher_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_dispatcher_secret'
  ORDER BY updated_at DESC
  LIMIT 1;

  v_project_url := rtrim(COALESCE(v_project_url, ''), '/');
  IF v_project_url !~ '^https://[a-z0-9-]+[.]supabase[.]co$'
     OR length(COALESCE(v_dispatcher_secret, '')) NOT BETWEEN 32 AND 512 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'webhook_dispatcher_not_configured'
    );
  END IF;

  -- O callback de uma entrega (inclusive um replay manual) inicia uma nova
    -- Um callback entrega (inclusive replay manual) inicia nova fronteira: apague
    -- apenas claims já superadas por uma entrega materializada depois delas:
    -- de tentativa posterior (a rodada avançou além da reserva) ou da própria
    -- tentativa reservada concluída com sucesso. Uma falha intermediária da MESMA
    -- tentativa reservada NÃO apaga a claim: o dispatcher pode estar em backoff e
    -- a lease de 15 min é o que impede o reenfileiramento (retry duplicado).
  DELETE FROM public.webhook_retry_claims AS c
  WHERE EXISTS (
    SELECT 1
    FROM public.webhook_deliveries AS d
    WHERE d.webhook_id = c.webhook_id
      AND d.event = c.event
      AND d.payload IS NOT DISTINCT FROM c.payload
      AND d.delivered_at > c.claimed_at
      AND (d.attempt > c.attempt OR (d.success AND d.attempt = c.attempt))
  );

  FOR rec IN
    WITH candidates AS (
      SELECT
        d.id, d.webhook_id, d.event, d.payload, d.payload_hash,
        d.attempt, d.success, d.error_message, d.delivered_at AS occurred_at,
        'delivery'::text AS source
      FROM public.webhook_deliveries AS d
      WHERE d.delivered_at > now() - interval '1 hour'
      UNION ALL
      SELECT
        c.id, c.webhook_id, c.event, c.payload, c.payload_hash,
        c.attempt, false AS success, 'retry_enqueued'::text AS error_message,
        c.claimed_at AS occurred_at, 'retry_claim'::text AS source
      FROM public.webhook_retry_claims AS c
      WHERE c.claimed_at > now() - interval '1 hour'
    ), latest AS (
      SELECT DISTINCT ON (d.webhook_id, d.event, d.payload)
        d.id, d.webhook_id, d.event, d.payload, d.payload_hash,
        d.attempt, d.success, d.error_message, d.occurred_at, d.source
      FROM candidates AS d
      ORDER BY d.webhook_id, d.event, d.payload, d.occurred_at DESC,
        d.attempt DESC, (d.source = 'delivery') DESC, d.id DESC
    )
    SELECT l.*, w.active, w.retry_policy
    FROM latest AS l
    JOIN public.outbound_webhooks AS w ON w.id = l.webhook_id
    WHERE l.success = false AND w.active = true
  LOOP
    BEGIN
      v_max_attempts := LEAST(5, GREATEST(1, COALESCE((rec.retry_policy->>'max_attempts')::integer, 3)));
    EXCEPTION WHEN OTHERS THEN
      -- Retry policy inválida (ex.: max_attempts não numérico) não pode
      -- derrubar o batch inteiro de retries; usa o padrão conservador.
      v_max_attempts := 3;
    END;

    -- A chamada HTTP é assíncrona. Aguarda sua execução antes de consumir
    -- outra tentativa; após 15 minutos, uma reserva sem resultado pode avançar.
    -- O rec pode ser a delivery mais recente da MESMA tentativa reservada (o
    -- dispatcher está em backoff): a claim ativa também bloqueia esse caminho,
    -- senão o retry SQL reenfileiraria antes de o dispatcher terminar.
    IF rec.source = 'retry_claim'
       AND rec.occurred_at > now() - interval '15 minutes' THEN
      v_skipped_active_lease := v_skipped_active_lease + 1;
      CONTINUE;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.webhook_retry_claims AS c2
      WHERE c2.webhook_id = rec.webhook_id
        AND c2.event = rec.event
        AND ((c2.payload_hash IS NOT NULL AND c2.payload_hash = rec.payload_hash)
             OR (c2.payload_hash IS NULL
                 AND c2.payload IS NOT DISTINCT FROM rec.payload))
        AND c2.claimed_at > now() - interval '15 minutes'
    ) THEN
      v_skipped_active_lease := v_skipped_active_lease + 1;
      CONTINUE;
    END IF;

    IF rec.attempt >= v_max_attempts THEN
      v_skipped_max_attempts := v_skipped_max_attempts + 1;
      CONTINUE;
    END IF;

    -- Reserva fora do histórico de deliveries para não contaminar métricas.
    v_claim_id := NULL;
    INSERT INTO public.webhook_retry_claims (
      webhook_id, event, payload, payload_hash, attempt
    ) VALUES (
      rec.webhook_id, rec.event, rec.payload, rec.payload_hash, rec.attempt + 1
    ) ON CONFLICT DO NOTHING
    RETURNING id INTO v_claim_id;
    IF v_claim_id IS NULL THEN
      v_skipped_claim_conflicts := v_skipped_claim_conflicts + 1;
      CONTINUE;
    END IF;
    v_claimed := v_claimed + 1;

    BEGIN
      PERFORM extensions.http_post(
        url := v_project_url || '/functions/v1/webhook-dispatcher',
        body := jsonb_build_object(
          'event', rec.event,
          'payload', rec.payload,
          'target_webhook_id', rec.webhook_id,
          'retry_after_attempt', rec.attempt
        ),
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-sicoob-internal-secret', v_dispatcher_secret
        ),
        timeout_milliseconds := 5000
      );
      v_retried := v_retried + 1;
    EXCEPTION WHEN OTHERS THEN
      -- A reserva permanece para consumir esta tentativa mesmo se pg_net
      -- rejeitar o enqueue.
      v_enqueue_errors := v_enqueue_errors + 1;
      RAISE WARNING 'Falha ao enfileirar retry do webhook (SQLSTATE %)', SQLSTATE;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'retried', v_retried,
    'claimed', v_claimed,
    'skipped_active_lease', v_skipped_active_lease,
    'skipped_max_attempts', v_skipped_max_attempts,
    'skipped_claim_conflicts', v_skipped_claim_conflicts,
    'enqueue_errors', v_enqueue_errors,
    'ran_at', now()
  );
END;
$function$
