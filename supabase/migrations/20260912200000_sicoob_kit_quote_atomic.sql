-- Converte uma composição do Kit Builder em orçamento local de forma atômica.
-- A Edge Function autenticada consulta preços, variantes, estoque e técnicas no
-- catálogo somente leitura. Esta RPC interna recebe o snapshot já verificado,
-- valida sua atualidade e persiste cabeçalho, itens e personalizações juntos.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.quote_item_personalizations
  ADD COLUMN IF NOT EXISTS catalog_checked_at timestamptz;

CREATE TABLE IF NOT EXISTS public.sicoob_kit_quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, idempotency_key),
  CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  CHECK (length(payload_hash) = 64)
);

ALTER TABLE public.sicoob_kit_quote_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário consulta conversões próprias de kit" ON public.sicoob_kit_quote_requests;
CREATE POLICY "Usuário consulta conversões próprias de kit"
ON public.sicoob_kit_quote_requests
FOR SELECT TO authenticated
USING (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_sicoob_kit_quote(
  p_kit jsonb,
  p_items jsonb,
  p_personalizations jsonb,
  p_idempotency_key text,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_existing public.sicoob_kit_quote_requests%ROWTYPE;
  v_item jsonb;
  v_personalization jsonb;
  v_quote_id uuid;
  v_quote_number text;
  v_quote_item_id uuid;
  v_group_id uuid := gen_random_uuid();
  v_sort_order integer := 0;
  v_product_total numeric(14,2) := 0;
  v_personalization_total numeric(14,2) := 0;
  v_total numeric(14,2);
  v_checked_at timestamptz;
  v_stable_items jsonb;
  v_stable_personalizations jsonb;
  v_payload_hash text;
  v_kit_name text := NULLIF(trim(p_kit ->> 'name'), '');
  v_kit_type text := NULLIF(trim(p_kit ->> 'type'), '');
  v_kit_quantity integer;
  v_identity_tag text := NULLIF(trim(p_kit ->> 'identity_tag'), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária para criar o orçamento.';
  END IF;
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Chave de idempotência inválida.';
  END IF;
  IF jsonb_typeof(p_kit) IS DISTINCT FROM 'object'
     OR v_kit_name IS NULL OR length(v_kit_name) > 120
     OR v_kit_type NOT IN ('montado', 'original', 'simples')
     OR COALESCE(length(v_identity_tag), 0) > 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identificação do kit inválida.';
  END IF;

  BEGIN
    v_kit_quantity := (p_kit ->> 'quantity')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade de kits inválida.';
  END;
  IF v_kit_quantity IS NULL OR v_kit_quantity NOT BETWEEN 1 AND 100000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A quantidade de kits deve estar entre 1 e 100.000.';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 2 AND 50
     OR jsonb_typeof(p_personalizations) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_personalizations) > jsonb_array_length(p_items) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Composição do kit inválida.';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_items) source(item) WHERE item ->> 'kind' = 'box') <> 1
     OR jsonb_array_length(p_items) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_items) source(item)
     )
     OR jsonb_array_length(p_personalizations) <> (
       SELECT count(DISTINCT item ->> 'line_id')::integer FROM jsonb_array_elements(p_personalizations) source(item)
     ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Linhas de kit duplicadas ou embalagem inválida.';
  END IF;

  SELECT * INTO v_profile
    FROM public.profiles
   WHERE user_id = p_actor_id
     AND is_active IS TRUE
     AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O usuário não possui perfil ativo.';
  END IF;

  SELECT jsonb_agg(item - 'catalog_checked_at' ORDER BY item ->> 'line_id')
    INTO v_stable_items
    FROM jsonb_array_elements(p_items) source(item);
  SELECT COALESCE(jsonb_agg(item - 'catalog_checked_at' ORDER BY item ->> 'line_id'), '[]'::jsonb)
    INTO v_stable_personalizations
    FROM jsonb_array_elements(p_personalizations) source(item);
  v_payload_hash := encode(digest(
    jsonb_build_object(
      'kit', p_kit,
      'items', v_stable_items,
      'personalizations', v_stable_personalizations
    )::text,
    'sha256'
  ), 'hex');

  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_id::text || ':' || trim(p_idempotency_key), 0));
  SELECT * INTO v_existing
    FROM public.sicoob_kit_quote_requests
   WHERE actor_id = p_actor_id
     AND idempotency_key = trim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.payload_hash IS DISTINCT FROM v_payload_hash THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A chave de idempotência já foi usada com conteúdo diferente.';
    END IF;
    SELECT quote_number, total INTO v_quote_number, v_total
      FROM public.quotes WHERE id = v_existing.quote_id;
    RETURN jsonb_build_object('quote_id', v_existing.quote_id, 'quote_number', v_quote_number, 'total', v_total);
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF COALESCE(length(v_item ->> 'line_id'), 0) NOT BETWEEN 1 AND 64
       OR v_item ->> 'kind' NOT IN ('box', 'item')
       OR NULLIF(v_item ->> 'product_id', '') IS NULL
       OR NULLIF(trim(v_item ->> 'product_name'), '') IS NULL
       OR COALESCE((v_item ->> 'quantity')::integer, 0) <= 0
       OR COALESCE((v_item ->> 'unit_price')::numeric, 0) <= 0
       OR COALESCE((v_item ->> 'minimum_quantity')::integer, 1) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Item verificado do kit inválido.';
    END IF;

    v_checked_at := NULLIF(v_item ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Preço e estoque precisam ser consultados novamente.';
    END IF;
    v_product_total := v_product_total
      + ((v_item ->> 'quantity')::integer * (v_item ->> 'unit_price')::numeric);
  END LOOP;

  -- MOQ é uma regra do produto, portanto duas linhas/variantes do mesmo produto
  -- devem ser avaliadas pela demanda total. Também recusamos snapshots que
  -- atribuam mínimos divergentes ao mesmo produto.
  IF EXISTS (
    SELECT 1
      FROM (
        SELECT item ->> 'product_id' AS product_id,
               sum((item ->> 'quantity')::integer) AS total_quantity,
               min(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS minimum_quantity,
               max(COALESCE((item ->> 'minimum_quantity')::integer, 1)) AS maximum_quantity
          FROM jsonb_array_elements(p_items) source(item)
         GROUP BY item ->> 'product_id'
      ) demand
     WHERE demand.minimum_quantity IS DISTINCT FROM demand.maximum_quantity
        OR demand.total_quantity < demand.minimum_quantity
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantidade abaixo do mínimo vigente do produto.';
  END IF;

  FOR v_personalization IN SELECT value FROM jsonb_array_elements(p_personalizations)
  LOOP
    IF NOT EXISTS (
         SELECT 1 FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       )
       OR NULLIF(v_personalization ->> 'technique_id', '') IS NULL
       OR NULLIF(trim(v_personalization ->> 'technique_name'), '') IS NULL
       OR COALESCE((v_personalization ->> 'colors_count')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'personalized_quantity')::integer, 0) <= 0
       OR COALESCE((v_personalization ->> 'unit_cost')::numeric, 0) <= 0
       OR COALESCE((v_personalization ->> 'setup_cost')::numeric, 0) < 0
       OR COALESCE((v_personalization ->> 'total_cost')::numeric, 0) <= 0 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Personalização verificada do kit inválida.';
    END IF;
    IF (v_personalization ->> 'personalized_quantity')::integer IS DISTINCT FROM (
         SELECT (item ->> 'quantity')::integer
           FROM jsonb_array_elements(p_items) source(item)
          WHERE item ->> 'line_id' = v_personalization ->> 'line_id'
       ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A personalização não corresponde à quantidade do item.';
    END IF;

    v_checked_at := NULLIF(v_personalization ->> 'catalog_checked_at', '')::timestamptz;
    IF v_checked_at IS NULL
       OR v_checked_at < now() - interval '5 minutes'
       OR v_checked_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O preço da personalização precisa ser consultado novamente.';
    END IF;
    v_personalization_total := v_personalization_total + (v_personalization ->> 'total_cost')::numeric;
  END LOOP;

  v_total := round(v_product_total + v_personalization_total, 2);
  INSERT INTO public.quotes (
    client_id, client_name, seller_id, status, subtotal, total, notes,
    internal_notes, organization_id, pa_id, singular_id
  ) VALUES (
    NULL,
    'Unidade Sicoob',
    p_actor_id,
    'draft',
    v_total,
    v_total,
    format('Kit "%s" (%sx) — tipo: %s. Catálogo consultado na criação; estoque não reservado.',
      v_kit_name, v_kit_quantity, v_kit_type),
    CASE WHEN v_identity_tag IS NOT NULL THEN format('Identidade do kit: %s', v_identity_tag) ELSE NULL END,
    v_profile.organization_id,
    v_profile.pa_id,
    v_profile.cooperativa_id
  ) RETURNING id, quote_number INTO v_quote_id, v_quote_number;

  FOR v_item IN
    SELECT value
      FROM jsonb_array_elements(p_items)
     ORDER BY CASE WHEN value ->> 'kind' = 'box' THEN 0 ELSE 1 END, value ->> 'line_id'
  LOOP
    INSERT INTO public.quote_items (
      quote_id, product_id, product_name, product_sku, product_image_url,
      quantity, unit_price, color_name, color_hex, size_code, notes, sort_order,
      kit_group_id, kit_name, source_variant_id, source_variant_sku, catalog_checked_at
    ) VALUES (
      v_quote_id,
      v_item ->> 'product_id',
      v_item ->> 'product_name',
      NULLIF(v_item ->> 'product_sku', ''),
      NULLIF(v_item ->> 'product_image_url', ''),
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      NULLIF(v_item ->> 'color_name', ''),
      NULLIF(v_item ->> 'color_hex', ''),
      NULLIF(v_item ->> 'size_code', ''),
      CASE WHEN v_item ->> 'kind' = 'box' THEN 'Embalagem do kit' ELSE NULL END,
      v_sort_order,
      v_group_id::text,
      v_kit_name,
      NULLIF(v_item ->> 'source_variant_id', ''),
      NULLIF(v_item ->> 'source_variant_sku', ''),
      (v_item ->> 'catalog_checked_at')::timestamptz
    ) RETURNING id INTO v_quote_item_id;

    SELECT value INTO v_personalization
      FROM jsonb_array_elements(p_personalizations)
     WHERE value ->> 'line_id' = v_item ->> 'line_id';
    IF FOUND THEN
      INSERT INTO public.quote_item_personalizations (
        quote_item_id, technique_id, technique_name, colors_count,
        width_cm, height_cm, personalized_quantity, unit_cost,
        setup_cost, total_cost, notes, catalog_checked_at
      ) VALUES (
        v_quote_item_id,
        v_personalization ->> 'technique_id',
        v_personalization ->> 'technique_name',
        (v_personalization ->> 'colors_count')::integer,
        NULLIF(v_personalization ->> 'width_cm', '')::numeric,
        NULLIF(v_personalization ->> 'height_cm', '')::numeric,
        (v_personalization ->> 'personalized_quantity')::integer,
        (v_personalization ->> 'unit_cost')::numeric,
        (v_personalization ->> 'setup_cost')::numeric,
        (v_personalization ->> 'total_cost')::numeric,
        CASE WHEN NULLIF(v_personalization ->> 'position', '') IS NOT NULL
          THEN format('Posição: %s', v_personalization ->> 'position') ELSE NULL END,
        (v_personalization ->> 'catalog_checked_at')::timestamptz
      );
    END IF;
    v_sort_order := v_sort_order + 1;
  END LOOP;

  INSERT INTO public.sicoob_kit_quote_requests (
    actor_id, idempotency_key, payload_hash, quote_id
  ) VALUES (
    p_actor_id, trim(p_idempotency_key), v_payload_hash, v_quote_id
  );

  RETURN jsonb_build_object('quote_id', v_quote_id, 'quote_number', v_quote_number, 'total', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid) TO service_role;

COMMENT ON FUNCTION public.create_sicoob_kit_quote(jsonb, jsonb, jsonb, text, uuid) IS
  'RPC interna: persiste orçamento de kit atômico e idempotente após revalidação do catálogo pela Edge Function.';
