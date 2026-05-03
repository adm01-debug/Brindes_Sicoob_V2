ALTER TABLE public.query_telemetry 
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS is_rls_violation BOOLEAN DEFAULT false;
