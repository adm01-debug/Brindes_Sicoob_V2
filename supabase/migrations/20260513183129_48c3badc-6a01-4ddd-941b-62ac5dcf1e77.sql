-- Add deleted_at to product_categories
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_deleted_at ON public.product_categories (deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies to exclude deleted categories
DROP POLICY IF EXISTS "Public can view active categories" ON public.product_categories;
CREATE POLICY "Public can view active categories"
ON public.product_categories
FOR SELECT
USING (deleted_at IS NULL AND is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
CREATE POLICY "Admins can manage categories"
ON public.product_categories
FOR ALL
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE role = 'admin'));