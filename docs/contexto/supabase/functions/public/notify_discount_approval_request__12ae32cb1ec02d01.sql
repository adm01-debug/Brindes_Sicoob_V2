CREATE OR REPLACE FUNCTION public.notify_discount_approval_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  seller_name TEXT;
  quote_num TEXT;
  admin_user RECORD;
BEGIN
  -- Only on new pending requests
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT full_name INTO seller_name FROM public.profiles WHERE user_id = NEW.seller_id;
    SELECT quote_number INTO quote_num FROM public.quotes WHERE id = NEW.quote_id;

    -- Notify all admins
    FOR admin_user IN SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin' LOOP
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
      VALUES (
        admin_user.user_id,
        '⚠️ Desconto acima do limite',
        COALESCE(seller_name, 'Vendedor') || ' solicitou ' || NEW.requested_discount_percent || '% de desconto no orçamento ' || COALESCE(quote_num, '') || ' (limite: ' || NEW.max_allowed_percent || '%).',
        'warning',
        'quotes',
        '/admin/aprovacoes-desconto'
      );
    END LOOP;
  END IF;

  -- Notify seller on approval/rejection
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    SELECT quote_number INTO quote_num FROM public.quotes WHERE id = NEW.quote_id;
    
    IF NEW.status = 'approved' THEN
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
      VALUES (
        NEW.seller_id,
        '✅ Desconto aprovado!',
        'Seu desconto de ' || NEW.requested_discount_percent || '% no orçamento ' || COALESCE(quote_num, '') || ' foi aprovado.',
        'success',
        'quotes',
        '/orcamentos'
      );
    ELSE
      INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
      VALUES (
        NEW.seller_id,
        '❌ Desconto recusado',
        'Seu desconto de ' || NEW.requested_discount_percent || '% no orçamento ' || COALESCE(quote_num, '') || ' foi recusado.' || COALESCE(' Motivo: ' || NEW.admin_notes, ''),
        'warning',
        'quotes',
        '/orcamentos'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
