-- Function to notify managers
CREATE OR REPLACE FUNCTION public.notify_approval_request()
RETURNS TRIGGER AS $$
DECLARE
    requester_name TEXT;
    pa_name TEXT;
BEGIN
    -- Get requester info
    SELECT full_name, p.pa_id INTO requester_name FROM public.profiles p WHERE id = NEW.requester_id;
    
    -- Insert in-app notifications for all managers of the same PA
    INSERT INTO public.workspace_notifications (
        user_id,
        title,
        message,
        type,
        link,
        metadata
    )
    SELECT 
        p.id,
        'Solicitação de Alçada: ' || requester_name,
        'O pedido ' || SUBSTRING(NEW.order_id::text, 1, 8) || ' excedeu o limite e aguarda sua aprovação.',
        'info',
        '/admin/sicoob?tab=budgets',
        jsonb_build_object(
            'order_id', NEW.order_id, 
            'request_id', NEW.id,
            'amount', NEW.amount_at_request
        )
    FROM public.profiles p
    WHERE p.pa_id = (SELECT pa_id FROM public.profiles WHERE id = NEW.requester_id)
    AND p.role IN ('gestor_pa', 'gestor_singular');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger
DROP TRIGGER IF EXISTS on_approval_request_created ON public.sicoob_approval_requests;
CREATE TRIGGER on_approval_request_created
AFTER INSERT ON public.sicoob_approval_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_approval_request();
