-- A evidência assinada mantém o snapshot comercial completo. A resposta do
-- token usa uma projeção separada e mínima para a interface pública.
CREATE OR REPLACE FUNCTION public.quote_approval_public_items(p_quote_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_name', qi.product_name,
    'product_sku', qi.product_sku,
    'color_name', qi.color_name,
    'size_code', to_jsonb(qi)->'size_code',
    'quantity', qi.quantity,
    'unit_price', qi.unit_price,
    'subtotal', qi.subtotal,
    'personalizations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'colors_count', qip.colors_count,
        'positions_count', qip.positions_count,
        'notes', qip.notes
      ) ORDER BY qip.id)
      FROM public.quote_item_personalizations qip
      WHERE qip.quote_item_id = qi.id
    ), '[]'::jsonb)
  ) ORDER BY COALESCE((to_jsonb(qi)->>'display_order')::integer, qi.sort_order, 0), qi.id), '[]'::jsonb)
  FROM public.quote_items qi
  WHERE qi.quote_id = p_quote_id;
$$;
REVOKE ALL ON FUNCTION public.quote_approval_public_items(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_approval_public_items(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_quote_approval(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_token_id uuid;
  v_payload jsonb;
BEGIN
  SELECT t.id, jsonb_build_object(
    'quote_number', q.quote_number,
    'client_name', q.client_name,
    'total', q.total,
    'valid_until', q.valid_until,
    'status', t.status,
    'response', t.response,
    'responded_at', t.responded_at,
    'payment_terms', to_jsonb(q)->'payment_terms',
    'delivery_time', to_jsonb(q)->'delivery_time',
    'shipping_cost', to_jsonb(q)->'shipping_cost',
    'notes', to_jsonb(q)->'notes',
    'items', public.quote_approval_public_items(q.id)
  ) INTO v_token_id, v_payload
  FROM public.quote_approval_tokens t
  JOIN public.quotes q ON q.id::text = t.quote_id AND q.seller_id = t.seller_id
  WHERE t.token = _token AND t.status IN ('active', 'responded')
    AND (t.expires_at IS NULL OR t.expires_at > statement_timestamp())
    AND q.deleted_at IS NULL AND q.is_latest_version
    AND (q.valid_until IS NULL OR q.valid_until::date >= CURRENT_DATE)
  ORDER BY t.created_at DESC, t.id
  LIMIT 1
  FOR UPDATE OF t;

  IF v_token_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.quote_approval_tokens
  SET viewed_at = COALESCE(viewed_at, clock_timestamp())
  WHERE id = v_token_id;

  RETURN v_payload;
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_quote_approval(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_quote_approval(text) TO service_role;
