CREATE OR REPLACE FUNCTION public.create_sicoob_order_artwork_version(p_actor_id uuid, p_order_id uuid, p_file_path text, p_file_sha256 text, p_identity_snapshot jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_artwork_id uuid;
  v_existing public.sicoob_order_artwork_versions%ROWTYPE;
  v_version integer;
  v_order_status text;
BEGIN
  IF auth.jwt() ->> 'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O registro da arte exige o verificador interno.';
  END IF;
  IF p_actor_id IS NULL OR NOT public.sicoob_actor_can_manage_fulfillment(p_actor_id, p_order_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Você não pode enviar arte para este pedido.';
  END IF;
  IF p_file_path NOT LIKE p_order_id::text || '/artwork/%'
     OR p_file_sha256 !~ '^[0-9a-f]{64}$'
     OR jsonb_typeof(p_identity_snapshot) IS DISTINCT FROM 'object'
     OR p_identity_snapshot ->> 'bucket' IS DISTINCT FROM 'sicoob-order-documents'
     OR p_identity_snapshot ->> 'path' IS DISTINCT FROM p_file_path
     OR p_identity_snapshot ->> 'sha256' IS DISTINCT FROM p_file_sha256
     OR p_identity_snapshot ->> 'verifier' IS DISTINCT FROM 'sicoob-artwork-register'
     OR COALESCE(p_identity_snapshot ->> 'byte_size', '') !~ '^[1-9][0-9]*$'
     OR COALESCE(p_identity_snapshot ->> 'verified_at', '') = '' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Arquivo, hash ou fotografia de identidade inválidos.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id::text || ':artwork', 0));
  SELECT * INTO v_existing
    FROM public.sicoob_order_artwork_versions
   WHERE order_id = p_order_id AND file_path = p_file_path
   FOR UPDATE;
  IF FOUND THEN
    IF v_existing.file_sha256 IS DISTINCT FROM p_file_sha256
       OR v_existing.created_by IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'O caminho da arte já foi registrado com outra identidade.';
    END IF;
    RETURN v_existing.id;
  END IF;

  SELECT status INTO v_order_status FROM public.sicoob_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Pedido não encontrado.'; END IF;
  IF v_order_status NOT IN ('draft', 'pending', 'waiting_approval', 'escalated_to_board', 'confirmed') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'A arte não pode ser substituída após o início da produção ou logística.';
  END IF;
  SELECT COALESCE(max(version), 0) + 1 INTO v_version
    FROM public.sicoob_order_artwork_versions WHERE order_id = p_order_id;
  PERFORM set_config('app.sicoob_artwork_operation', 'version', true);
  UPDATE public.sicoob_order_artwork_versions SET is_latest = false
   WHERE order_id = p_order_id AND is_latest;

  INSERT INTO public.sicoob_order_artwork_versions (
    order_id, version, file_path, file_sha256, identity_snapshot, created_by
  ) VALUES (
    p_order_id, v_version, p_file_path, p_file_sha256, p_identity_snapshot, p_actor_id
  ) RETURNING id INTO v_artwork_id;
  RETURN v_artwork_id;
END;
$function$
