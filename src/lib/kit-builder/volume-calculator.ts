/**
 * Kit Builder - Volume Calculator
 * Utilitários para cálculo e validação de volume
 */

import type { KitBox, KitItem, CompatibilityResult } from './types';

// ============================================
// CONSTANTES
// ============================================

// Fator de folga para empacotamento (itens não ocupam 100% do volume)
const PACKING_EFFICIENCY = 0.75; // 75% de eficiência

// Limite de alerta de volume
const VOLUME_WARNING_THRESHOLD = 0.85; // 85%

// ============================================
// CÁLCULOS BÁSICOS
// ============================================

/**
 * Calcula o volume de um objeto em cm³
 */
export function calculateVolume(width: number, height: number, depth: number): number {
  return width * height * depth;
}

/**
 * Calcula o volume utilizável de uma caixa (com fator de eficiência)
 */
export function calculateUsableVolume(box: KitBox): number {
  return box.internalVolume * PACKING_EFFICIENCY;
}

/**
 * Calcula o volume total dos itens
 */
export function calculateTotalItemsVolume(items: KitItem[]): number {
  return items.reduce((total, item) => total + (item.volume * item.quantity), 0);
}

/**
 * Calcula a porcentagem de volume utilizado
 */
export function calculateVolumeUsagePercent(
  itemsVolume: number,
  boxVolume: number
): number {
  if (boxVolume === 0) return 0;
  const usableVolume = boxVolume * PACKING_EFFICIENCY;
  return (itemsVolume / usableVolume) * 100;
}

// ============================================
// VALIDAÇÕES
// ============================================

/**
 * Verifica se um item cabe na caixa considerando os itens existentes
 */
export function checkItemFits(
  item: KitItem,
  box: KitBox,
  existingItems: KitItem[],
  quantity: number = 1
): CompatibilityResult {
  const currentVolume = calculateTotalItemsVolume(existingItems);
  const itemVolume = item.volume * quantity;
  const totalVolumeAfter = currentVolume + itemVolume;
  const usableVolume = calculateUsableVolume(box);
  
  const percentAfterAdd = (totalVolumeAfter / usableVolume) * 100;

  // Verifica se o item cabe em alguma das 6 orientações possíveis
  const itemDims = [item.width, item.height, item.depth].sort((a, b) => a - b);
  const boxDims = [box.internalWidth, box.internalHeight, box.internalDepth].sort((a, b) => a - b);

  // Se as dimensões ordenadas do item excedem as da caixa, não cabe em nenhuma orientação
  const fitsAnyOrientation = itemDims.every((dimension, index) => (
    dimension <= (boxDims[index] ?? 0)
  ));

  if (!fitsAnyOrientation) {
    return {
      fits: false,
      reason: `Dimensões do item (${item.width}×${item.height}×${item.depth}cm) não cabem na caixa (${box.internalWidth}×${box.internalHeight}×${box.internalDepth}cm) em nenhuma orientação`,
    };
  }

  // Verifica volume total
  if (totalVolumeAfter > usableVolume) {
    return {
      fits: false,
      reason: `Volume total excederá a capacidade da caixa (${Math.round(percentAfterAdd)}% > 100%)`,
      volumeAfterAdd: totalVolumeAfter,
      percentAfterAdd,
    };
  }

  return {
    fits: true,
    volumeAfterAdd: totalVolumeAfter,
    percentAfterAdd,
  };
}

/**
 * Verifica se a caixa está no limite de alerta
 */
export function isNearCapacity(usagePercent: number): boolean {
  return usagePercent >= VOLUME_WARNING_THRESHOLD * 100;
}

/**
 * Verifica se a caixa está cheia
 */
export function isAtCapacity(usagePercent: number): boolean {
  return usagePercent >= 100;
}

// ============================================
// FORMATAÇÃO
// ============================================

/**
 * Formata volume para exibição
 */
export function formatVolume(volumeCm3: number): string {
  if (volumeCm3 >= 1000) {
    return `${(volumeCm3 / 1000).toFixed(1)}L`;
  }
  return `${Math.round(volumeCm3)}cm³`;
}

/**
 * Formata dimensões para exibição
 */
export function formatDimensions(width: number, height: number, depth: number): string {
  return `${width} × ${height} × ${depth} cm`;
}

/**
 * Retorna cor baseada na porcentagem de uso
 */
export function getVolumeStatusColor(percent: number): 'success' | 'warning' | 'destructive' {
  if (percent >= 100) return 'destructive';
  if (percent >= 85) return 'warning';
  return 'success';
}

/**
 * Retorna label baseado na porcentagem de uso
 */
