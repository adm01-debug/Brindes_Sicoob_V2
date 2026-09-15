-- Preflight somente leitura do contrato operacional Sicoob.
--
-- Execute no projeto operacional cfmzkthhgliqelozlmwu antes e depois de
-- qualquer migration de reconciliação. Este arquivo não cria, altera ou apaga
-- dados; ele apenas torna o drift explícito e revisável.
--
-- Não use o resultado "conforme" como autorização de deploy: backup
-- restaurável, homologação isolada e testes autenticados continuam exigidos.

WITH required_tables(table_name) AS (
  VALUES
    ('order_consolidations'),
    ('order_consolidation_orders'),
    ('sicoob_approval_policies'),
    ('sicoob_delivery_allocations'),
    ('sicoob_delivery_destinations'),
    ('sicoob_delivery_receipt_events'),
    ('sicoob_kit_quote_requests'),
    ('sicoob_order_artwork_versions'),
    ('sicoob_order_invoices'),
    ('sicoob_order_payments'),
    ('sicoob_order_shipments'),
    ('sicoob_reorder_requests')
),
required_columns(table_name, column_name) AS (
  VALUES
    ('profiles', 'singular_id'),
    ('profiles', 'carteira_id'),
    ('sicoob_orders', 'consolidation_id'),
    ('sicoob_orders', 'order_number'),
    ('sicoob_orders', 'approval_policy_id'),
    ('sicoob_orders', 'approval_policy_version'),
    ('sicoob_orders', 'approval_policy_snapshot'),
    ('sicoob_order_items', 'product_image_url'),
    ('sicoob_order_items', 'product_sku'),
    ('sicoob_order_items', 'color_name'),
    ('sicoob_order_items', 'color_hex'),
    ('sicoob_order_items', 'variant_id'),
    ('sicoob_order_items', 'variant_sku'),
    ('sicoob_order_items', 'size_code'),
    ('sicoob_order_items', 'personalization_snapshot')
),
required_functions(function_name) AS (
  VALUES
    ('create_sicoob_kit_quote'),
    ('get_sicoob_kit_quote_idempotency'),
    ('get_sicoob_reorder_idempotency'),
    ('get_sicoob_consolidation_sellers'),
    ('reorder_sicoob_order_as_quote'),
    ('record_sicoob_order_payment'),
    ('refund_sicoob_order_payment'),
    ('add_sicoob_order_invoice'),
    ('decide_sicoob_order_artwork')
),
required_views(view_name) AS (
  VALUES ('v_sicoob_hierarchy')
),
required_buckets(bucket_id) AS (
  VALUES ('art-files'), ('avatars'), ('sicoob-order-documents')
),
checks AS (
  SELECT
    'tabela'::text AS tipo,
    table_name AS recurso,
    to_regclass('public.' || table_name) IS NOT NULL AS conforme,
    CASE WHEN to_regclass('public.' || table_name) IS NOT NULL
      THEN 'presente'
      ELSE 'ausente'
    END AS detalhe
  FROM required_tables

  UNION ALL

  SELECT
    'coluna'::text,
    table_name || '.' || column_name,
    EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = required_columns.table_name
        AND c.column_name = required_columns.column_name
    ),
    CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = required_columns.table_name
        AND c.column_name = required_columns.column_name
    ) THEN 'presente' ELSE 'ausente' END
  FROM required_columns

  UNION ALL

  SELECT
    'função'::text,
    function_name,
    EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = required_functions.function_name
    ),
    CASE WHEN EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = required_functions.function_name
    ) THEN 'presente' ELSE 'ausente' END
  FROM required_functions

  UNION ALL

  SELECT
    'view'::text,
    view_name,
    to_regclass('public.' || view_name) IS NOT NULL,
    CASE WHEN to_regclass('public.' || view_name) IS NOT NULL
      THEN 'presente' ELSE 'ausente' END
  FROM required_views

  UNION ALL

  SELECT
    'bucket'::text,
    bucket_id,
    EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = required_buckets.bucket_id),
    CASE WHEN EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = required_buckets.bucket_id)
      THEN 'presente' ELSE 'ausente' END
  FROM required_buckets
)
SELECT
  tipo,
  recurso,
  CASE WHEN conforme THEN 'CONFORME' ELSE 'FALTANTE' END AS status,
  detalhe
FROM checks
ORDER BY conforme, tipo, recurso;
