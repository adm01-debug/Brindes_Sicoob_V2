-- Histórico de decisões de alçada
CREATE TABLE IF NOT EXISTS public.order_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES auth.users(id),
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'pending')),
    subtotal_at_time DECIMAL(12,2),
    threshold_at_time DECIMAL(12,2),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.order_approval_history ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Gestores can view all approval history" ON public.order_approval_history FOR SELECT USING (true);
CREATE POLICY "Approvers can insert history" ON public.order_approval_history FOR INSERT WITH CHECK (auth.uid() = approver_id);

-- Índice para performance
CREATE INDEX idx_approval_history_order ON public.order_approval_history(order_id);