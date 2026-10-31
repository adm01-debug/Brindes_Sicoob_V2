// ============================================
// TIPOS PARA GESTÃO DE ESTOQUE GRANULAR
// Por Cor/Variação/SKU
// ============================================

// ============================================
// ESTOQUE POR VARIAÇÃO
// ============================================

export interface VariantStock {
  id: string;
  productId: string;
  variantId: string;
  variantSku: string;
  
  // Identificação da variação
  colorId?: string;
  colorName?: string;
  colorHex?: string;
  colorGroup?: string; // Ex: "Azuis", "Vermelhos"
  
  sizeName?: string;
  sizeCode?: string;
  
  // Atributos extras
  attributeValues?: Record<string, string>;
  
  // Estoque atual
  currentStock: number;
  minStock: number;
  maxStock?: number;
  
  // Reservas e disponibilidade
  reservedStock: number;   // Reservado em pedidos pendentes
  inTransitStock: number;  // Em trânsito (pedido ao fornecedor)
  availableStock: number;  // Disponível para venda (current - reserved)
  
  // Estoque futuro/previsão
  futureStock?: number;
  futureStockDate?: string;
  expectedReplenishDate?: string;
  
  // Status calculado
  status: StockStatus;
  
  // Métricas
  daysUntilStockout?: number;
  avgDailySales?: number;
  lastSaleDate?: string;
  lastRestockDate?: string;
  
  // Metadados
  updatedAt: string;
  notes?: string;
}

export type StockStatus = 
  | 'in_stock'      // Estoque OK
  | 'low_stock'     // Abaixo do mínimo
  | 'critical'      // Crítico (< 25% do mínimo)
  | 'out_of_stock'  // Sem estoque
  | 'overstocked'   // Excesso de estoque
  | 'incoming';     // Estoque chegando

// ============================================
// PRODUTO COM ESTOQUE DETALHADO
// ============================================

export interface ProductStockSummary {
  productId: string;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  categoryName?: string;
  supplierName?: string;
  
  // Totais agregados
  totalCurrentStock: number;
  totalMinStock: number;
  totalReservedStock: number;
  totalInTransitStock: number;
  totalAvailableStock: number;
  
  // Status geral do produto
  overallStatus: StockStatus;
  
  // Contagens por status
  variantsInStock: number;
  variantsLowStock: number;
  variantsCritical: number;
  variantsOutOfStock: number;
  
  // Total de variações
  totalVariants: number;
  
  // Variações detalhadas
  variants: VariantStock[];
  
  // Cores únicas disponíveis
  availableColors: ColorStockInfo[];
  
  // Previsões
  nextRestockDate?: string;
  daysUntilFullStockout?: number;
}

export interface ColorStockInfo {
  colorId?: string;
  colorName: string;
  colorHex?: string;
  totalStock: number;
  availableStock: number;
  status: StockStatus;
  variants: VariantStock[];
}

// ============================================
// ESTOQUE FUTURO / PREVISÃO
// ============================================

export interface FutureStockEntry {
  id: string;
  productId: string;
  productName?: string;
  productSku?: string;
  variantId?: string;
  colorName?: string;
  
  // Quantidade esperada
  expectedQuantity: number;
  
  // Datas
  expectedDate: string;
  orderDate?: string;
  
  // Origem
  source: 'purchase_order' | 'production' | 'transfer' | 'manual';
  sourceReference?: string; // ID do pedido de compra, etc.
  
  // Status
  status: 'pending' | 'confirmed' | 'in_transit' | 'partial' | 'completed' | 'cancelled';
  
  // Fornecedor
  supplierId?: string;
  supplierName?: string;
  
  // Notas
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MOVIMENTAÇÕES DE ESTOQUE
// ============================================

export interface StockMovement {
  id: string;
  productId: string;
  variantId?: string;
  colorName?: string;
  
  // Tipo e quantidade
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  
  // Referência
  reason: string;
  reference?: string; // ID do pedido, nota fiscal, etc.
  referenceType?: 'order' | 'purchase' | 'adjustment' | 'transfer' | 'return';
  
  // Custo
  unitCost?: number;
  totalCost?: number;
  
