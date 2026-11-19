CREATE OR REPLACE FUNCTION private.quote_price_payload_hash(p_quote jsonb, p_items jsonb, p_history jsonb)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
  SELECT encode(
    extensions.digest(
      (COALESCE(p_quote, '{}'::jsonb) - 'price_attestation_id')::text
      || E'\x1f' || COALESCE(p_items, '[]'::jsonb)::text
      || E'\x1f' || COALESCE(p_history, '[]'::jsonb)::text,
      'sha256'
    ),
    'hex'
  );
$function$
