-- Create order_audit_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'creation', 'status_change', 'approval', 'rejection', 'comment', etc.
    actor_id UUID REFERENCES auth.users(id),
    actor_name TEXT,
    actor_role TEXT,
    description TEXT,
    old_value JSONB,
    new_value JSONB,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;

-- Create policies for audit events
CREATE POLICY "Users can view audit events for orders they have access to" 
ON public.order_audit_events 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.sicoob_orders o
        LEFT JOIN public.profiles p ON p.id = auth.uid()
        WHERE o.id = order_audit_events.order_id
        AND (
            o.created_by = auth.uid() -- Created the order
            OR p.role IN ('admin', 'supervisor', 'logistics') -- Privileged roles
            OR (p.role = 'gestor_pa' AND o.pa_id = p.pa_id) -- PA Manager
            OR (p.role = 'gestor_singular' AND o.cooperative_id = p.cooperativa_id) -- Singular Manager
        )
    )
);

CREATE POLICY "Authenticated users can insert audit events"
ON public.order_audit_events
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Create function to automatically audit status changes on sicoob_orders
CREATE OR REPLACE FUNCTION public.audit_sicoob_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
    actor_profile RECORD;
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        -- Get actor profile info
        SELECT full_name, role INTO actor_profile FROM public.profiles WHERE id = auth.uid();
        
        INSERT INTO public.order_audit_events (
            order_id,
            event_type,
            actor_id,
            actor_name,
            actor_role,
            description,
            old_value,
            new_value,
            created_at
        ) VALUES (
            NEW.id,
            'status_change',
            auth.uid(),
            COALESCE(actor_profile.full_name, 'Sistema'),
            actor_profile.role,
            'Mudança de status do pedido: ' || OLD.status || ' -> ' || NEW.status,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status),
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status change auditing
DROP TRIGGER IF EXISTS tr_audit_sicoob_order_status ON public.sicoob_orders;
CREATE TRIGGER tr_audit_sicoob_order_status
AFTER UPDATE OF status ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.audit_sicoob_order_status_change();

-- Add support for notifications on limit requests
CREATE TABLE IF NOT EXISTS public.limit_increase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id UUID REFERENCES public.postos_atendimento(id),
    requested_by UUID REFERENCES auth.users(id),
    current_limit DECIMAL(12,2),
    requested_limit DECIMAL(12,2),
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    approved_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for limit requests
ALTER TABLE public.limit_increase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own PA limit requests"
ON public.limit_increase_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
            p.role IN ('admin', 'supervisor')
            OR (p.role = 'gestor_pa' AND limit_increase_requests.pa_id = p.pa_id)
            OR (p.role = 'gestor_singular' AND EXISTS (
                SELECT 1 FROM public.postos_atendimento pa 
                WHERE pa.id = limit_increase_requests.pa_id 
                AND pa.cooperativa_id = p.cooperativa_id
            ))
        )
    )
);

CREATE POLICY "PA Managers can insert limit requests"
ON public.limit_increase_requests
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'gestor_pa'
        AND limit_increase_requests.pa_id = p.pa_id
    )
);