  // Rastreamento
  createdAt: string;
  createdBy?: string;
  createdByName?: string;
}

export type StockMovementType = 
  | 'in'         // Entrada
  | 'out'        // Saída (venda)
  | 'adjustment' // Ajuste de inventário
  | 'transfer'   // Transferência entre locais
  | 'return'     // Devolução
  | 'reserved'   // Reserva para pedido
  | 'released';  // Liberação de reserva

// ============================================
// ALERTAS DE ESTOQUE
// ============================================

export interface StockAlert {
  id: string;
  type: StockAlertType;
  severity: 'info' | 'warning' | 'error';
  
  // Produto/Variação afetada
  productId: string;
  productName: string;
  productSku: string;
  variantId?: string;
  colorName?: string;
  
  // Mensagem
  title: string;
  message: string;
  
  // Dados
  currentStock: number;
  threshold: number;
  
  // Ação sugerida
  suggestedAction?: string;
  actionUrl?: string;
  
  // Metadados
  createdAt: string;
  dismissedAt?: string;
  dismissedBy?: string;
}

export type StockAlertType = 
  | 'out_of_stock'
  | 'critical'
  | 'low_stock'
  | 'restock_needed'
  | 'overstock'
  | 'incoming_delayed'
  | 'stockout_predicted';

// ============================================
// FILTROS E ORDENAÇÃO
// ============================================

export interface StockFilters {
  // Filtros de status
  status: StockStatus | 'all';
  
  // Filtros de produto
  productId?: string;
  categoryId?: string;
  supplierId?: string;
  
  // Filtros de cor/variação
  colorGroup?: string;
  colorName?: string;
  
  // Quantidade mínima necessária (smart filter)
  minQuantityNeeded?: number;
  
  // Busca
  search: string;
  
  // Ordenação
  sortBy: StockSortOption;
  sortDirection: 'asc' | 'desc';
  
  // Agrupamento
  groupBy: StockGroupOption;
  
  // Flags
  showOnlyWithVariants: boolean;
  showOnlyWithAlerts: boolean;
}

export type StockSortOption = 
  | 'name'
  | 'sku'
  | 'stock_quantity'
  | 'available_stock'
  | 'days_remaining'
  | 'color_name'
  | 'last_updated';

export type StockGroupOption = 
  | 'none'
  | 'product'
  | 'color'
  | 'color_group'
  | 'status'
  | 'category'
  | 'supplier';

export const defaultStockFilters: StockFilters = {
  status: 'all',
  search: '',
  sortBy: 'stock_quantity',
  sortDirection: 'asc',
  groupBy: 'product',
  showOnlyWithVariants: false,
  showOnlyWithAlerts: false,
};

// ============================================
// RESUMO GERAL DE ESTOQUE
// ============================================

export interface StockDashboardSummary {
  // Contagens
  totalProducts: number;
  totalVariants: number;
  totalColors: number;
  
  // Por status
  productsInStock: number;
  productsLowStock: number;
  productsCritical: number;
  productsOutOfStock: number;
  
  variantsInStock: number;
  variantsLowStock: number;
  variantsCritical: number;
  variantsOutOfStock: number;
  
  // Valores
  totalStockValue: number;
  totalAvailableValue: number;
  
  // Métricas
  averageDaysOfStock: number;
  stockTurnoverRate: number;
  
  // Alertas
  totalAlerts: number;
  criticalAlerts: number;
  
