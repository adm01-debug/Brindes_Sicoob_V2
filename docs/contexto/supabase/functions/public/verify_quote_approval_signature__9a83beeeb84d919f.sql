CREATE OR REPLACE FUNCTION public.verify_quote_approval_signature(p_token_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'vault', 'extensions'
AS $function$
  SELECT COALESCE(
    t.signature_hash = encode(extensions.hmac(
      convert_to(t.signature_evidence::text,'UTF8'),
      convert_to(v.decrypted_secret,'UTF8'),'sha256'
    ),'hex')
    AND t.signature_evidence->>'quote_snapshot_sha256' = encode(extensions.digest(
      convert_to(public.quote_approval_content_snapshot(t.quote_id::uuid)::text,'UTF8'),'sha256'
    ),'hex'), false)
  FROM public.quote_approval_tokens t
  JOIN public.quote_approval_evidence_keys k ON k.id=t.signature_key_id
  JOIN vault.decrypted_secrets v ON v.name=k.vault_secret_name
  WHERE t.id=p_token_id AND t.signature_algorithm='hmac-sha256-v1'
  ORDER BY v.updated_at DESC LIMIT 1;
$function$
