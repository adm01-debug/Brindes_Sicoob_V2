CREATE OR REPLACE FUNCTION public.decide_sicoob_order_artwork(p_artwork_id uuid, p_status text, p_feedback text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_artwork public.sicoob_order_artwork_versions%ROWTYPE;
BEGIN
  IF p_status NOT IN ('approved', 'rejected', 'revision') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Decisão de arte inválida.';
  END IF;
  IF p_status <> 'approved' AND length(trim(COALESCE(p_feedback, ''))) < 10 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Informe um feedback com ao menos 10 caracteres.';
  END IF;

  SELECT * INTO v_artwork FROM public.sicoob_order_artwork_versions
   WHERE id = p_artwork_id FOR UPDATE;
  IF NOT FOUND OR NOT v_artwork.is_latest OR v_artwork.status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A versão de arte mudou; atualize a página.';
  END IF;
  PERFORM public.assert_sicoob_approval_actor(v_actor_id, v_artwork.order_id, v_artwork.created_by, false);

  PERFORM set_config('app.sicoob_artwork_operation', 'decide', true);
  UPDATE public.sicoob_order_artwork_versions
     SET status = p_status,
         feedback = NULLIF(trim(p_feedback), ''),
         decided_by = v_actor_id,
         decided_at = now()
   WHERE id = v_artwork.id;
END;
$function$
