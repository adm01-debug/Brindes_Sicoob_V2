CREATE OR REPLACE FUNCTION public.notify_quote_client_response()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
BEGIN
  -- Only trigger when responded_at changes from null
  IF OLD.responded_at IS NOT NULL OR NEW.responded_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.response = 'approved' THEN
    notif_title := '🎉 Cliente aprovou o orçamento!';
    notif_message := COALESCE(NEW.client_name, 'O cliente') || ' aprovou o orçamento via link de aprovação.';
    notif_type := 'success';
  ELSIF NEW.response = 'rejected' THEN
    notif_title := '😔 Cliente recusou o orçamento';
    notif_message := COALESCE(NEW.client_name, 'O cliente') || ' recusou o orçamento via link de aprovação.';
    notif_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
  VALUES (NEW.seller_id, notif_title, notif_message, notif_type, 'quotes', '/orcamentos');

  RETURN NEW;
END;
$function$
