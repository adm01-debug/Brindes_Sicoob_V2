CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA vault;
CREATE TABLE vault.decrypted_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  decrypted_secret text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
CREATE TYPE public.app_role AS ENUM ('dev');
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY, seller_id uuid NOT NULL, quote_number text NOT NULL,
  client_name text, total numeric, valid_until timestamptz, status text DEFAULT 'sent',
  client_response text, client_response_at timestamptz, client_response_notes text,
  is_latest_version boolean NOT NULL DEFAULT true, deleted_at timestamptz,
  internal_notes text DEFAULT 'anotação interna', total_cost numeric DEFAULT 15,
  version integer DEFAULT 1, row_version bigint DEFAULT 1, rejection_notes text,
  approved_by uuid, approved_at timestamptz, approved_pdf_url text,
  organization_id uuid, pa_id uuid, singular_id uuid
);
CREATE TABLE public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quotes(id),
  product_id text, product_name text NOT NULL, product_sku text, product_image_url text,
  quantity integer NOT NULL DEFAULT 1, unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric GENERATED ALWAYS AS (quantity * unit_price) STORED,
  color_name text, color_hex text, notes text, sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.quote_item_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_item_id uuid NOT NULL REFERENCES public.quote_items(id),
  technique_id uuid, colors_count integer DEFAULT 1, positions_count integer DEFAULT 1,
  area_cm2 numeric, setup_cost numeric DEFAULT 0, unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0, notes text, created_at timestamptz DEFAULT now()
);
CREATE TABLE public.quote_approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(sha256(gen_random_uuid()::text::bytea), 'hex'),
  seller_id uuid NOT NULL, client_name text, client_email text,
  status text NOT NULL DEFAULT 'active', expires_at timestamptz DEFAULT now() + interval '7 days',
  viewed_at timestamptz, responded_at timestamptz, response text, response_notes text,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(),
  signer_name text, signer_document text, signer_ip text, signer_user_agent text,
  signature_hash text, signed_at timestamptz
);
CREATE TABLE public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid REFERENCES public.quotes,
  user_id uuid, action text NOT NULL, description text, old_value text, new_value text, metadata jsonb
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_approval_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_own ON public.quotes TO authenticated USING (seller_id = auth.uid());
CREATE POLICY tokens_own ON public.quote_approval_tokens TO authenticated USING (seller_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes, public.quote_approval_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_items,
  public.quote_item_personalizations TO authenticated;
GRANT SELECT ON public.quotes, public.quote_approval_tokens TO anon;
CREATE FUNCTION public.validate_status_fields() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'expired', 'responded') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_validate_approval_token_status BEFORE INSERT OR UPDATE
ON public.quote_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();
CREATE FUNCTION public.invalidate_used_approval_token() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.status := 'responded'; NEW.expires_at := now();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_invalidate_used_approval_token BEFORE UPDATE ON public.quote_approval_tokens
FOR EACH ROW EXECUTE FUNCTION public.invalidate_used_approval_token();

-- Contratos observados no banco de construção em 22/09/2026.
CREATE FUNCTION public.increment_row_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.version IS NOT DISTINCT FROM NEW.version THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_quotes_increment_version BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.increment_row_version();
CREATE FUNCTION public.handle_row_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.row_version := OLD.row_version + 1; RETURN NEW; END;
$$;
CREATE TRIGGER trg_quotes_row_version BEFORE UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.handle_row_version();
CREATE FUNCTION public.log_quote_status_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.quote_history(quote_id,user_id,action,description,old_value,new_value,metadata)
    VALUES (NEW.id,auth.uid(),'status_change','Status alterado de ' || OLD.status || ' para ' || NEW.status,
      OLD.status,NEW.status,jsonb_build_object('changed_at',now(),'rejection_notes',NEW.rejection_notes));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_quote_status_change() FROM PUBLIC;
CREATE TRIGGER tr_log_quote_status_change AFTER UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.log_quote_status_change();

CREATE TABLE public.request_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identifier text NOT NULL,
  endpoint text NOT NULL, request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(), blocked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint)
);
CREATE FUNCTION public.check_rate_limit(
  _identifier text, _endpoint text, _max_requests integer DEFAULT 60,
  _window_seconds integer DEFAULT 60, _block_duration_seconds integer DEFAULT 3600
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row public.request_rate_limits%ROWTYPE; v_now timestamptz := clock_timestamp();
BEGIN
  INSERT INTO public.request_rate_limits(identifier,endpoint) VALUES (_identifier,_endpoint)
  ON CONFLICT(identifier,endpoint) DO UPDATE SET
    request_count = CASE WHEN request_rate_limits.window_start < v_now-make_interval(secs=>_window_seconds) THEN 1 ELSE request_rate_limits.request_count+1 END,
    window_start = CASE WHEN request_rate_limits.window_start < v_now-make_interval(secs=>_window_seconds) THEN v_now ELSE request_rate_limits.window_start END,
    blocked_until = CASE WHEN request_rate_limits.window_start >= v_now-make_interval(secs=>_window_seconds)
      AND request_rate_limits.request_count+1 > _max_requests THEN v_now+make_interval(secs=>_block_duration_seconds) ELSE NULL END,
    updated_at=v_now RETURNING * INTO v_row;
  RETURN jsonb_build_object('allowed',v_row.blocked_until IS NULL,'retry_after_seconds',
    CASE WHEN v_row.blocked_until IS NULL THEN 0 ELSE _block_duration_seconds END);
END; $$;
