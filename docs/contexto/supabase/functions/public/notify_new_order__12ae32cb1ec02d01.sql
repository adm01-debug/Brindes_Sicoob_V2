CREATE OR REPLACE FUNCTION public.notify_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
  VALUES (
    NEW.seller_id,
    '🎉 Novo pedido recebido!',
    'Pedido ' || NEW.order_number || COALESCE(' de ' || NEW.client_name, '') || ' foi criado.',
    'success',
    'orders',
    '/pedidos'
  );

  RETURN NEW;
END;
$function$
