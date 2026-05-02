-- Expand fulfillment_status options
-- Note: Check constraints might need to be dropped and recreated if they exist
DO $$ 
BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_fulfillment_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_status_check 
    CHECK (fulfillment_status IN ('pending', 'in_production', 'in_separation', 'in_transit', 'delivered', 'completed', 'cancelled'));
END $$;

-- Logistics tracking table
CREATE TABLE IF NOT EXISTS public.order_logistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    tracking_code TEXT,
    carrier_name TEXT,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    actual_delivery TIMESTAMP WITH TIME ZONE,
    delivery_photo_url TEXT,
    delivery_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.order_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    xml_url TEXT,
    pdf_url TEXT,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    amount DECIMAL(12,2) NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pilot/Mockup Approvals
CREATE TABLE IF NOT EXISTS public.order_pilot_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision')),
    feedback TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order Audit Timeline
CREATE TABLE IF NOT EXISTS public.order_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    actor_id UUID REFERENCES auth.users(id),
    actor_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_logistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_pilot_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Simplified for Sicoob scope)
CREATE POLICY "View order logistics" ON public.order_logistics FOR SELECT USING (true);
CREATE POLICY "Manage order logistics" ON public.order_logistics FOR ALL USING (true);

CREATE POLICY "View order invoices" ON public.order_invoices FOR SELECT USING (true);
CREATE POLICY "Manage order invoices" ON public.order_invoices FOR ALL USING (true);

CREATE POLICY "View order payments" ON public.order_payments FOR SELECT USING (true);
CREATE POLICY "Manage order payments" ON public.order_payments FOR ALL USING (true);

CREATE POLICY "View order pilot approvals" ON public.order_pilot_approvals FOR SELECT USING (true);
CREATE POLICY "Manage order pilot approvals" ON public.order_pilot_approvals FOR ALL USING (true);

CREATE POLICY "View order audit events" ON public.order_audit_events FOR SELECT USING (true);

-- Storage bucket for order documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-documents', 'order-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can upload order documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-documents');
CREATE POLICY "Anyone can view order documents" ON storage.objects FOR SELECT USING (bucket_id = 'order-documents');

-- Trigger to record status changes in audit log
CREATE OR REPLACE FUNCTION public.fn_audit_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.fulfillment_status IS DISTINCT FROM NEW.fulfillment_status) THEN
        INSERT INTO public.order_audit_events (order_id, event_type, old_value, new_value, actor_id)
        VALUES (
            NEW.id, 
            'status_change', 
            jsonb_build_object('fulfillment_status', OLD.fulfillment_status),
            jsonb_build_object('fulfillment_status', NEW.fulfillment_status),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_audit_order_status
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_order_status_change();
