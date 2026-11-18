CREATE OR REPLACE FUNCTION public.freeze_sicoob_order_while_approval_pending()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_order_id uuid := CASE
    WHEN TG_TABLE_NAME = 'sicoob_orders' THEN (to_jsonb(OLD) ->> 'id')::uuid
    ELSE NULLIF(to_jsonb(OLD) ->> 'order_id', '')::uuid
  END;
  v_new_order_id uuid := CASE
    WHEN TG_TABLE_NAME = 'sicoob_orders' THEN (to_jsonb(NEW) ->> 'id')::uuid
    ELSE NULLIF(to_jsonb(NEW) ->> 'order_id', '')::uuid
  END;
BEGIN
  IF TG_TABLE_NAME = 'sicoob_order_items' THEN
    PERFORM 1
      FROM public.sicoob_orders o
     WHERE o.id IN (v_old_order_id, v_new_order_id)
     FOR UPDATE;
  END IF;
  IF EXISTS (
    SELECT 1
      FROM public.sicoob_orders o
     WHERE o.id IN (v_old_order_id, v_new_order_id)
       AND o.status IN (
         'waiting_approval', 'escalated_to_board', 'confirmed', 'logistic',
         'in_production', 'in_separation', 'in_transit', 'delivered',
         'completed', 'cancelled'
       )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Pedido submetido não permite alterar valor ou itens.';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
