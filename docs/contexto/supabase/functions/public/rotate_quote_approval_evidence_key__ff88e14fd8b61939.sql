CREATE OR REPLACE FUNCTION public.rotate_quote_approval_evidence_key(p_vault_secret_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'vault'
AS $function$
DECLARE v_id uuid; v_secret text;
BEGIN
  IF p_vault_secret_name !~ '^quote_approval_evidence_hmac_v[0-9]+$' THEN
    RAISE EXCEPTION 'Nome de versão de chave inválido.' USING ERRCODE='22023';
  END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets
    WHERE name=p_vault_secret_name ORDER BY updated_at DESC LIMIT 1;
  IF v_secret IS NULL OR length(v_secret)<32 THEN
    RAISE EXCEPTION 'A nova chave não existe no Vault ou é curta.' USING ERRCODE='55000';
  END IF;
  LOCK TABLE public.quote_approval_evidence_keys IN EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.quote_approval_evidence_keys WHERE vault_secret_name=p_vault_secret_name) THEN
    RAISE EXCEPTION 'Esta versão de chave já foi registrada.' USING ERRCODE='23505';
  END IF;
  UPDATE public.quote_approval_evidence_keys
    SET is_active=false,retired_at=clock_timestamp() WHERE is_active;
  INSERT INTO public.quote_approval_evidence_keys(vault_secret_name,is_active)
    VALUES(p_vault_secret_name,true) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$
