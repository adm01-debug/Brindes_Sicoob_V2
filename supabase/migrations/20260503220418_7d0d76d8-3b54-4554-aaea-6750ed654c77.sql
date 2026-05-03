-- Trigger para notificações de alçada
CREATE OR REPLACE FUNCTION public.notify_approval_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
    INSERT INTO public.workspace_notifications (
      user_id,
      title,
      content,
      type,
      metadata
    ) VALUES (
      NEW.requester_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Pedido Aprovado'
        WHEN NEW.status = 'rejected' THEN 'Pedido Rejeitado'
        ELSE 'Atualização de Alçada'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Seu pedido foi aprovado pelo gestor e seguirá para produção.'
        WHEN NEW.status = 'rejected' THEN 'Seu pedido foi rejeitado. Motivo: ' || COALESCE(NEW.rejection_reason, 'Não informado')
        ELSE 'O status da sua solicitação de alçada foi alterado.'
      END,
      'order',
      jsonb_build_object('order_id', NEW.order_id, 'request_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_approval_status_change
  AFTER UPDATE ON public.sicoob_approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_approval_status_change();

-- Auditoria de Ações do Gestor
CREATE TABLE IF NOT EXISTS public.sicoob_manager_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES auth.users(id),
    order_id UUID NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.sicoob_manager_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view their own audit logs"
ON public.sicoob_manager_audit
FOR SELECT
USING (auth.uid() = manager_id);

CREATE POLICY "Admins can view all sicoob audit logs"
ON public.sicoob_manager_audit
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Função RPC para Aprovação Atômica
CREATE OR REPLACE FUNCTION public.approve_sicoob_order(
  p_request_id UUID,
  p_order_id UUID,
  p_manager_id UUID
)
RETURNS void AS $$
BEGIN
  -- 1. Atualiza a solicitação
  UPDATE public.sicoob_approval_requests
  SET 
    status = 'approved',
    approver_id = p_manager_id,
    updated_at = now()
  WHERE id = p_request_id;

  -- 2. Atualiza o pedido
  UPDATE public.sicoob_orders
  SET 
    status = 'approved',
    approved_by = p_manager_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_order_id;

  -- 3. Log de Auditoria
  INSERT INTO public.sicoob_manager_audit (
    manager_id,
    order_id,
    action,
    details
  ) VALUES (
    p_manager_id,
    p_order_id,
    'approve',
    jsonb_build_object('request_id', p_request_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função RPC para Rejeição Atômica
CREATE OR REPLACE FUNCTION public.reject_sicoob_order(
  p_request_id UUID,
  p_order_id UUID,
  p_manager_id UUID,
  p_reason TEXT
)
RETURNS void AS $$
BEGIN
  -- 1. Atualiza a solicitação
  UPDATE public.sicoob_approval_requests
  SET 
    status = 'rejected',
    approver_id = p_manager_id,
    rejection_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id;

  -- 2. Atualiza o pedido
  UPDATE public.sicoob_orders
  SET 
    status = 'rejected',
    updated_at = now()
  WHERE id = p_order_id;

  -- 3. Log de Auditoria
  INSERT INTO public.sicoob_manager_audit (
    manager_id,
    order_id,
    action,
    details
  ) VALUES (
    p_manager_id,
    p_order_id,
    'reject',
    jsonb_build_object('request_id', p_request_id, 'reason', p_reason)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
