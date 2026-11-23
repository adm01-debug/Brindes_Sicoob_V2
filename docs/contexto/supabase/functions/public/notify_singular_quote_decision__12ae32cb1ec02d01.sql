CREATE OR REPLACE FUNCTION public.notify_singular_quote_decision()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_adjust_marker CONSTANT text := 'Modificações sugeridas:';
  v_aprovado boolean := NEW.status::text = 'approved_singular';
  v_ajuste boolean := NOT v_aprovado
    AND position(v_adjust_marker IN COALESCE(NEW.rejection_notes, '')) > 0;
BEGIN
  IF OLD.status::text IS NOT DISTINCT FROM NEW.status::text
     OR NEW.status::text NOT IN ('approved_singular', 'rejected_singular') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_notifications (
    user_id, title, message, type, category, action_url, metadata
  )
  SELECT DISTINCT
    p.user_id,
    CASE
      WHEN v_aprovado THEN 'Orçamento aprovado pela Singular'
      WHEN v_ajuste THEN 'Orçamento devolvido para ajustes pela Singular'
      ELSE 'Orçamento recusado pela Singular'
    END,
    format(
      CASE
        WHEN v_aprovado THEN 'O orçamento %s foi aprovado pela Singular.'
        WHEN v_ajuste THEN 'O orçamento %s foi devolvido para ajustes pela Singular. Veja as observações e reenvie.'
        ELSE 'O orçamento %s foi recusado pela Singular.'
      END,
      NEW.quote_number
    ),
    CASE WHEN v_aprovado THEN 'success' ELSE 'warning' END,
    'quote',
    '/orcamentos/' || NEW.id::text,
    jsonb_build_object(
      'quote_id', NEW.id,
      'status', NEW.status::text,
      'decisao', CASE WHEN v_aprovado THEN 'aprovado' WHEN v_ajuste THEN 'ajuste' ELSE 'recusado' END,
      'rejection_notes', COALESCE(NEW.rejection_notes, '')
    )
  FROM public.profiles p
  WHERE p.user_id = NEW.seller_id
    AND p.user_id IS NOT NULL
    AND p.is_active IS TRUE
    AND p.deleted_at IS NULL;

  RETURN NEW;
END;
$function$
