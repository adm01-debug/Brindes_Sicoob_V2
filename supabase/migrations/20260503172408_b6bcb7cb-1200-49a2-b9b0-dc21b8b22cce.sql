-- Product Categories (Hierarchical)
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Singulares (Regional Cooperatives)
CREATE TABLE IF NOT EXISTS public.singulares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- PAs (Postos de Atendimento) - Extending existing if needed, but creating if not
-- (User asked for PAFormDialog, assuming we use public.postos_atendimento if it exists)

-- Cooperativas Parceiras
CREATE TABLE IF NOT EXISTS public.cooperativas_parceiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    registration_number TEXT UNIQUE,
    contact_name TEXT,
    contact_email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    is_active BOOLEAN DEFAULT true,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC NOT NULL,
    min_purchase_amount NUMERIC DEFAULT 0,
    max_discount_amount NUMERIC,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns (Marketing)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    budget NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- CMS Banners
CREATE TABLE IF NOT EXISTS public.cms_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link_url TEXT,
    position TEXT DEFAULT 'home_top',
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- CMS Sections
CREATE TABLE IF NOT EXISTS public.cms_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Telemetry Logs
CREATE TABLE IF NOT EXISTS public.telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    page_path TEXT,
    metadata JSONB DEFAULT '{}',
    client_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.singulares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooperativas_parceiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;

-- Simple RLS Policies (Admin only for write, public/authenticated for read where appropriate)
CREATE POLICY "Public can read active categories" ON public.product_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.product_categories FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));

CREATE POLICY "Admins can manage singulares" ON public.singulares FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Admins can manage cooperativas_parceiras" ON public.cooperativas_parceiras FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Admins can manage campaigns" ON public.campaigns FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Admins can manage cms_banners" ON public.cms_banners FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Admins can manage cms_sections" ON public.cms_sections FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));

CREATE POLICY "Admins can view telemetry" ON public.telemetry_logs FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Anyone can insert telemetry" ON public.telemetry_logs FOR INSERT WITH CHECK (true);

-- Functions and Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_categories BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_singulares BEFORE UPDATE ON public.singulares FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_cooperativas BEFORE UPDATE ON public.cooperativas_parceiras FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_newsletter BEFORE UPDATE ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_coupons BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_campaigns BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_banners BEFORE UPDATE ON public.cms_banners FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_sections BEFORE UPDATE ON public.cms_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
