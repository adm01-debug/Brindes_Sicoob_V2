CREATE OR REPLACE FUNCTION public.validate_status_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'quotes' AND NEW.status NOT IN (
    'draft', 'pending', 'sent', 'approved', 'rejected', 'expired',
    'revision', 'pending_approval', 'pending_singular_approval',
    'approved_singular', 'rejected_singular', 'converted', 'viewed'
  ) THEN
    RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN (
      'rascunho', 'enviado_gestor', 'aprovado_gestor', 'enviado_vendedor',
      'em_producao', 'em_separacao', 'em_transporte', 'entregue',
      'concluido', 'cancelado'
    ) THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled', 'partially_fulfilled', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'custom_kits'
     AND NEW.status NOT IN ('draft', 'ready', 'shared', 'archived') THEN
    RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
  END IF;

  IF TG_TABLE_NAME = 'kit_share_tokens'
     AND NEW.status NOT IN ('active', 'expired', 'responded', 'revoked') THEN
    RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
  END IF;

  IF TG_TABLE_NAME = 'quote_approval_tokens'
     AND NEW.status NOT IN ('active', 'expired', 'responded') THEN
    RAISE EXCEPTION 'Invalid approval token status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$function$
