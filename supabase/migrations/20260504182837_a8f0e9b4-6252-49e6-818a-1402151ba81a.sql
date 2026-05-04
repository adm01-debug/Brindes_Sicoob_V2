-- Drop legacy tables
DROP TABLE IF EXISTS public.blog_posts CASCADE;
DROP TABLE IF EXISTS public.portfolio_items CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;

-- System Settings Normalization
DO $$ 
BEGIN
    -- Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'id') THEN
        ALTER TABLE public.system_settings ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'description') THEN
        ALTER TABLE public.system_settings ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'created_at') THEN
        ALTER TABLE public.system_settings ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;

    -- Add primary key if none exists (Double checking we don't have one as per previous read_query)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'system_settings' AND constraint_type = 'PRIMARY KEY'
    ) THEN
        ALTER TABLE public.system_settings ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Policies
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "System settings are viewable by authenticated users" ON public.system_settings;
DROP POLICY IF EXISTS "Only admins can update system settings" ON public.system_settings;

CREATE POLICY "System settings are viewable by authenticated users" 
ON public.system_settings FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can update system settings" 
ON public.system_settings FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.role = 'dev')
    )
);

-- Seed Initial Data
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('feature_cart_system', 'true'::jsonb, 'Ativa o sistema de carrinhos persistentes (B2C/Legado)'),
    ('feature_cms_blog', 'false'::jsonb, 'Ativa o módulo de blog e páginas institucionais'),
    ('feature_direct_chat', 'false'::jsonb, 'Ativa o chat direto entre vendedor e cliente'),
    ('feature_marketing_newsletter', 'true'::jsonb, 'Ativa o módulo de captura de newsletter'),
    ('feature_budget_enforcement', 'true'::jsonb, 'Ativa a validação de verbas (PAC) no checkout')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, description = EXCLUDED.description;
