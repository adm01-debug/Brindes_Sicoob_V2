-- Create blog_posts table
CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    author_id UUID REFERENCES auth.users(id),
    featured_image_url TEXT,
    category TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Policies
-- Public read for published posts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'blog_posts' AND policyname = 'Anyone can view published blog posts'
    ) THEN
        CREATE POLICY "Anyone can view published blog posts"
        ON public.blog_posts
        FOR SELECT
        USING (is_published = true);
    END IF;
END $$;

-- Only admins can manage blog posts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'blog_posts' AND policyname = 'Admins can manage blog posts'
    ) THEN
        CREATE POLICY "Admins can manage blog posts"
        ON public.blog_posts
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
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_blog_posts_updated_at') THEN
        CREATE TRIGGER update_blog_posts_updated_at
        BEFORE UPDATE ON public.blog_posts
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
