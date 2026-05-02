-- Criar tabela de solicitações de aprovação
CREATE TABLE public.sicoob_approval_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.sicoob_orders(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES auth.users(id),
    approver_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    request_reason TEXT,
    rejection_reason TEXT,
    amount_at_request NUMERIC(15,2) NOT NULL,
    threshold_at_request NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar colunas de controle no pedido
ALTER TABLE public.sicoob_orders 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- Habilitar RLS
ALTER TABLE public.sicoob_approval_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para sicoob_approval_requests
CREATE POLICY "Users can view their own approval requests" 
ON public.sicoob_approval_requests 
FOR SELECT 
USING (auth.uid() = requester_id);

CREATE POLICY "Managers and supervisors can view all requests in their scope" 
ON public.sicoob_approval_requests 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND (role IN ('supervisor', 'dev', 'gestor_compras') 
             OR (role = 'gerente_pa' AND pa_id = (SELECT pa_id FROM sicoob_orders WHERE id = order_id)))
    )
);

CREATE POLICY "Users can create approval requests" 
ON public.sicoob_approval_requests 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Approvers can update status" 
ON public.sicoob_approval_requests 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role IN ('supervisor', 'dev', 'gestor_compras', 'gerente_pa')
    )
);

-- Trigger para atualizar timestamps
CREATE TRIGGER update_sicoob_approval_requests_updated_at
BEFORE UPDATE ON public.sicoob_approval_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
