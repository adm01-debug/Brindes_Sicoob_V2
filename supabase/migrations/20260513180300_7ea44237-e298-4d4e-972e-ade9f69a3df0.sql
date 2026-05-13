-- Add deleted_at to core tables
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.product_groups ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.product_components ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.product_component_locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Update RLS for quotes
-- Select scope
DROP POLICY IF EXISTS "quotes_select_scope" ON public.quotes;
CREATE POLICY "quotes_select_scope" ON public.quotes
    FOR SELECT TO authenticated
    USING (
      (deleted_at IS NULL) AND
      (can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))
    );

-- Role access
DROP POLICY IF EXISTS "quotes_role_access" ON public.quotes;
CREATE POLICY "quotes_role_access" ON public.quotes
    FOR SELECT TO authenticated
    USING (
      (deleted_at IS NULL) AND
      ((has_role(auth.uid(), 'gerente_pa'::app_role) AND (pa_id = get_user_pa_id())) OR (has_role(auth.uid(), 'comprador_pac'::app_role) AND (pa_id = get_user_pa_id())) OR (has_role(auth.uid(), 'gestor_compras'::app_role) AND (singular_id = get_user_cooperative_id())) OR (has_role(auth.uid(), 'comprador_singular'::app_role) AND (singular_id = get_user_cooperative_id())) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role) OR (seller_id = auth.uid()))
    );

-- Sync function
CREATE OR REPLACE FUNCTION public.sync_is_active_with_deleted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    NEW.is_active = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add is_active if missing and sync triggers
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

DROP TRIGGER IF EXISTS sync_quotes_is_active ON public.quotes;
CREATE TRIGGER sync_quotes_is_active
BEFORE UPDATE ON public.quotes
FOR EACH ROW
WHEN (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
EXECUTE FUNCTION public.sync_is_active_with_deleted_at();

DROP TRIGGER IF EXISTS sync_groups_is_active ON public.product_groups;
CREATE TRIGGER sync_groups_is_active
BEFORE UPDATE ON public.product_groups
FOR EACH ROW
WHEN (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at)
EXECUTE FUNCTION public.sync_is_active_with_deleted_at();
