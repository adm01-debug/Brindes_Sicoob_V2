CREATE OR REPLACE FUNCTION public.guard_quote_price_attestation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
DECLARE
  v_quote_id uuid;
  v_attestation_id uuid;
  v_role text := auth.role();
  v_actor_id uuid := auth.uid();
  v_call_context text;
  v_needs_attestation boolean := false;
BEGIN
  IF v_role = 'service_role' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_TABLE_NAME = 'quotes' THEN
    v_quote_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
    v_needs_attestation := TG_OP = 'INSERT' OR (
      TG_OP = 'UPDATE' AND (
        NEW.subtotal IS DISTINCT FROM OLD.subtotal
        OR NEW.discount_percent IS DISTINCT FROM OLD.discount_percent
        OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
        OR NEW.total IS DISTINCT FROM OLD.total
        OR NEW.total_cost IS DISTINCT FROM OLD.total_cost
        OR NEW.negotiation_markup_percent IS DISTINCT FROM OLD.negotiation_markup_percent
        OR NEW.shipping_cost IS DISTINCT FROM OLD.shipping_cost
        OR NEW.shipping_type IS DISTINCT FROM OLD.shipping_type
      )
    );
  ELSIF TG_TABLE_NAME = 'quote_items' THEN
    v_quote_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.quote_id ELSE NEW.quote_id END;
    v_needs_attestation := true;
  ELSE
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      SELECT item.quote_id INTO v_quote_id
        FROM public.quote_items AS item
       WHERE item.id = OLD.quote_item_id;
    END IF;
    IF v_quote_id IS NULL AND TG_OP IN ('INSERT', 'UPDATE') THEN
      SELECT item.quote_id INTO v_quote_id
        FROM public.quote_items AS item
       WHERE item.id = NEW.quote_item_id;
    END IF;
    v_needs_attestation := true;
  END IF;

  IF NOT v_needs_attestation THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Exclusão em cascata de um orçamento continua sendo permitida; a linha
  -- comercial deixa de existir, portanto não há preço novo sendo aceito.
  IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1
     AND (v_quote_id IS NULL OR NOT EXISTS (
       SELECT 1 FROM public.quotes q WHERE q.id = v_quote_id
     )) THEN
    RETURN OLD;
  END IF;

  v_attestation_id := NULLIF(current_setting('app.quote_price_attestation_id', true), '')::uuid;
  GET DIAGNOSTICS v_call_context = PG_CONTEXT;
  -- A criação de nova versão só copia o snapshot comercial de um orçamento
  -- que a RPC original já autorizou para este ator; não aceita preço novo.
  IF v_role = 'authenticated'
     AND TG_OP = 'INSERT'
     AND v_call_context ~ '(public\.)?create_quote_version_atomic_core_20261013\(' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF v_role NOT IN ('authenticated', 'service_role')
     OR v_attestation_id IS NULL
     OR v_call_context !~ 'PL/pgSQL function (public\.)?save_quote_atomic\('
     OR NOT EXISTS (
       SELECT 1
         FROM private.quote_price_attestations AS attestation
        WHERE attestation.id = v_attestation_id
          AND attestation.actor_id = v_actor_id
          AND attestation.quote_id IS NOT DISTINCT FROM CASE
            WHEN TG_TABLE_NAME = 'quotes' AND TG_OP = 'INSERT' THEN NULL::uuid
            ELSE v_quote_id
          END
          AND attestation.consumed_transaction_id = pg_current_xact_id()
          AND attestation.consumed_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A gravação comercial exige atestado de preço válido.';
  END IF;

  IF TG_TABLE_NAME = 'quotes' AND TG_OP = 'INSERT' THEN
    UPDATE private.quote_price_attestations
       SET quote_id = v_quote_id
     WHERE id = v_attestation_id
       AND quote_id IS NULL
       AND consumed_transaction_id = pg_current_xact_id();
  END IF;

  IF TG_TABLE_NAME = 'quote_items' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    NEW.catalog_checked_at := clock_timestamp();
    IF (TG_OP = 'INSERT' AND NEW.price_confirmed_at IS NOT NULL)
       OR (TG_OP = 'UPDATE' AND NEW.price_confirmed_at IS DISTINCT FROM OLD.price_confirmed_at) THEN
      NEW.price_confirmed_at := CASE
        WHEN NEW.price_confirmed_at IS NULL THEN NULL
        ELSE clock_timestamp()
      END;
    END IF;
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
