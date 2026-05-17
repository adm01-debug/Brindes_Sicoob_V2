-- 1. Enhance sicoob_centrais for branding
ALTER TABLE public.sicoob_centrais 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#003641';

-- 2. Link existing cooperativas to centrais and themes
ALTER TABLE public.cooperativas 
ADD COLUMN IF NOT EXISTS central_id UUID REFERENCES public.sicoob_centrais(id),
ADD COLUMN IF NOT EXISTS sicoob_tema_id UUID REFERENCES public.sicoob_temas(id);

-- 3. Create a view for the full Sicoob Hierarchy (convenience for UI)
CREATE OR REPLACE VIEW public.v_sicoob_hierarchy AS
SELECT 
    c.id as central_id,
    c.name as central_name,
    c.primary_color as central_color,
    s.id as singular_id,
    s.nome as singular_name,
    s.codigo as singular_code,
    s.sicoob_tema_id as tema_id,
    t.name as tema_name,
    pa.id as pa_id,
    pa.nome as pa_name,
    pa.codigo as pa_code
FROM 
    public.sicoob_centrais c
JOIN 
    public.cooperativas s ON s.central_id = c.id
JOIN 
    public.postos_atendimento pa ON pa.cooperativa_id = s.id
LEFT JOIN 
    public.sicoob_temas t ON s.sicoob_tema_id = t.id;

-- 4. Set some default Centrais if empty
INSERT INTO public.sicoob_centrais (name, code, region, primary_color)
VALUES 
    ('Sicoob Central SC/RS', 'SC-RS', 'Sul', '#003641'),
    ('Sicoob Central Planalto Central', 'CPC', 'Centro-Oeste', '#003641'),
    ('Sicoob Central Nordeste', 'NE', 'Nordeste', '#003641')
ON CONFLICT (code) DO NOTHING;
