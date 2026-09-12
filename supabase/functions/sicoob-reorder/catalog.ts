export interface SourceItem {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  variant_id: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
}

export interface CatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  sale_price: number | null;
  base_price?: number | null;
  primary_image_url: string | null;
  image_url?: string | null;
  is_active: boolean | null;
  active?: boolean | null;
  stock_quantity: number | null;
  min_quantity: number | null;
}

export interface CatalogVariant {
  id: string;
  product_id: string;
  sku: string | null;
  sale_price: number | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  stock_quantity: number | null;
  selected_thumbnail: string | null;
  is_active: boolean | null;
}

interface ResolvedItem {
  source: SourceItem;
  product: CatalogProduct;
  variant?: CatalogVariant;
  quantity: number;
  minimum: number;
  stock: number;
  price: number;
  stockKey: string;
}

export function buildVerifiedReorderItems(
  items: SourceItem[],
  products: CatalogProduct[],
  variants: CatalogVariant[],
  checkedAt: string,
) {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  const resolved: ResolvedItem[] = items.map((source) => {
    const product = source.product_id ? productsById.get(source.product_id) : undefined;
    if (!product || product.is_active === false || product.active === false) {
      throw new Error(`O produto “${source.product_name}” não está mais disponível no catálogo.`);
    }

    const variant = source.variant_id ? variantsById.get(source.variant_id) : undefined;
    if (source.variant_id && (!variant || variant.product_id !== product.id || variant.is_active === false)) {
      throw new Error(`A variante de “${product.name}” não está mais disponível.`);
    }

    const quantity = Number(source.quantity);
    const minimum = Number(product.min_quantity ?? 1);
    const stock = Number(variant ? variant.stock_quantity : product.stock_quantity);
    const price = Number(variant?.sale_price ?? product.sale_price ?? product.base_price ?? 0);
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`A quantidade de “${product.name}” é inválida.`);
    if (!Number.isFinite(price) || price <= 0) throw new Error(`O produto “${product.name}” está sem preço vigente.`);
    if (!Number.isFinite(minimum) || minimum <= 0) throw new Error(`A quantidade mínima de “${product.name}” é inválida.`);
    if (!Number.isFinite(stock) || stock < 0) throw new Error(`O estoque de “${product.name}” está inválido.`);

    return {
      source,
      product,
      variant,
      quantity,
      minimum,
      stock,
      price,
      stockKey: variant ? `variant:${variant.id}` : `product:${product.id}`,
    };
  });

  const demandByStock = new Map<string, { quantity: number; minimum: number; stock: number; name: string }>();
  for (const item of resolved) {
    const current = demandByStock.get(item.stockKey);
    if (current) current.quantity += item.quantity;
    else demandByStock.set(item.stockKey, {
      quantity: item.quantity,
      minimum: item.minimum,
      stock: item.stock,
      name: item.product.name,
    });
  }
  for (const demand of demandByStock.values()) {
    if (demand.quantity < demand.minimum) {
      throw new Error(`A quantidade mínima vigente de “${demand.name}” é ${demand.minimum}.`);
    }
    if (demand.quantity > demand.stock) throw new Error(`Estoque insuficiente para “${demand.name}”.`);
  }

  return resolved.map(({ source, product, variant, quantity, minimum, price }) => ({
    source_order_item_id: source.id,
    product_id: product.id,
    product_sku: variant?.sku || product.sku,
    product_name: product.name,
    product_image_url: variant?.selected_thumbnail || product.primary_image_url || product.image_url || null,
    quantity,
    unit_price: price,
    minimum_quantity: minimum,
    source_variant_id: variant?.id || null,
    source_variant_sku: variant?.sku || null,
    color_name: variant?.color_name || source.color_name,
    color_hex: variant?.color_hex || source.color_hex,
    size_code: variant?.size_code || source.size_code,
    catalog_checked_at: checkedAt,
  }));
}
