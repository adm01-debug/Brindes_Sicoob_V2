ALTER TABLE public.quote_templates ADD COLUMN IF NOT EXISTS category TEXT;
COMMENT ON COLUMN public.quote_templates.category IS 'Categoria do template para facilitar a busca (ex: Brindes, Eventos, Kits).';

-- Update some defaults if any
UPDATE public.quote_templates SET category = 'Geral' WHERE category IS NULL;