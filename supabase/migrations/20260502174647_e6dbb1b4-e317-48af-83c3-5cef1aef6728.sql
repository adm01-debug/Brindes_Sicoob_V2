-- 1. Colunas de logística na tabela de pedidos
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipping_carrier TEXT,
ADD COLUMN IF NOT EXISTS shipping_delivery_forecast TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;

-- 2. Tabela de aprovação de piloto (mockup)
CREATE TABLE IF NOT EXISTS public.order_pilot_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, revision
  photo_url TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de auditoria do pedido
CREATE TABLE IF NOT EXISTS public.order_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- status_change, logistic_update, pilot_change, invoice_added, etc
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 4. Preferências de notificação
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,
  events_config JSONB DEFAULT '{"order_status_change": true, "pilot_update": true, "new_order": true}'::jsonb
);

-- 5. Trigger para auditar mudança de status automaticamente
CREATE OR REPLACE FUNCTION public.fn_audit_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_audit_events (order_id, event_type, description, metadata, created_by)
    VALUES (
      NEW.id, 
      'status_change', 
      'Status alterado de ' || OLD.status || ' para ' || NEW.status,
      jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_order_status_change ON public.orders;
CREATE TRIGGER tr_audit_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_order_status_change();

-- 6. RLS
ALTER TABLE public.order_pilot_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas simplificadas (seguindo o padrão do projeto para pedidos)
CREATE POLICY "Users can view pilot approvals of their orders" 
ON public.order_pilot_approvals FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));

CREATE POLICY "Users can view audit events of their orders" 
ON public.order_audit_events FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));

CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences FOR ALL 
USING (auth.uid() = user_id);
