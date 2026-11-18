CREATE OR REPLACE FUNCTION public.search_products_semantic(_query text, _products jsonb, _limit integer DEFAULT 20)
 RETURNS TABLE(product_id uuid, score double precision, matched_field text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_limit integer := greatest(1, least(coalesce(_limit, 20), 100));
  v_query text := lower(trim(_query));
BEGIN
  IF v_query IS NULL
     OR v_query = ''
     OR _products IS NULL
     OR jsonb_typeof(_products) <> 'array' THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH expanded AS (
    SELECT item, ordinality
    FROM jsonb_array_elements(_products) WITH ORDINALITY AS source(item, ordinality)
  ), products AS (
    SELECT
      (item ->> 'id')::uuid AS candidate_id,
      lower(coalesce(item ->> 'name', '')) AS candidate_name,
      lower(coalesce(item ->> 'description', '')) AS candidate_description,
      lower(coalesce(item ->> 'category', '')) AS candidate_category,
      lower(
        CASE jsonb_typeof(item -> 'tags')
          WHEN 'array' THEN coalesce((
            SELECT string_agg(tag, ' ' ORDER BY tag_ordinality)
            FROM jsonb_array_elements_text(item -> 'tags')
              WITH ORDINALITY AS tags(tag, tag_ordinality)
          ), '')
          WHEN 'string' THEN coalesce(item ->> 'tags', '')
          ELSE ''
        END
      ) AS candidate_tags,
      ordinality
    FROM expanded
  ), ranked AS (
    SELECT
      products.candidate_id,
      best.score,
      best.matched_field,
      products.ordinality
    FROM products
    CROSS JOIN LATERAL (
      SELECT candidates.score, candidates.matched_field
      FROM (VALUES
        (
          extensions.similarity(products.candidate_name, v_query)::double precision,
          'name'::text,
          1
        ),
        (
          (extensions.similarity(products.candidate_category, v_query) * 0.8)::double precision,
          'category'::text,
          2
        ),
        (
          (extensions.similarity(products.candidate_tags, v_query) * 0.7)::double precision,
          'tags'::text,
          3
        ),
        (
          (extensions.similarity(products.candidate_description, v_query) * 0.5)::double precision,
          'description'::text,
          4
        )
      ) AS candidates(score, matched_field, tie_priority)
      ORDER BY candidates.score DESC NULLS LAST, candidates.tie_priority
      LIMIT 1
    ) AS best
  )
  SELECT
    ranked.candidate_id,
    ranked.score,
    ranked.matched_field
  FROM ranked
  WHERE ranked.score > 0.05
  ORDER BY ranked.score DESC, ranked.ordinality
  LIMIT v_limit;
END;
$function$
