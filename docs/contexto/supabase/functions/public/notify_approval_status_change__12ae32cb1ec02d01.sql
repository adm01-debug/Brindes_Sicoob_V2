CREATE OR REPLACE FUNCTION public.notify_approval_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
