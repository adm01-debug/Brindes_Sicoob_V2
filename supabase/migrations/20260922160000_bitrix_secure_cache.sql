-- Cache usado exclusivamente pela Edge Function bitrix-sync.
-- Substitui a migration histórica 20251214185703, cuja policy FOR ALL
-- permitia escrita direta de qualquer usuário autenticado.
CREATE TABLE public.bitrix_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_id text NOT NULL UNIQUE,
  name text NOT NULL,
  ramo text,
  nicho text,
  primary_color_name text,
  primary_color_hex text,
  email text,
  phone text,
  address text,
  logo_url text,
  total_spent numeric(12,2) NOT NULL DEFAULT 0,
  last_purchase_date timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bitrix_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bitrix_id text NOT NULL UNIQUE,
  bitrix_client_id text NOT NULL,
  title text NOT NULL,
  value numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  stage text,
  close_date timestamptz,
  created_at_bitrix timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.bitrix_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synced_by uuid REFERENCES auth.users(id),
  clients_synced integer NOT NULL DEFAULT 0,
  deals_synced integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX bitrix_deals_client_idx ON public.bitrix_deals(bitrix_client_id);
CREATE INDEX bitrix_sync_logs_started_idx ON public.bitrix_sync_logs(started_at DESC);
CREATE TRIGGER update_bitrix_clients_updated_at
  BEFORE UPDATE ON public.bitrix_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.bitrix_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitrix_sync_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.bitrix_clients, public.bitrix_deals, public.bitrix_sync_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bitrix_clients, public.bitrix_deals, public.bitrix_sync_logs TO service_role;
