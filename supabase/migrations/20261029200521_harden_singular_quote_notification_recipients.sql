-- Impede notificações a perfis inativos, excluídos ou com papel legado
-- divergente. user_roles é a fonte autorizativa dos papéis Sicoob.
CREATE OR REPLACE FUNCTION public.notify_singular_quote_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF OLD.status::text IS NOT DISTINCT FROM NEW.status::text
     OR NEW.status::text <> 'pending_singular_approval' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_notifications (
    user_id, title, message, type, category, action_url, metadata
  )
  SELECT DISTINCT
    p.user_id,
    'Nova solicitação de PAC',
    format('O PAC enviou o orçamento %s para aprovação.', NEW.quote_number),
    'info',
    'approval',
    '/orcamentos/' || NEW.id::text,
    jsonb_build_object('quote_id', NEW.id, 'status', NEW.status::text)
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.cooperativa_id = NEW.singular_id
    AND ur.role::text IN ('gestor_compras', 'comprador_singular')
    AND p.user_id IS NOT NULL
    AND p.is_active IS TRUE
    AND p.deleted_at IS NULL;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.notify_singular_quote_submission() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.notify_singular_quote_submission() IS
  'Notifica atomicamente apenas compradores ativos e não excluídos, conforme user_roles e cooperativa do orçamento.';
