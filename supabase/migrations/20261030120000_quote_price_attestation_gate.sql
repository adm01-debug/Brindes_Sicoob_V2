-- Fecha a edição de preço/custo por payload do navegador. O Edge registra um
-- atestado curto e privado; o RPC autenticado o consome na mesma transação.
-- Nenhum dado do catálogo é espelhado no banco local.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.quote_price_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  quote_id uuid,
  expected_row_version integer,
  payload_hash text NOT NULL CHECK (length(payload_hash) = 64),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_transaction_id xid8,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT quote_price_attestations_version_check CHECK (
    (quote_id IS NULL AND expected_row_version IS NULL)
    OR (quote_id IS NOT NULL AND expected_row_version > 0)
  ),
  CONSTRAINT quote_price_attestations_consumption_check CHECK (
    (consumed_at IS NULL AND consumed_transaction_id IS NULL)
    OR (consumed_at IS NOT NULL AND consumed_transaction_id IS NOT NULL)
  )
);

REVOKE ALL ON TABLE private.quote_price_attestations FROM PUBLIC, anon, authenticated, service_role;
CREATE INDEX IF NOT EXISTS quote_price_attestations_expiration_idx
  ON private.quote_price_attestations (expires_at);

CREATE OR REPLACE FUNCTION private.quote_price_payload_hash(
  p_quote jsonb,
  p_items jsonb,
  p_history jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, extensions
AS $function$
  SELECT encode(
    extensions.digest(
      (COALESCE(p_quote, '{}'::jsonb) - 'price_attestation_id')::text
      || E'\x1f' || COALESCE(p_items, '[]'::jsonb)::text
      || E'\x1f' || COALESCE(p_history, '[]'::jsonb)::text,
      'sha256'
    ),
    'hex'
  );
$function$;
REVOKE ALL ON FUNCTION private.quote_price_payload_hash(jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.register_quote_price_attestation(
  p_actor_id uuid,
  p_quote_id uuid,
  p_expected_row_version integer,
  p_quote jsonb,
  p_items jsonb,
  p_history jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
DECLARE
  v_id uuid;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Somente o serviço de preços pode emitir atestados.';
  END IF;
  IF p_actor_id IS NULL
     OR jsonb_typeof(p_quote) IS DISTINCT FROM 'object'
     OR jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR jsonb_typeof(COALESCE(p_history, '[]'::jsonb)) IS DISTINCT FROM 'array'
     OR (p_quote_id IS NULL AND p_expected_row_version IS NOT NULL)
     OR (p_quote_id IS NOT NULL AND COALESCE(p_expected_row_version, 0) <= 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O contexto do atestado de preço é inválido.';
  END IF;

  DELETE FROM private.quote_price_attestations
   WHERE expires_at < clock_timestamp() - interval '1 day';

  INSERT INTO private.quote_price_attestations (
    actor_id, quote_id, expected_row_version, payload_hash, expires_at
  ) VALUES (
    p_actor_id,
    p_quote_id,
    p_expected_row_version,
    private.quote_price_payload_hash(p_quote, p_items, p_history),
    clock_timestamp() + interval '5 minutes'
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.register_quote_price_attestation(uuid, uuid, integer, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_quote_price_attestation(uuid, uuid, integer, jsonb, jsonb, jsonb)
  TO service_role;

CREATE OR REPLACE FUNCTION public.consume_quote_price_attestation(
  p_attestation_id uuid,
  p_actor_id uuid,
  p_quote_id uuid,
  p_expected_row_version integer,
  p_quote jsonb,
  p_items jsonb,
  p_history jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
DECLARE
  v_call_context text;
  v_claimed_id uuid;
BEGIN
  GET DIAGNOSTICS v_call_context = PG_CONTEXT;
  IF current_setting('request.jwt.claim.role', true) NOT IN ('authenticated', 'service_role')
     OR (current_setting('request.jwt.claim.role', true) = 'authenticated'
         AND auth.uid() IS DISTINCT FROM p_actor_id)
     OR v_call_context !~ 'PL/pgSQL function (public\.)?save_quote_atomic(_idempotent)?_attested\(' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O atestado só pode ser consumido pelo salvamento autenticado.';
  END IF;

  UPDATE private.quote_price_attestations AS attestation
     SET consumed_at = clock_timestamp(),
         consumed_transaction_id = pg_current_xact_id()
   WHERE attestation.id = p_attestation_id
     AND attestation.actor_id = p_actor_id
     AND attestation.quote_id IS NOT DISTINCT FROM p_quote_id
     AND attestation.expected_row_version IS NOT DISTINCT FROM p_expected_row_version
     AND attestation.payload_hash = private.quote_price_payload_hash(p_quote, p_items, p_history)
     AND attestation.expires_at > clock_timestamp()
     AND attestation.consumed_at IS NULL
  RETURNING attestation.id INTO v_claimed_id;

  IF v_claimed_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O preço do orçamento não foi validado, expirou ou já foi utilizado.';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.consume_quote_price_attestation(uuid, uuid, uuid, integer, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_quote_price_attestation(uuid, uuid, uuid, integer, jsonb, jsonb, jsonb)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_quote_price_attestation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, private
AS $function$
DECLARE
  v_quote_id uuid;
  v_attestation_id uuid;
  v_role text := current_setting('request.jwt.claim.role', true);
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
  IF TG_OP = 'DELETE' AND v_quote_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = v_quote_id)
     AND pg_trigger_depth() > 1 THEN
    RETURN OLD;
  END IF;

  v_attestation_id := NULLIF(current_setting('app.quote_price_attestation_id', true), '')::uuid;
  GET DIAGNOSTICS v_call_context = PG_CONTEXT;
  IF v_role NOT IN ('authenticated', 'service_role')
     OR v_attestation_id IS NULL
     OR v_call_context !~ 'PL/pgSQL function (public\.)?save_quote_atomic\('
     OR NOT EXISTS (
       SELECT 1
         FROM private.quote_price_attestations AS attestation
        WHERE attestation.id = v_attestation_id
          AND attestation.actor_id = v_actor_id
          AND attestation.quote_id IS NOT DISTINCT FROM v_quote_id
          AND attestation.consumed_transaction_id = pg_current_xact_id()
          AND attestation.consumed_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A gravação comercial exige atestado de preço válido.';
  END IF;

  IF TG_TABLE_NAME = 'quote_items' AND TG_OP IN ('INSERT', 'UPDATE') THEN
    NEW.price_confirmed_at := clock_timestamp();
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;
REVOKE ALL ON FUNCTION public.guard_quote_price_attestation()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS zzz_guard_quote_price_attestation ON public.quotes;
CREATE TRIGGER zzz_guard_quote_price_attestation
BEFORE INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_price_attestation();

DROP TRIGGER IF EXISTS zzz_guard_quote_item_price_attestation ON public.quote_items;
CREATE TRIGGER zzz_guard_quote_item_price_attestation
BEFORE INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_price_attestation();

DROP TRIGGER IF EXISTS zzz_guard_quote_personalization_price_attestation
  ON public.quote_item_personalizations;
CREATE TRIGGER zzz_guard_quote_personalization_price_attestation
BEFORE INSERT OR UPDATE OR DELETE ON public.quote_item_personalizations
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_price_attestation();

CREATE OR REPLACE FUNCTION public.save_quote_atomic_attested(
  p_quote jsonb,
  p_items jsonb,
  p_quote_id uuid DEFAULT NULL,
  p_expected_row_version integer DEFAULT NULL,
  p_history jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_attestation_id uuid := NULLIF(p_quote ->> 'price_attestation_id', '')::uuid;
  v_quote jsonb := p_quote - 'price_attestation_id';
  v_history jsonb := COALESCE(p_history, '[]'::jsonb);
BEGIN
  IF v_attestation_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O orçamento precisa de um atestado de preço do catálogo.';
  END IF;
  PERFORM public.consume_quote_price_attestation(
    v_attestation_id, auth.uid(), p_quote_id, p_expected_row_version,
    v_quote, p_items, v_history
  );
  PERFORM set_config('app.quote_price_attestation_id', v_attestation_id::text, true);
  RETURN public.save_quote_atomic(v_quote, p_items, p_quote_id, p_expected_row_version, v_history);
END;
$function$;
REVOKE ALL ON FUNCTION public.save_quote_atomic_attested(jsonb, jsonb, uuid, integer, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quote_atomic_attested(jsonb, jsonb, uuid, integer, jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.save_quote_atomic_idempotent_attested(
  p_quote jsonb,
  p_items jsonb,
  p_idempotency_key uuid,
  p_history jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_attestation_id uuid := NULLIF(p_quote ->> 'price_attestation_id', '')::uuid;
  v_quote jsonb := p_quote - 'price_attestation_id';
  v_history jsonb := COALESCE(p_history, '[]'::jsonb);
BEGIN
  IF v_attestation_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O orçamento precisa de um atestado de preço do catálogo.';
  END IF;
  PERFORM public.consume_quote_price_attestation(
    v_attestation_id, auth.uid(), NULL, NULL, v_quote, p_items, v_history
  );
  PERFORM set_config('app.quote_price_attestation_id', v_attestation_id::text, true);
  RETURN public.save_quote_atomic_idempotent(
    v_quote, p_items, p_idempotency_key, v_history
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.save_quote_atomic_idempotent_attested(jsonb, jsonb, uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_quote_atomic_idempotent_attested(jsonb, jsonb, uuid, jsonb)
  TO authenticated;

COMMENT ON TABLE private.quote_price_attestations IS
  'Atestados transitórios e privados de preços validados pela Edge contra o catálogo autoritativo.';

DO $postflight$
BEGIN
  IF has_function_privilege(
       'authenticated',
       'public.register_quote_price_attestation(uuid,uuid,integer,jsonb,jsonb,jsonb)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.register_quote_price_attestation(uuid,uuid,integer,jsonb,jsonb,jsonb)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'authenticated',
       'public.save_quote_atomic_attested(jsonb,jsonb,uuid,integer,jsonb)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'authenticated',
       'public.save_quote_atomic_idempotent_attested(jsonb,jsonb,uuid,jsonb)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'O gate de atestado não preservou a separação de privilégios.';
  END IF;
END;
$postflight$;
