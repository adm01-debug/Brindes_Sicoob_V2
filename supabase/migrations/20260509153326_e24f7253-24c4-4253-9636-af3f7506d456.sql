ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;
ALTER TABLE public.quote_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC DEFAULT 0;

COMMENT ON COLUMN public.quotes.total_cost IS 'Custo total acumulado do orçamento (produtos + gravações) no momento da criação/edição.';
COMMENT ON COLUMN public.quote_items.unit_cost IS 'Custo unitário do produto no momento em que foi adicionado ao orçamento.';