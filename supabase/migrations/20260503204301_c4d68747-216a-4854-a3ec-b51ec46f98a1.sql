-- Add SLA and escalation fields to orders
ALTER TABLE public.sicoob_orders 
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'normal' CHECK (sla_status IN ('normal', 'warning', 'critical'));

-- Create RLS Audit Log table
CREATE TABLE IF NOT EXISTS public.sicoob_rls_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    operation TEXT NOT NULL,
    table_name TEXT NOT NULL,
    policy_name TEXT,
    is_allowed BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sicoob_rls_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all RLS logs" 
ON public.sicoob_rls_audit_logs 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'diretoria')
));

-- Function to update SLA status based on deadline
CREATE OR REPLACE FUNCTION public.check_order_sla()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sla_deadline IS NOT NULL THEN
        IF NEW.sla_deadline < now() THEN
            NEW.sla_status := 'critical';
        ELSIF NEW.sla_deadline < now() + interval '2 hours' THEN
            NEW.sla_status := 'warning';
        ELSE
            NEW.sla_status := 'normal';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_order_sla
BEFORE INSERT OR UPDATE ON public.sicoob_orders
FOR EACH ROW EXECUTE FUNCTION public.check_order_sla();
