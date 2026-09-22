CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
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
  version integer DEFAULT 1, row_version bigint DEFAULT 1, rejection_notes text
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
