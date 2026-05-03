-- Fix helper functions to use user_id
CREATE OR REPLACE FUNCTION public.get_user_pa_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT pa_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_user_cooperative_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT cooperativa_id FROM public.profiles WHERE user_id = auth.uid();
$function$;

-- Harmonize RLS for sicoob_orders
DROP POLICY IF EXISTS "Gerentes can view their PA orders" ON public.sicoob_orders;
DROP POLICY IF EXISTS "Gestores can view their cooperative orders" ON public.sicoob_orders;
DROP POLICY IF EXISTS "Vendedores can view their own orders" ON public.sicoob_orders;
DROP POLICY IF EXISTS "sicoob_orders_select" ON public.sicoob_orders;
DROP POLICY IF EXISTS "PAC can view their own orders" ON public.sicoob_orders;
DROP POLICY IF EXISTS "Gestor can view their cooperative orders" ON public.sicoob_orders;
DROP POLICY IF EXISTS "Singular can view their cooperative orders" ON public.sicoob_orders;

CREATE POLICY "sicoob_orders_role_access" 
ON public.sicoob_orders 
FOR SELECT 
USING (
  (has_role(auth.uid(), 'gerente_pa') AND pa_id = get_user_pa_id()) OR 
  (has_role(auth.uid(), 'comprador_pac') AND pa_id = get_user_pa_id()) OR
  (has_role(auth.uid(), 'gestor_compras') AND cooperative_id = get_user_cooperative_id()) OR
  (has_role(auth.uid(), 'comprador_singular') AND cooperative_id = get_user_cooperative_id()) OR
  (has_role(auth.uid(), 'admin')) OR
  (has_role(auth.uid(), 'dev')) OR
  (created_by = auth.uid())
);

-- Quotes RLS
DROP POLICY IF EXISTS "Singular Buyers can view quotes from their PACs" ON public.quotes;
DROP POLICY IF EXISTS "PAC can view their own quotes" ON public.quotes;
DROP POLICY IF EXISTS "Gestor/Singular can view their cooperative quotes" ON public.quotes;

CREATE POLICY "quotes_role_access" 
ON public.quotes 
FOR SELECT 
USING (
  (has_role(auth.uid(), 'gerente_pa') AND pa_id = get_user_pa_id()) OR 
  (has_role(auth.uid(), 'comprador_pac') AND pa_id = get_user_pa_id()) OR
  (has_role(auth.uid(), 'gestor_compras') AND singular_id = get_user_cooperative_id()) OR
  (has_role(auth.uid(), 'comprador_singular') AND singular_id = get_user_cooperative_id()) OR
  (has_role(auth.uid(), 'admin')) OR
  (has_role(auth.uid(), 'dev')) OR
  (seller_id = auth.uid())
);

-- Comments RLS
DROP POLICY IF EXISTS "comments_select_scope" ON public.order_comments;
DROP POLICY IF EXISTS "Comments visibility based on order access" ON public.order_comments;

CREATE POLICY "order_comments_role_access" 
ON public.order_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders so 
    WHERE so.id = order_comments.order_id
  )
);

-- Audit Events RLS
DROP POLICY IF EXISTS "audit_select_scope" ON public.order_audit_events;
DROP POLICY IF EXISTS "Audit events visibility based on order access" ON public.order_audit_events;

CREATE POLICY "order_audit_events_role_access" 
ON public.order_audit_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_orders so 
    WHERE so.id = order_audit_events.order_id
  )
);

-- Create table for scheduled exports
CREATE TABLE IF NOT EXISTS public.scheduled_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('orders', 'quotes')),
  export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel')),
  filters JSONB,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.scheduled_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own scheduled exports" 
ON public.scheduled_exports 
FOR ALL 
USING (auth.uid() = user_id);
