-- Tabela de Pedidos Sicoob
CREATE TABLE public.sicoob_orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cooperative_id UUID REFERENCES public.cooperativas(id) ON DELETE CASCADE,
    pa_id UUID REFERENCES public.postos_atendimento(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sent_to_manager, manager_approved, manager_rejected, sent_to_logistic, etc.
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    delivery_address TEXT,
    tracking_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Itens do Pedido Sicoob
CREATE TABLE public.sicoob_order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
    product_id UUID, -- Referência futura
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Histórico e Auditoria Sicoob
CREATE TABLE public.sicoob_order_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    previous_status TEXT,
    new_status TEXT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.sicoob_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_order_history ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Baseadas no setup da Onda 1)
-- Administradores veem tudo
CREATE POLICY "Admins have full access to sicoob_orders" ON public.sicoob_orders
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Vendedores veem/criam pedidos do seu PA
CREATE POLICY "Vendedores can manage their PA orders" ON public.sicoob_orders
    FOR ALL USING (pa_id = (SELECT pa_id FROM public.profiles WHERE id = auth.uid()));

-- Gerentes de PA veem pedidos da sua PA
CREATE POLICY "Gerentes can view their PA orders" ON public.sicoob_orders
    FOR SELECT USING (pa_id = (SELECT pa_id FROM public.profiles WHERE id = auth.uid()));

-- Gestores de Cooperativa veem pedidos da Singular
CREATE POLICY "Gestores can view their cooperative orders" ON public.sicoob_orders
    FOR SELECT USING (cooperative_id = (SELECT cooperativa_id FROM public.profiles WHERE id = auth.uid()));

-- Gatilho de timestamps
CREATE TRIGGER update_sicoob_orders_updated_at
BEFORE UPDATE ON public.sicoob_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
