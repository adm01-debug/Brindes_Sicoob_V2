CREATE OR REPLACE FUNCTION public.dispatch_quote_webhook_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
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
$function$
