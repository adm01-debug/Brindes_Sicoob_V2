CREATE OR REPLACE FUNCTION public.record_quote_bitrix_sync(p_quote_id uuid, p_bitrix_quote_id text DEFAULT NULL::text, p_bitrix_deal_id text DEFAULT NULL::text)
 RETURNS TABLE(quote_id uuid, bitrix_quote_id text, bitrix_deal_id text, synced_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_previous_governance text := current_setting('app.quote_governance_write', true);
  v_previous_sync text := current_setting('app.quote_sync_metadata', true);
  v_result record;
BEGIN
  IF p_quote_id IS NULL
     OR length(COALESCE(p_bitrix_quote_id, '')) > 200
     OR length(COALESCE(p_bitrix_deal_id, '')) > 200 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Metadados de sincronização com Bitrix inválidos.';
  END IF;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  PERFORM set_config('app.quote_sync_metadata', 'true', true);
  BEGIN
    UPDATE public.quotes AS quote
    SET synced_to_bitrix = true,
        synced_at = clock_timestamp(),
        bitrix_quote_id = COALESCE(NULLIF(btrim(p_bitrix_quote_id), ''), quote.bitrix_quote_id),
        bitrix_deal_id = COALESCE(NULLIF(btrim(p_bitrix_deal_id), ''), quote.bitrix_deal_id)
    WHERE quote.id = p_quote_id
      AND quote.deleted_at IS NULL
    RETURNING quote.id, quote.bitrix_quote_id, quote.bitrix_deal_id, quote.synced_at
      INTO v_result;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0002',
        MESSAGE = 'Orçamento indisponível para registrar sincronização com Bitrix.';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_sync_metadata', COALESCE(v_previous_sync, ''), true);
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_governance, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_sync_metadata', COALESCE(v_previous_sync, ''), true);
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_governance, ''), true);

  RETURN QUERY SELECT
    v_result.id::uuid,
    v_result.bitrix_quote_id::text,
    v_result.bitrix_deal_id::text,
    v_result.synced_at::timestamptz;
END;
$function$
