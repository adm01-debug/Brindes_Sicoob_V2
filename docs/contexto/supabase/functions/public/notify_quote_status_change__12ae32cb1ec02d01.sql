CREATE OR REPLACE FUNCTION public.notify_quote_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
  notif_category TEXT;
  notif_url TEXT;
BEGIN
  -- Only trigger on status changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  notif_category := 'quotes';
  notif_url := '/orcamentos';

  CASE NEW.status
    WHEN 'approved' THEN
      notif_title := '✅ Orçamento aprovado!';
      notif_message := 'O orçamento ' || NEW.quote_number || COALESCE(' de ' || NEW.client_name, '') || ' foi aprovado!';
      notif_type := 'success';
    WHEN 'rejected' THEN
      notif_title := '❌ Orçamento recusado';
      notif_message := 'O orçamento ' || NEW.quote_number || COALESCE(' de ' || NEW.client_name, '') || ' foi recusado.';
      notif_type := 'warning';
    WHEN 'sent' THEN
      notif_title := '📤 Orçamento enviado';
      notif_message := 'O orçamento ' || NEW.quote_number || ' foi marcado como enviado.';
      notif_type := 'info';
    WHEN 'expired' THEN
      notif_title := '⏰ Orçamento expirado';
      notif_message := 'O orçamento ' || NEW.quote_number || COALESCE(' de ' || NEW.client_name, '') || ' expirou.';
      notif_type := 'warning';
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
  VALUES (NEW.seller_id, notif_title, notif_message, notif_type, notif_category, notif_url);

  RETURN NEW;
END;
$function$
