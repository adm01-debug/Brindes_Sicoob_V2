export type KitLineKind = 'box' | 'item';

export interface KitPersonalizationRequest {
  techniqueId: string;
  colors?: number;
  width?: number | null;
  height?: number | null;
}

export interface KitLineRequest {
  lineId: string;
  productId: string;
  variantId?: string | null;
  unitsPerKit: number;
  kind: KitLineKind;
  personalization?: KitPersonalizationRequest | null;
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

export interface VerifiedKitLine {
  line_id: string;
  kind: KitLineKind;
  product_id: string;
  product_name: string;
  product_sku: string | null;
  product_image_url: string | null;
  quantity: number;
  unit_price: number;
  minimum_quantity: number;
  source_variant_id: string | null;
  source_variant_sku: string | null;
  color_name: string | null;
  color_hex: string | null;
  size_code: string | null;
  catalog_checked_at: string;
}

export interface VerifiedKitPersonalization {
  line_id: string;
  technique_id: string;
  technique_name: string;
  colors_count: number;
  width_cm: number | null;
  height_cm: number | null;
  personalized_quantity: number;
  unit_cost: number;
  setup_cost: number;
  total_cost: number;
  position: string | null;
  catalog_checked_at: string;
}

type Raw = Record<string, unknown>;

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function boolean(value: unknown): boolean {
  return value === true || value === 'true' || value === 1;
}

function productStock(product: CatalogProduct, variants: CatalogVariant[]): number {
  const activeVariants = variants.filter((variant) => variant.product_id === product.id && variant.is_active !== false);
  if (activeVariants.length) {
    return activeVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock_quantity ?? 0)), 0);
  }
  return Number(product.stock_quantity);
}

export function assertCompleteVariantCatalog(
  expectedCount: number | null,
  variants: CatalogVariant[],
): void {
  if (!Number.isSafeInteger(expectedCount) || expectedCount === null || expectedCount < 0) {
    throw new Error('O catálogo não confirmou a contagem exata das variantes. Tente novamente.');
  }
  if (expectedCount !== variants.length) {
    throw new Error('O catálogo possui variantes demais para uma conferência segura. Refine a composição do kit.');
  }
}

export function buildVerifiedKitLines(
  requests: KitLineRequest[],
  products: CatalogProduct[],
  variants: CatalogVariant[],
  kitQuantity: number,
  checkedAt: string,
): VerifiedKitLine[] {
  if (!Number.isInteger(kitQuantity) || kitQuantity <= 0 || kitQuantity > 100_000) {
    throw new Error('A quantidade de kits deve estar entre 1 e 100.000.');
  }
  if (requests.length < 2 || requests.length > 50) {
    throw new Error('O kit deve conter uma embalagem e entre 1 e 49 itens.');
  }

  const lineIds = new Set<string>();
  for (const request of requests) {
    if (!/^[A-Za-z0-9:_-]{1,64}$/.test(request.lineId) || lineIds.has(request.lineId)) {
      throw new Error('A composição do kit contém linhas duplicadas ou inválidas.');
    }
    lineIds.add(request.lineId);
  }
  if (requests.filter((request) => request.kind === 'box').length !== 1) {
    throw new Error('O kit deve conter exatamente uma embalagem.');
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));
  const selectionModeByProduct = new Map<string, Set<'variant' | 'product'>>();

  const resolved = requests.map((request) => {
    if (!request.productId || !Number.isInteger(request.unitsPerKit) || request.unitsPerKit <= 0 || request.unitsPerKit > 10_000) {
      throw new Error('A composição do kit contém produto ou quantidade inválidos.');
    }
    const product = productsById.get(request.productId);
    if (!product || product.is_active === false || product.active === false) {
      throw new Error('Um produto do kit não está mais disponível no catálogo.');
    }

    const variant = request.variantId ? variantsById.get(request.variantId) : undefined;
    if (request.variantId && (!variant || variant.product_id !== product.id || variant.is_active === false)) {
      throw new Error(`A variante de “${product.name}” não está mais disponível.`);
    }

    const mode = request.variantId ? 'variant' : 'product';
    const modes = selectionModeByProduct.get(product.id) ?? new Set<'variant' | 'product'>();
    modes.add(mode);
    selectionModeByProduct.set(product.id, modes);

    const quantity = request.unitsPerKit * kitQuantity;
    const minimum = Number(product.min_quantity ?? 1);
    const stock = variant ? Number(variant.stock_quantity) : productStock(product, variants);
    const price = Number(variant?.sale_price ?? product.sale_price ?? product.base_price ?? 0);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error(`A quantidade de “${product.name}” é inválida.`);
    if (!Number.isFinite(minimum) || minimum <= 0) throw new Error(`A quantidade mínima de “${product.name}” é inválida.`);
    if (!Number.isFinite(stock) || stock < 0) throw new Error(`O estoque de “${product.name}” está inválido.`);
    if (!Number.isFinite(price) || price <= 0) throw new Error(`O produto “${product.name}” está sem preço vigente.`);

    return {
      request,
      product,
      variant,
      quantity,
      minimum,
      stock,
      price,
      stockKey: variant ? `variant:${variant.id}` : `product:${product.id}`,
    };
  });

  for (const modes of selectionModeByProduct.values()) {
    if (modes.size > 1) {
      throw new Error('O mesmo produto não pode misturar linhas com variante definida e estoque agregado.');
    }
  }

  const demandByProduct = new Map<string, { quantity: number; minimum: number; name: string }>();
  const demandByStock = new Map<string, { quantity: number; stock: number; name: string }>();
  for (const item of resolved) {
    const productDemand = demandByProduct.get(item.product.id);
    if (productDemand) productDemand.quantity += item.quantity;
    else demandByProduct.set(item.product.id, { quantity: item.quantity, minimum: item.minimum, name: item.product.name });

    const stockDemand = demandByStock.get(item.stockKey);
    if (stockDemand) stockDemand.quantity += item.quantity;
    else demandByStock.set(item.stockKey, { quantity: item.quantity, stock: item.stock, name: item.product.name });
  }
  for (const demand of demandByProduct.values()) {
    if (demand.quantity < demand.minimum) {
      throw new Error(`A quantidade mínima vigente de “${demand.name}” é ${demand.minimum}.`);
    }
  }
  for (const demand of demandByStock.values()) {
    if (demand.quantity > demand.stock) throw new Error(`Estoque insuficiente para “${demand.name}”.`);
  }

  return resolved.map(({ request, product, variant, quantity, minimum, price }) => ({
    line_id: request.lineId,
    kind: request.kind,
    product_id: product.id,
    product_name: product.name,
    product_sku: variant?.sku || product.sku || null,
    product_image_url: variant?.selected_thumbnail || product.primary_image_url || product.image_url || null,
    quantity,
    unit_price: price,
    minimum_quantity: minimum,
    source_variant_id: variant?.id || null,
    source_variant_sku: variant?.sku || null,
    color_name: variant?.color_name || null,
    color_hex: variant?.color_hex || null,
    size_code: variant?.size_code || null,
    catalog_checked_at: checkedAt,
  }));
}

