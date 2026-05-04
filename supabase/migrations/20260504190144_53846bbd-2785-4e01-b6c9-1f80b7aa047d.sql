-- Create cms_config table for global settings
CREATE TABLE IF NOT EXISTS public.cms_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cms_config ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read CMS config
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cms_config' AND policyname = 'Anyone can read CMS config'
    ) THEN
        CREATE POLICY "Anyone can read CMS config"
        ON public.cms_config
        FOR SELECT
        USING (true);
    END IF;
END $$;

-- Only admins can manage CMS config
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'cms_config' AND policyname = 'Admins can manage CMS config'
    ) THEN
        CREATE POLICY "Admins can manage CMS config"
        ON public.cms_config
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'superuser')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid()
                AND profiles.role IN ('admin', 'superuser')
            )
        );
    END IF;
END $$;

-- Trigger for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cms_config_updated_at') THEN
        CREATE TRIGGER update_cms_config_updated_at
        BEFORE UPDATE ON public.cms_config
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
