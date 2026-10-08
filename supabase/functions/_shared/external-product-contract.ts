/**
 * Contrato de leitura da tabela `products` no catálogo Promobrind.
 *
 * A fonte externa usa `is_active`, `sale_price` e `primary_image_url`.
 * Os aliases legados `active`, `base_price` e `image_url` não existem nessa
 * tabela e fazem o PostgREST rejeitar a consulta inteira com 42703.
 */
export const EXTERNAL_PRODUCT_CORE_COLUMNS = [
  'id',
  'name',
  'sku',
  'sale_price',
  'primary_image_url',
  'is_active',
  'stock_quantity',
  'min_quantity',
] as const;

export const EXTERNAL_PRODUCT_CORE_SELECT = EXTERNAL_PRODUCT_CORE_COLUMNS.join(',');

export const EXTERNAL_PRODUCT_REORDER_SELECT = [
  ...EXTERNAL_PRODUCT_CORE_COLUMNS,
  'min_order_quantity',
  'is_stockout',
  'last_stock_update_at',
  'price_updated_at',
  'price_verified_at',
  'price_last_verified_at',
  'price_freshness_threshold_days',
].join(',');

export const EXTERNAL_PRODUCT_LIGHTWEIGHT_SELECT = [
  'id',
  'name',
  'sku',
  'sale_price',
  'primary_image_url',
  'category_id',
  'main_category_id',
  'supplier_id',
  'supplier_reference',
  'description',
  'short_description',
  'brand',
  'is_active',
  'stock_quantity',
  'min_quantity',
  'created_at',
  'updated_at',
  'is_featured',
  'is_bestseller',
  'is_new',
  'is_on_sale',
  'is_kit',
].join(',');

export const EXTERNAL_ACTIVE_PRODUCT_FILTER = Object.freeze({ is_active: true });
