-- Create portfolio_items table
CREATE TABLE IF NOT EXISTS public.portfolio_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    client_name TEXT,
    category TEXT,
    link_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can read active portfolio items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'portfolio_items' AND policyname = 'Anyone can view active portfolio items'
    ) THEN
        CREATE POLICY "Anyone can view active portfolio items"
        ON public.portfolio_items
        FOR SELECT
        USING (is_active = true);
    END IF;
END $$;

-- Only admins can manage portfolio items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'portfolio_items' AND policyname = 'Admins can manage portfolio items'
    ) THEN
        CREATE POLICY "Admins can manage portfolio items"
        ON public.portfolio_items
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
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_portfolio_items_updated_at') THEN
        CREATE TRIGGER update_portfolio_items_updated_at
        BEFORE UPDATE ON public.portfolio_items
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
