ALTER TABLE public.query_telemetry 
ADD COLUMN IF NOT EXISTS request_id TEXT,
ADD COLUMN IF NOT EXISTS trace_id TEXT;

CREATE INDEX IF NOT EXISTS idx_query_telemetry_request_id ON public.query_telemetry(request_id);