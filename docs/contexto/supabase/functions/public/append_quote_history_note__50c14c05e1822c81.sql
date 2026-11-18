CREATE OR REPLACE FUNCTION public.append_quote_history_note(p_quote_id uuid, p_action text, p_description text, p_field_changed text DEFAULT NULL::text, p_old_value text DEFAULT NULL::text, p_new_value text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_history_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF p_action NOT IN (
    'created', 'updated', 'item_added', 'item_removed', 'item_updated',
    'pdf_generated', 'pdf_exported_bulk', 'sync_started', 'sync_error',
    'sync_success', 'note'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Tipo de anotação não permitido.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = p_quote_id
      AND (q.seller_id = v_actor_id OR public.can_manage_quote_scope(v_actor_id, q.id))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem acesso ao orçamento.';
  END IF;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    p_quote_id, v_actor_id, p_action, left(p_description, 2000),
    p_field_changed, p_old_value, p_new_value, COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_history_id;
  RETURN v_history_id;
END;
$function$
