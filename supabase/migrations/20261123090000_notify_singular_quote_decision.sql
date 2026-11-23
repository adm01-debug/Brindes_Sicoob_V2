-- SIC-110: Decisão da Singular (aprovado_singular / rejeitado_singular) não
-- notificava o PA/vendedor solicitante. Adiciona trigger que envia
-- workspace_notification ao seller quando a Singular decide o orçamento.
-- Filtra apenas usuários ativos e não-excluídos (mesmo padrão da migration
-- 20261029200521 que notifica a Singular na submissão).

CREATE OR REPLACE FUNCTION public.notify_singular_quote_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
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
    CASE NEW.status::text
      WHEN 'approved_singular' THEN 'Orçamento aprovado pela Singular'
      ELSE 'Orçamento recusado pela Singular'
    END,
    format(
      CASE NEW.status::text
        WHEN 'approved_singular' THEN 'O orçamento %s foi aprovado pela Singular.'
        ELSE 'O orçamento %s foi recusado pela Singular.'
      END,
      NEW.quote_number
    ),
    CASE NEW.status::text WHEN 'approved_singular' THEN 'success' ELSE 'warning' END,
    'quote',
    '/orcamentos/' || NEW.id::text,
    jsonb_build_object(
      'quote_id', NEW.id,
      'status', NEW.status::text,
      'rejection_notes', COALESCE(NEW.rejection_notes, '')
    )
  FROM public.profiles p
  WHERE p.user_id = NEW.seller_id
    AND p.user_id IS NOT NULL
    AND p.is_active IS TRUE
    AND p.deleted_at IS NULL;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_singular_quote_decision ON public.quotes;
CREATE TRIGGER trg_notify_singular_quote_decision
AFTER UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.notify_singular_quote_decision();

REVOKE ALL ON FUNCTION public.notify_singular_quote_decision() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.notify_singular_quote_decision() IS
  'Notifica o vendedor/PA quando a Singular aprova ou rejeita o orçamento; filtra apenas usuários ativos e não-excluídos.';
