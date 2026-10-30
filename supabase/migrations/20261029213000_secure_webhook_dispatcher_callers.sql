-- Corrige os chamadores internos do webhook-dispatcher para usar o segredo
-- dedicado exigido pela Edge Function. Valores nunca ficam no cron ou SQL:
-- URL e segredo são lidos do Vault em cada execução.

-- Claims separados preservam as métricas e o histórico real de entregas.
CREATE TABLE public.webhook_retry_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.outbound_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb,
  payload_hash text,
  attempt integer NOT NULL CHECK (attempt > 0),
  claimed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX webhook_retry_claims_attempt_unique_idx
  ON public.webhook_retry_claims (
    webhook_id, event, (COALESCE(payload::text, '<sql-null>')), attempt
  );
CREATE INDEX webhook_retry_claims_claimed_at_idx
  ON public.webhook_retry_claims (claimed_at DESC);

ALTER TABLE public.webhook_retry_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.webhook_retry_claims FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE public.webhook_retry_claims IS
'Reserva durável de tentativas antes do enqueue assíncrono; não representa uma entrega nem participa das métricas de sucesso/falha.';

CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_deleted_outbound integer;
  v_deleted_inbound integer;
  v_deleted_retry_claims integer;
BEGIN
  DELETE FROM public.webhook_deliveries
  WHERE delivered_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_outbound = ROW_COUNT;

  DELETE FROM public.inbound_webhook_events
  WHERE received_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_inbound = ROW_COUNT;

  DELETE FROM public.webhook_retry_claims
  WHERE claimed_at < now() - interval '90 days';
  GET DIAGNOSTICS v_deleted_retry_claims = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_outbound', v_deleted_outbound,
    'deleted_inbound', v_deleted_inbound,
    'deleted_retry_claims', v_deleted_retry_claims,
    'ran_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_webhook_logs() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_webhook_logs() TO postgres, service_role;

CREATE OR REPLACE FUNCTION public.dispatch_quote_webhook_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_event text;
  v_payload jsonb;
  v_project_url text;
  v_dispatcher_secret text;
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF TG_OP = 'INSERT' THEN
      v_event := 'quote.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      v_event := 'quote.' || NEW.status;
    ELSE
      RETURN NEW;
    END IF;
    v_payload := jsonb_build_object(
      'id', NEW.id,
      'quote_number', NEW.quote_number,
      'status', NEW.status,
      'client_name', NEW.client_name,
      'client_email', NEW.client_email,
      'total', NEW.total,
      'seller_id', NEW.seller_id,
      'updated_at', NEW.updated_at
    );

  ELSIF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status = 'rascunho' AND NEW.order_number LIKE 'RE-%' THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'INSERT' THEN
      v_event := 'order.created';
    ELSE
      RETURN NEW;
    END IF;
    v_payload := jsonb_build_object(
      'id', NEW.id,
      'order_number', NEW.order_number,
      'status', NEW.status,
      'client_name', NEW.client_name,
      'total', NEW.total,
      'seller_id', NEW.seller_id
    );

  ELSIF TG_TABLE_NAME = 'discount_approval_requests' THEN
    IF TG_OP = 'INSERT' THEN
      v_event := 'discount.requested';
    ELSIF TG_OP = 'UPDATE'
          AND OLD.status IS DISTINCT FROM NEW.status
          AND NEW.status IN ('approved', 'rejected') THEN
      v_event := 'discount.' || NEW.status;
    ELSE
      RETURN NEW;
    END IF;
    v_payload := jsonb_build_object(
      'id', NEW.id,
      'quote_id', NEW.quote_id,
      'requested_discount_percent', NEW.requested_discount_percent,
      'status', NEW.status,
      'seller_id', NEW.seller_id
    );

  ELSIF TG_TABLE_NAME = 'kit_share_tokens' THEN
    IF TG_OP = 'INSERT' THEN
      v_event := 'kit.shared';
    ELSE
      RETURN NEW;
    END IF;
    v_payload := jsonb_build_object(
      'id', NEW.id,
      'kit_id', NEW.kit_id,
      'token', NEW.token,
      'client_name', NEW.client_name,
      'seller_id', NEW.seller_id
    );
  ELSE
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.outbound_webhooks
    WHERE active = true AND v_event = ANY(events)
  ) THEN
    RETURN NEW;
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
    RAISE WARNING 'Webhook dispatcher não configurado no Vault';
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := v_project_url || '/functions/v1/webhook-dispatcher',
    body := jsonb_build_object('event', v_event, 'payload', v_payload),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sicoob-internal-secret', v_dispatcher_secret
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Falha de integração não desfaz a operação comercial.
  RAISE WARNING 'Falha ao enfileirar webhook (SQLSTATE %)', SQLSTATE;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.retry_failed_webhook_deliveries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_project_url text;
  v_dispatcher_secret text;
  v_retried integer := 0;
  v_skipped integer := 0;
  rec record;
  v_max_attempts integer;
  v_lock_acquired boolean;
  v_claim_id uuid;
BEGIN
  -- O lock transacional impede que a cron e uma chamada manual reservem em
  -- paralelo a mesma tentativa de retry.
  v_lock_acquired := pg_try_advisory_xact_lock(20261029, 213000);
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object('ok', true, 'retried', 0, 'skipped_busy', true);
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
    v_max_attempts := LEAST(5, GREATEST(1, COALESCE((rec.retry_policy->>'max_attempts')::integer, 3)));

    -- A chamada HTTP é assíncrona. Aguarda sua execução antes de consumir
    -- outra tentativa; após 15 minutos, uma reserva sem resultado pode avançar.
    IF rec.source = 'retry_claim'
       AND rec.occurred_at > now() - interval '15 minutes' THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF rec.attempt >= v_max_attempts THEN
      v_skipped := v_skipped + 1;
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
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

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
    EXCEPTION WHEN OTHERS THEN
      -- A reserva permanece para consumir esta tentativa mesmo se pg_net
      -- rejeitar o enqueue.
      RAISE WARNING 'Falha ao enfileirar retry do webhook (SQLSTATE %)', SQLSTATE;
    END;
    v_retried := v_retried + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'retried', v_retried,
    'skipped_max_attempts', v_skipped,
    'ran_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.retry_failed_webhook_deliveries()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_webhook_deliveries()
  TO postgres, service_role;

REVOKE ALL ON FUNCTION public.dispatch_quote_webhook_event()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.retry_failed_webhook_deliveries() IS
'Reenfileira deliveries falhas com claim transacional e lease de 15 minutos, respeita max_attempts e autentica o dispatcher pelo segredo dedicado do Vault. Claims não representam entregas nem entram nas métricas de delivery.';