export function buildVerifiedPersonalization(
  request: KitPersonalizationRequest,
  line: VerifiedKitLine,
  optionsPayload: unknown,
  pricePayload: unknown,
  checkedAt: string,
): VerifiedKitPersonalization {
  const payload = optionsPayload && typeof optionsPayload === 'object' ? optionsPayload as Raw : {};
  const optionsProductId = text(payload.product_id ?? payload.produto_id ?? payload.id);
  if (optionsProductId !== line.product_id) {
    throw new Error(`O catálogo devolveu técnicas de outro produto para “${line.product_name}”.`);
  }
  const locations = (Array.isArray(payload.locations) ? payload.locations : payload.locais) as Raw[] | undefined;
  let selected: Raw | null = null;
  let position: string | null = null;
  for (const location of locations ?? []) {
    const options = (Array.isArray(location.options) ? location.options : location.opcoes) as Raw[] | undefined;
    const option = options?.find((candidate) => text(candidate.technique_id ?? candidate.tecnica_id ?? candidate.id) === request.techniqueId);
    if (option) {
      selected = option;
      position = text(location.location_name ?? location.name) || null;
      break;
    }
  }
  if (!selected) throw new Error(`A técnica escolhida para “${line.product_name}” não pertence ao produto.`);

  const colors = request.colors ?? 1;
  const maxColors = finiteNumber(selected.max_cores ?? selected.max_colors) ?? 1;
  if (!Number.isInteger(colors) || colors <= 0 || colors > maxColors) {
    throw new Error(`A quantidade de cores de “${line.product_name}” excede a técnica escolhida.`);
  }

  const usesDimensions = boolean(selected.usa_dimensao ?? selected.uses_dimension ?? selected.price_by_area);
  const width = finiteNumber(request.width);
  const height = finiteNumber(request.height);
  const maxWidth = finiteNumber(selected.efetiva_largura_max ?? selected.effective_max_width ?? selected.max_width);
  const maxHeight = finiteNumber(selected.efetiva_altura_max ?? selected.effective_max_height ?? selected.max_height);
  if (usesDimensions && (!width || !height || width <= 0 || height <= 0)) {
    throw new Error(`Informe as dimensões de personalização de “${line.product_name}”.`);
  }
  if ((width && maxWidth && width > maxWidth) || (height && maxHeight && height > maxHeight)) {
    throw new Error(`A personalização de “${line.product_name}” excede a área permitida.`);
  }

  const pricing = pricePayload && typeof pricePayload === 'object' ? pricePayload as Raw : {};
  if (pricing.success !== true) throw new Error(text(pricing.error) || `Não foi possível precificar “${line.product_name}”.`);
  const echoedQuantity = finiteNumber(pricing.quantidade ?? pricing.quantity);
  const unitCost = finiteNumber(pricing.preco_unitario ?? pricing.unit_price);
  const setupCost = finiteNumber(pricing.setup_total ?? pricing.setup_total_value) ?? 0;
  const totalCost = finiteNumber(pricing.total_cobrado ?? pricing.total_charged);
  if (echoedQuantity !== null && echoedQuantity !== line.quantity) {
    throw new Error(`O catálogo devolveu uma quantidade divergente para “${line.product_name}”.`);
  }
  if (unitCost === null || unitCost <= 0 || setupCost < 0 || totalCost === null || totalCost <= 0) {
    throw new Error(`A personalização de “${line.product_name}” está sem preço vigente.`);
  }
  if (totalCost + 0.01 < Math.max(unitCost * line.quantity, setupCost)) {
    throw new Error(`O total de personalização de “${line.product_name}” é inconsistente.`);
  }

  return {
    line_id: line.line_id,
    technique_id: request.techniqueId,
    technique_name: text(selected.tecnica_nome ?? selected.technique_name ?? selected.name) || 'Personalização',
    colors_count: colors,
    width_cm: usesDimensions ? width : null,
    height_cm: usesDimensions ? height : null,
    personalized_quantity: line.quantity,
    unit_cost: unitCost,
    setup_cost: setupCost,
    total_cost: totalCost,
    position,
    catalog_checked_at: checkedAt,
  };
}
