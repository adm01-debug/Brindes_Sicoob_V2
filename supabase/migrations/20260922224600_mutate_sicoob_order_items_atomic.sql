CREATE OR REPLACE FUNCTION public.mutate_sicoob_order_item(
  p_order_id uuid,
  p_action text,
  p_item_id uuid DEFAULT NULL,
  p_product_id uuid DEFAULT NULL,
  p_product_name text DEFAULT NULL,
  p_quantity integer DEFAULT NULL,
  p_unit_price numeric DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_order public.sicoob_orders%ROWTYPE;
  v_total numeric;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Usuário autenticado obrigatório.' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('add', 'remove') THEN
    RAISE EXCEPTION 'Ação de item inválida.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_order FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado.' USING ERRCODE = 'P0002';
  END IF;
  IF v_order.created_by IS DISTINCT FROM v_actor AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = v_actor AND ur.role::text IN ('admin', 'manager', 'supervisor', 'dev')
  ) THEN
    RAISE EXCEPTION 'Usuário sem permissão para alterar itens deste pedido.' USING ERRCODE = '42501';
  END IF;
  IF v_order.status <> 'draft' THEN
    RAISE EXCEPTION 'Itens só podem ser alterados enquanto o pedido está em rascunho.' USING ERRCODE = '23514';
  END IF;

  IF p_action = 'add' THEN
    IF p_product_id IS NULL OR p_product_name IS NULL OR btrim(p_product_name) = ''
       OR length(p_product_name) > 300 OR p_quantity IS NULL OR p_quantity <= 0
       OR p_unit_price IS NULL OR p_unit_price <= 0 THEN
      RAISE EXCEPTION 'Produto, nome, quantidade e preço válidos são obrigatórios.' USING ERRCODE = '23514';
    END IF;
    INSERT INTO public.sicoob_order_items(
      order_id, product_id, product_name, quantity, unit_price, total_price
    ) VALUES (
      p_order_id, p_product_id, btrim(p_product_name), p_quantity, p_unit_price,
      p_quantity * p_unit_price
    );
  ELSE
    IF p_item_id IS NULL THEN
      RAISE EXCEPTION 'Item obrigatório para remoção.' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.sicoob_order_items
    WHERE id = p_item_id AND order_id = p_order_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Item não encontrado neste pedido.' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  SELECT COALESCE(sum(total_price), 0) INTO v_total
  FROM public.sicoob_order_items
  WHERE order_id = p_order_id;

  UPDATE public.sicoob_orders
  SET total_amount = v_total, updated_at = clock_timestamp()
  WHERE id = p_order_id;
  RETURN v_total;
END;
$function$;

REVOKE ALL ON FUNCTION public.mutate_sicoob_order_item(uuid,text,uuid,uuid,text,integer,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mutate_sicoob_order_item(uuid,text,uuid,uuid,text,integer,numeric) TO authenticated;
