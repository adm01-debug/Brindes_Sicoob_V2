-- 1. Detailed Audit Table for Orders (if not properly structured)
CREATE TABLE IF NOT EXISTS public.order_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL, -- 'created', 'sent_to_manager', 'approved_by_manager', 'converted_to_order', 'rejected'
    previous_status TEXT,
    new_status TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add suggested modifications to quotes for the rejection/adjustment loop
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS suggested_modifications JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approved_pdf_url TEXT DEFAULT NULL;

-- 3. Enable RLS on audit table
ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit events for orders they can see" 
ON public.order_audit_events FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_audit_events.order_id
    )
);

-- 4. Function to automatically log status changes for quotes
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.quote_history (quote_id, user_id, action, description, old_value, new_value, metadata)
        VALUES (
            NEW.id, 
            auth.uid(), 
            'status_change', 
            'Status alterado de ' || OLD.status || ' para ' || NEW.status,
            OLD.status,
            NEW.status,
            jsonb_build_object('changed_at', now(), 'rejection_notes', NEW.rejection_notes)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_log_quote_status_change ON public.quotes;
CREATE TRIGGER tr_log_quote_status_change
AFTER UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.log_quote_status_change();