  // Estoque futuro
  incomingStockValue: number;
  nextRestockDate?: string;
}

// ============================================
// HELPERS DE CÁLCULO
// ============================================

export function calculateStockStatus(
  current: number, 
  min: number, 
  ...options: [max?: number, inTransit?: number, daysUntilStockout?: number]
): StockStatus {
  const [max, inTransit, daysUntilStockout] = options;
  if (current <= 0) return emptyStockStatus(inTransit);
  const predicted = predictedStockStatus(daysUntilStockout);
  return predicted ?? boundedStockStatus(current, min, max);
}

function emptyStockStatus(inTransit?: number): StockStatus {
  return inTransit && inTransit > 0 ? 'incoming' : 'out_of_stock';
}

function predictedStockStatus(days?: number): StockStatus | null {
  if (days !== undefined && days < 7) return 'critical';
  if (days !== undefined && days < 15) return 'low_stock';
  return null;
}

function boundedStockStatus(current: number, min: number, max?: number): StockStatus {
  if (current <= min * 0.25) return 'critical';
  if (current <= min) return 'low_stock';
  if (max && current > max * 1.5) return 'overstocked';
  return 'in_stock';
}

export function calculateDaysUntilStockout(
  currentStock: number, 
  avgDailySales: number = 2
): number | undefined {
  if (avgDailySales <= 0 || currentStock <= 0) return undefined;
  return Math.floor(currentStock / avgDailySales);
}

export function calculateAvailableStock(
  currentStock: number,
  reservedStock: number = 0
): number {
  return Math.max(0, currentStock - reservedStock);
}

interface VariantStatusCounts {
  inStock: number;
  lowStock: number;
  critical: number;
  outOfStock: number;
  incoming: number;
}

function countVariantStatuses(variants: VariantStock[]): VariantStatusCounts {
  const counts: VariantStatusCounts = { inStock: 0, lowStock: 0, critical: 0, outOfStock: 0, incoming: 0 };
  for (const variant of variants) {
    if (variant.status === 'in_stock') counts.inStock += 1;
    if (variant.status === 'low_stock') counts.lowStock += 1;
    if (variant.status === 'critical') counts.critical += 1;
    if (variant.status === 'out_of_stock') counts.outOfStock += 1;
    if (variant.status === 'incoming' || variant.inTransitStock > 0) counts.incoming += 1;
  }
  return counts;
}

function groupVariantsByColor(variants: VariantStock[]): Map<string, VariantStock[]> {
  const groups = new Map<string, VariantStock[]>();
  for (const variant of variants) {
    const key = variant.colorName || 'Sem cor';
    const group = groups.get(key) ?? [];
    group.push(variant);
    groups.set(key, group);
  }
  return groups;
}

function colorStockInfo(colorName: string, variants: VariantStock[]): ColorStockInfo {
  const totalStock = variants.reduce((sum, variant) => sum + variant.currentStock, 0);
  const availableStock = variants.reduce((sum, variant) => sum + variant.availableStock, 0);
  const minStock = variants.reduce((sum, variant) => sum + variant.minStock, 0);
  return {
    colorId: variants[0]?.colorId,
    colorName,
    colorHex: variants[0]?.colorHex,
    totalStock,
    availableStock,
    status: calculateStockStatus(totalStock, minStock),
    variants,
  };
}

function productOverallStatus(variantCount: number, totalStock: number, counts: VariantStatusCounts): StockStatus {
  if (variantCount === 0) return 'in_stock';
  if (hasIncomingShortage(totalStock, counts)) return 'incoming';
  if (counts.outOfStock === variantCount) return 'out_of_stock';
  if (counts.critical > 0 || counts.outOfStock > 0) return 'critical';
  return counts.lowStock > 0 ? 'low_stock' : 'in_stock';
}

function hasIncomingShortage(totalStock: number, counts: VariantStatusCounts): boolean {
  return counts.incoming > 0 && (counts.outOfStock > 0 || totalStock === 0);
}

export function aggregateVariantsToProduct(
  variants: VariantStock[]
): Omit<ProductStockSummary, 'productId' | 'productName' | 'productSku' | 'productImageUrl' | 'categoryName' | 'supplierName'> {
  const totalCurrentStock = variants.reduce((sum, v) => sum + v.currentStock, 0);
  const totalMinStock = variants.reduce((sum, v) => sum + v.minStock, 0);
  const totalReservedStock = variants.reduce((sum, v) => sum + v.reservedStock, 0);
  const totalInTransitStock = variants.reduce((sum, v) => sum + v.inTransitStock, 0);
  const totalAvailableStock = variants.reduce((sum, v) => sum + v.availableStock, 0);
  
  const counts = countVariantStatuses(variants);
  const availableColors = Array.from(groupVariantsByColor(variants).entries()).map(([name, colorVariants]) => colorStockInfo(name, colorVariants));
  const overallStatus = productOverallStatus(variants.length, totalCurrentStock, counts);
  
  return {
    totalCurrentStock,
    totalMinStock,
    totalReservedStock,
    totalInTransitStock,
    totalAvailableStock,
    overallStatus,
    variantsInStock: counts.inStock,
    variantsLowStock: counts.lowStock,
    variantsCritical: counts.critical,
    variantsOutOfStock: counts.outOfStock,
    totalVariants: variants.length,
    variants,
    availableColors,
  };
}
