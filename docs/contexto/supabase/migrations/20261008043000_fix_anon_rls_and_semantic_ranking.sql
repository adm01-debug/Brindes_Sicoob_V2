-- Mantém helpers de autorização fora da API anônima sem deixar políticas
-- públicas tentarem executá-los. Somente os fluxos públicos intencionais do
-- catálogo/CMS/newsletter recebem políticas específicas para o papel anon.

CREATE TEMP TABLE _sicoob_anon_acl_affected_policies
ON COMMIT DROP
AS
SELECT DISTINCT
  pol.oid AS policy_oid,
  ns.nspname AS schema_name,
  cls.relname AS table_name,
  pol.polname AS policy_name
FROM pg_policy AS pol
JOIN pg_class AS cls ON cls.oid = pol.polrelid
JOIN pg_namespace AS ns ON ns.oid = cls.relnamespace
JOIN pg_depend AS dep
  ON dep.classid = 'pg_policy'::regclass
 AND dep.objid = pol.oid
 AND dep.refclassid = 'pg_proc'::regclass
JOIN pg_proc AS proc ON proc.oid = dep.refobjid
WHERE ns.nspname = 'public'
  AND 0 = ANY (pol.polroles)
  AND NOT has_function_privilege('anon', proc.oid, 'EXECUTE');

DO $preflight$
DECLARE
  v_total integer;
  v_consolidated integer;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (
      WHERE policy_name ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$'
    )
  INTO v_total, v_consolidated
  FROM _sicoob_anon_acl_affected_policies;

  IF v_total <> 245 OR v_consolidated <> 168 THEN
    RAISE EXCEPTION
      'Contrato RLS inesperado antes do reparo: total=%, consolidadas=%',
      v_total,
      v_consolidated;
  END IF;
END;
$preflight$;

DO $restrict_policies$
DECLARE
  v_policy record;
BEGIN
  FOR v_policy IN
    SELECT schema_name, table_name, policy_name
    FROM _sicoob_anon_acl_affected_policies
    ORDER BY schema_name, table_name, policy_name
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I TO authenticated, service_role',
      v_policy.policy_name,
      v_policy.schema_name,
      v_policy.table_name
    );
  END LOOP;
END;
$restrict_policies$;

DROP POLICY IF EXISTS sicoob_anon_cms_banners_select ON public.cms_banners;
CREATE POLICY sicoob_anon_cms_banners_select
ON public.cms_banners
FOR SELECT
TO anon
USING (is_active IS TRUE);

DROP POLICY IF EXISTS sicoob_anon_cms_sections_select ON public.cms_sections;
CREATE POLICY sicoob_anon_cms_sections_select
ON public.cms_sections
FOR SELECT
TO anon
USING (is_active IS TRUE);

DROP POLICY IF EXISTS sicoob_anon_newsletter_insert ON public.newsletter_subscribers;
CREATE POLICY sicoob_anon_newsletter_insert
ON public.newsletter_subscribers
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS sicoob_anon_product_categories_select ON public.product_categories;
CREATE POLICY sicoob_anon_product_categories_select
ON public.product_categories
FOR SELECT
TO anon
USING (deleted_at IS NULL AND is_active IS TRUE);

-- Avalia todos os candidatos antes de aplicar o limite. A implementação
-- anterior parava nos primeiros resultados aceitáveis e podia descartar o
-- produto mais relevante quando ele aparecia no fim do JSON recebido.
CREATE OR REPLACE FUNCTION public.search_products_semantic(
  _query text,
  _products jsonb,
  _limit integer DEFAULT 20
)
RETURNS TABLE (
  product_id uuid,
  score double precision,
  matched_field text
)
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
$function$;

COMMENT ON FUNCTION public.search_products_semantic(text, jsonb, integer) IS
'Reordena todos os candidatos por similaridade antes do limite, com desempate estável pela ordem recebida.';

DO $postflight$
DECLARE
  v_public_dependency_count integer;
  v_anon_policy_count integer;
  v_consolidated_public_count integer;
  v_consolidated_protected_count integer;
BEGIN
  SELECT count(DISTINCT pol.oid)
  INTO v_public_dependency_count
  FROM pg_policy AS pol
  JOIN pg_class AS cls ON cls.oid = pol.polrelid
  JOIN pg_namespace AS ns ON ns.oid = cls.relnamespace
  JOIN pg_depend AS dep
    ON dep.classid = 'pg_policy'::regclass
   AND dep.objid = pol.oid
   AND dep.refclassid = 'pg_proc'::regclass
  JOIN pg_proc AS proc ON proc.oid = dep.refobjid
  WHERE ns.nspname = 'public'
    AND 0 = ANY (pol.polroles)
    AND NOT has_function_privilege('anon', proc.oid, 'EXECUTE');

  SELECT count(*)
  INTO v_anon_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname = ANY (ARRAY[
      'sicoob_anon_cms_banners_select',
      'sicoob_anon_cms_sections_select',
      'sicoob_anon_newsletter_insert',
      'sicoob_anon_product_categories_select'
    ])
    AND roles = ARRAY['anon']::name[]
    AND permissive = 'PERMISSIVE';

  SELECT
    count(*) FILTER (WHERE roles = ARRAY['public']::name[]),
    count(*) FILTER (
      WHERE roles = ARRAY['authenticated', 'service_role']::name[]
    )
  INTO v_consolidated_public_count, v_consolidated_protected_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname ~ '^sicoob_merged_[0-9a-f]{16}_(select|insert|update|delete)$';

  IF v_public_dependency_count <> 0
     OR v_anon_policy_count <> 4
     OR v_consolidated_public_count <> 59
     OR v_consolidated_protected_count <> 168
     OR has_function_privilege('anon', 'public.can_view_all_sales(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.current_user_cooperativa_id()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.current_user_pa_id()', 'EXECUTE')
     OR has_function_privilege('anon', 'public.get_user_org_ids(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.has_role(uuid,public.app_role)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.is_admin(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.is_dev(uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.is_supervisor_or_above(uuid)', 'EXECUTE')
     OR has_function_privilege(
       'anon',
       'public.search_products_semantic(text,jsonb,integer)',
       'EXECUTE'
     )
     OR has_function_privilege(
       'authenticated',
       'public.search_products_semantic(text,jsonb,integer)',
       'EXECUTE'
     )
     OR NOT has_function_privilege(
       'service_role',
       'public.search_products_semantic(text,jsonb,integer)',
       'EXECUTE'
     ) THEN
    RAISE EXCEPTION
      'Contrato pós-migration inválido: dependências públicas=%, políticas anon=%, consolidadas públicas=%, consolidadas protegidas=%',
      v_public_dependency_count,
      v_anon_policy_count,
      v_consolidated_public_count,
      v_consolidated_protected_count;
  END IF;
END;
$postflight$;