export function getVolumeStatusLabel(percent: number): string {
  if (percent >= 100) return 'Cheio';
  if (percent >= 85) return 'Quase cheio';
  if (percent >= 50) return 'Bom uso';
  if (percent > 0) return 'Espaço disponível';
  return 'Vazio';
}

// ============================================
// PARSING DE DIMENSÕES
// ============================================

/**
 * Tenta extrair dimensões de uma string de dimensões
 * Formatos suportados: "10x20x5", "10 x 20 x 5", "10×20×5"
 */
export function parseDimensionsString(
  dimensionsStr: string | null | undefined
): { width: number; height: number; depth: number } | null {
  if (!dimensionsStr) return null;

  // Remove espaços extras e normaliza separadores
  const normalized = dimensionsStr
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/×/g, 'x')
    .replace(/cm/g, '');

  // Tenta match com padrão NxNxN
  const match = normalized.match(/(\d+(?:\.\d+)?)[x×](\d+(?:\.\d+)?)[x×](\d+(?:\.\d+)?)/);
  
  if (match) {
    const [, w, h, d] = match;
    return {
      width: parseFloat(w ?? "0"),
      height: parseFloat(h ?? "0"),
      depth: parseFloat(d ?? "0"),
    };
  }

  return null;
}

/**
 * Extrai dimensões de um produto externo
 */
export function extractProductDimensions(
  product: {
    dimensions?: string | { width_cm?: number; height_cm?: number; length_cm?: number; diameter_cm?: number } | null;
    width_cm?: number | null;
    height_cm?: number | null;
    length_cm?: number | null;
    box_length_cm?: number | null;
    box_width_cm?: number | null;
    box_height_cm?: number | null;
    internal_length_cm?: number | null;
    internal_width_cm?: number | null;
    internal_height_cm?: number | null;
  }
): { width: number; height: number; depth: number } | null {
  const internal = completeDimensions(product.internal_width_cm, product.internal_height_cm, product.internal_length_cm);
  if (internal) return internal;
  const box = completeDimensions(product.box_width_cm, product.box_height_cm, product.box_length_cm);
  if (box) return box;
  const direct = completeDimensions(product.width_cm, product.height_cm, product.length_cm);
  if (direct) return direct;

  const structured = structuredDimensions(product.dimensions);
  if (structured) return structured;

  // Por fim tenta parsear string de dimensões
  if (typeof product.dimensions === 'string') {
    return parseDimensionsString(product.dimensions);
  }

  return null;
}

function structuredDimensions(
  dimensions: string | { width_cm?: number; height_cm?: number; length_cm?: number; diameter_cm?: number } | null | undefined,
): { width: number; height: number; depth: number } | null {
  if (!dimensions || typeof dimensions !== 'object') return null;
  const complete = completeDimensions(dimensions.width_cm, dimensions.height_cm, dimensions.length_cm);
  if (complete) return complete;
  if (!dimensions.width_cm || !dimensions.height_cm) return null;
  return {
    width: dimensions.width_cm,
    height: dimensions.height_cm,
    depth: dimensions.length_cm || Math.min(dimensions.width_cm, dimensions.height_cm) * 0.5,
  };
}

function completeDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
  depth: number | null | undefined,
): { width: number; height: number; depth: number } | null {
  if (!width || !height || !depth) return null;
  return { width, height, depth };
}

// ============================================
// ESTIMATIVAS
// ============================================

/**
 * Estima dimensões padrão baseado na categoria do produto
 */
export function estimateDefaultDimensions(
  category?: string
): { width: number; height: number; depth: number } {
  const categoryLower = (category || '').toLowerCase();
  const estimates = [
    { keywords: ['caneta', 'pen'], dimensions: { width: 1.5, height: 15, depth: 1.5 } },
    { keywords: ['caderno', 'agenda'], dimensions: { width: 15, height: 21, depth: 2 } },
    { keywords: ['garrafa', 'squeeze'], dimensions: { width: 7, height: 25, depth: 7 } },
    { keywords: ['copo', 'caneca'], dimensions: { width: 10, height: 12, depth: 10 } },
    { keywords: ['mochila', 'bolsa'], dimensions: { width: 30, height: 40, depth: 15 } },
    { keywords: ['necessaire'], dimensions: { width: 20, height: 12, depth: 8 } },
    { keywords: ['guarda-chuva', 'sombrinha'], dimensions: { width: 5, height: 60, depth: 5 } },
    { keywords: ['power bank', 'carregador'], dimensions: { width: 7, height: 14, depth: 2 } },
  ];
  const match = estimates.find((estimate) => estimate.keywords.some((keyword) => categoryLower.includes(keyword)));
  return match?.dimensions ?? { width: 10, height: 10, depth: 5 };
}
