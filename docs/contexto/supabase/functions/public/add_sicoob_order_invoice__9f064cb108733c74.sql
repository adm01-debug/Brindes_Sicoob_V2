CREATE OR REPLACE FUNCTION public.add_sicoob_order_invoice(p_order_id uuid, p_invoice_number text, p_file_type text, p_file_path text, p_amount numeric DEFAULT NULL::numeric, p_access_key text DEFAULT NULL::text, p_issued_at date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_invoice_id uuid;
BEGIN
  IF v_actor_id IS NULL OR NOT public.sicoob_actor_can_manage_fulfillment(v_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode anexar documentos a este pedido.';
  END IF;
  IF p_file_type NOT IN ('pdf', 'xml')
     OR p_file_path NOT LIKE p_order_id::text || '/invoices/%'
     OR NULLIF(trim(p_invoice_number), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Dados da nota fiscal inválidos.';
  END IF;

  INSERT INTO public.sicoob_order_invoices (
    order_id, invoice_number, file_type, file_path, amount, access_key, issued_at, created_by
  ) VALUES (
    p_order_id, trim(p_invoice_number), p_file_type, p_file_path,
    p_amount, NULLIF(trim(p_access_key), ''), p_issued_at, v_actor_id
  ) RETURNING id INTO v_invoice_id;
  RETURN v_invoice_id;
END;
$function$
