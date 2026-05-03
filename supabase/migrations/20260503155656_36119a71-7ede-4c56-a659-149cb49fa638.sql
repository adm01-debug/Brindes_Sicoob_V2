-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.is_vendedor(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'vendedor');
$function$;

CREATE OR REPLACE FUNCTION public.get_user_pa_id() RETURNS UUID AS $$
    SELECT pa_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_user_cooperative_id() RETURNS UUID AS $$
    SELECT cooperativa_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Table for batch export jobs
CREATE TABLE IF NOT EXISTS public.export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    export_type TEXT NOT NULL CHECK (export_type IN ('pdf', 'excel', 'csv')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('orders', 'quotes')),
    filters JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    file_url TEXT,
    total_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

-- Policies for export_jobs
CREATE POLICY "Users can view their own export jobs" 
ON public.export_jobs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own export jobs" 
ON public.export_jobs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Audit log for exports
CREATE TABLE IF NOT EXISTS public.export_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.export_jobs(id),
    user_id UUID REFERENCES auth.users(id),
    export_type TEXT,
    filters JSONB,
    record_count INTEGER,
    status TEXT,
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.export_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all export audit logs" 
ON public.export_audit_log FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own export audit logs" 
ON public.export_audit_log FOR SELECT 
USING (auth.uid() = user_id);

-- Ensure RLS on sicoob_orders is correct
ALTER TABLE public.sicoob_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sicoob_orders_select" ON public.sicoob_orders;
CREATE POLICY "sicoob_orders_select" ON public.sicoob_orders FOR SELECT
USING (
    is_admin(auth.uid()) OR
    (is_gerente_pa(auth.uid()) AND pa_id = get_user_pa_id()) OR
    (is_gestor_compras(auth.uid()) AND cooperative_id = get_user_cooperative_id()) OR
    is_vendedor(auth.uid()) OR
    (created_by = auth.uid())
);

-- RLS for sicoob_order_history
ALTER TABLE public.sicoob_order_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sicoob_order_history_select" ON public.sicoob_order_history;
CREATE POLICY "sicoob_order_history_select" ON public.sicoob_order_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sicoob_orders o 
        WHERE o.id = sicoob_order_history.order_id
    )
);

-- RLS for order_comments (chat)
ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_comments_select" ON public.order_comments;
CREATE POLICY "order_comments_select" ON public.order_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sicoob_orders o 
        WHERE o.id = order_comments.order_id
    ) OR
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = order_comments.order_id
    )
);
