CREATE OR REPLACE FUNCTION public.sicoob_assert_current_reorder_items(p_items jsonb)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_item jsonb;
  v_checked_at timestamptz;
  v_valid_until timestamptz;
  v_earliest_valid_until timestamptz;
  v_personalization jsonb;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A recompra deve conter entre 1 e 100 itens.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NULLIF(v_item ->> 'source_order_item_id', '') IS NULL
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'minimum_quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'available_stock')::integer, -1) < 0
       OR COALESCE((v_item ->> 'stock_is_reserved')::boolean, true) IS NOT FALSE THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item revalidado da recompra inválido.';
    END IF;
    IF (v_item ->> 'quantity')::integer < (v_item ->> 'minimum_quantity')::integer
       OR (v_item ->> 'quantity')::integer > (v_item ->> 'available_stock')::integer THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade fora do mínimo ou estoque informado pelo catálogo.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    v_valid_until := NULLIF(v_item ->> 'catalog_valid_until', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < statement_timestamp() - interval '5 minutes'
       OR v_checked_at > statement_timestamp() + interval '1 minute'
       OR v_valid_until IS NULL
       OR v_valid_until <= statement_timestamp()
       OR v_valid_until > v_checked_at + interval '5 minutes 1 second' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;
    v_earliest_valid_until := LEAST(COALESCE(v_earliest_valid_until, v_valid_until), v_valid_until);

    IF jsonb_typeof(COALESCE(v_item -> 'personalizations', '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
    END IF;
    FOR v_personalization IN
      SELECT value FROM jsonb_array_elements(COALESCE(v_item -> 'personalizations', '[]'::jsonb))
    LOOP
      IF NULLIF(v_personalization ->> 'technique_id', '') IS NULL
         OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
         OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
         OR (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (v_item ->> 'quantity')::integer
         OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
         OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
         OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização revalidada inválida.';
      END IF;
      v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
      IF v_checked_at IS NULL
         OR v_checked_at < statement_timestamp() - interval '5 minutes'
         OR v_checked_at > statement_timestamp() + interval '1 minute' THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
      END IF;
    END LOOP;
  END LOOP;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        COALESCE(NULLIF(item ->> 'source_variant_id', ''), item ->> 'product_id') AS stock_key,
        sum((item ->> 'quantity')::integer) AS requested,
        min((item ->> 'available_stock')::integer) AS available
      FROM jsonb_array_elements(p_items) AS source(item)
      GROUP BY 1
    ) AS demand
    WHERE requested > available
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Estoque agregado insuficiente para a recompra.';
  END IF;

  RETURN v_earliest_valid_until;
END;
$function$
