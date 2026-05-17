-- Create Centrais table
CREATE TABLE IF NOT EXISTS public.sicoob_centrais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    region TEXT, -- e.g., 'Sul', 'Centro-Oeste', 'Nordeste'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add central_id to singularidades
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'pa_singularidades' AND column_name = 'central_id') THEN
        ALTER TABLE public.pa_singularidades ADD COLUMN central_id UUID REFERENCES public.sicoob_centrais(id);
    END IF;
END $$;

-- Create Themes table for regionalized products
CREATE TABLE IF NOT EXISTS public.sicoob_temas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g., 'Cultura Gaúcha', 'Agro Business', 'Praia/Verão'
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed some initial centrais
INSERT INTO public.sicoob_centrais (name, code, region) VALUES 
('Sicoob Central SC/RS', 'CENTRAL_SCRS', 'Sul'),
('Sicoob Central Rio', 'CENTRAL_RIO', 'Sudeste'),
('Sicoob Central Brasilia', 'CENTRAL_BSB', 'Centro-Oeste')
ON CONFLICT (code) DO NOTHING;

-- Seed some initial themes
INSERT INTO public.sicoob_temas (name, description) VALUES 
('Agro & Campo', 'Produtos focados no setor agropecuário (botinas, chapéus, etc)'),
('Tradição Gaúcha', 'Produtos típicos da região sul (cuias, térmicas, conjuntos de churrasco)'),
('Corporativo Moderno', 'Itens de tecnologia e escritório para grandes centros'),
('Praia & Verão', 'Brindes focados em lazer e regiões litorâneas')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.sicoob_centrais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_temas ENABLE ROW LEVEL SECURITY;

-- Basic policies
CREATE POLICY "Public read for themes" ON public.sicoob_temas FOR SELECT USING (true);
CREATE POLICY "Authenticated read for centrais" ON public.sicoob_centrais FOR SELECT USING (auth.role() = 'authenticated');

-- Function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for centrais
DROP TRIGGER IF EXISTS tr_sicoob_centrais_updated_at ON public.sicoob_centrais;
CREATE TRIGGER tr_sicoob_centrais_updated_at
    BEFORE UPDATE ON public.sicoob_centrais
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
