ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_quotes_tags ON public.quotes USING GIN(tags);