/**
 * Domain Validators: Personalização
 * 
 * Funções puras para validação de parâmetros de personalização.
 */

import type {
  PriceTableInput,
  TechniqueInput,
  PriceCalculationParams,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types';

interface ValidationCollector {
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function validationResult(collector: ValidationCollector): ValidationResult {
  return { isValid: collector.errors.length === 0, ...collector };
}

function validateTableQuantity(table: PriceTableInput, quantity: number, collector: ValidationCollector): void {
  if (quantity <= 0) {
    collector.errors.push({ code: 'INVALID_QUANTITY', field: 'quantity', message: 'Quantidade deve ser maior que zero' });
  }
  const minQuantity = table.tiers.length > 0 ? Math.min(...table.tiers.map(tier => tier.minQuantity)) : 1;
  if (quantity < minQuantity) {
    collector.errors.push({ code: 'BELOW_MIN_QUANTITY', field: 'quantity', message: `Quantidade mínima é ${minQuantity} unidades` });
  }
}

function validateTableColors(table: PriceTableInput, colors: number | undefined, collector: ValidationCollector): void {
  if (!table.priceByColor || colors === undefined) return;
  if (colors <= 0) {
    collector.errors.push({ code: 'INVALID_COLORS', field: 'colors', message: 'Número de cores deve ser maior que zero' });
  }
  if (table.maxColors && colors > table.maxColors) {
    collector.warnings.push({ code: 'EXCEEDS_MAX_COLORS', field: 'colors', message: `Número de cores (${colors}) excede máximo da tabela (${table.maxColors}). Preço será ajustado proporcionalmente.` });
  }
}

function validateTableDimensionValues(table: PriceTableInput, params: PriceCalculationParams, collector: ValidationCollector): void {
  validateWidth(table, params.widthCm, collector);
  validateHeight(table, params.heightCm, collector);
}

function validateWidth(table: PriceTableInput, widthCm: number | undefined, collector: ValidationCollector): void {
  if (widthCm !== undefined && widthCm <= 0) {
    collector.errors.push({ code: 'INVALID_WIDTH', field: 'widthCm', message: 'Largura deve ser maior que zero' });
  }
  if (widthCm && table.maxWidthCm && widthCm > table.maxWidthCm) {
    collector.warnings.push({ code: 'EXCEEDS_MAX_WIDTH', field: 'widthCm', message: `Largura (${widthCm}cm) excede máximo (${table.maxWidthCm}cm)` });
  }
}

function validateHeight(table: PriceTableInput, heightCm: number | undefined, collector: ValidationCollector): void {
  if (heightCm !== undefined && heightCm <= 0) {
    collector.errors.push({ code: 'INVALID_HEIGHT', field: 'heightCm', message: 'Altura deve ser maior que zero' });
  }
  if (heightCm && table.maxHeightCm && heightCm > table.maxHeightCm) {
    collector.warnings.push({ code: 'EXCEEDS_MAX_HEIGHT', field: 'heightCm', message: `Altura (${heightCm}cm) excede máximo (${table.maxHeightCm}cm)` });
  }
}

function validateAreaBounds(
  areaCm2: number,
  bounds: { minAreaCm2?: number | null; maxAreaCm2?: number | null },
  collector: ValidationCollector,
): void {
  if (bounds.minAreaCm2 && areaCm2 < bounds.minAreaCm2) {
    collector.errors.push({ code: 'BELOW_MIN_AREA', field: 'area', message: `Área (${areaCm2}cm²) abaixo do mínimo (${bounds.minAreaCm2}cm²)` });
  }
  if (bounds.maxAreaCm2 && areaCm2 > bounds.maxAreaCm2) {
    collector.warnings.push({ code: 'EXCEEDS_MAX_AREA', field: 'area', message: `Área (${areaCm2}cm²) excede máximo (${bounds.maxAreaCm2}cm²). Preço será ajustado.` });
  }
}

function validateTableDimensions(table: PriceTableInput, params: PriceCalculationParams, collector: ValidationCollector): void {
  if (!table.priceByArea) return;
  validateTableDimensionValues(table, params, collector);
  if (params.widthCm && params.heightCm) validateAreaBounds(params.widthCm * params.heightCm, table, collector);
}

// ============================================
// TABLE VALIDATION
// ============================================

/**
 * Valida se uma tabela de preço pode ser usada com os parâmetros dados
 */
export function validateTableForParams(
  table: PriceTableInput,
  params: PriceCalculationParams
): ValidationResult {
  const collector: ValidationCollector = { errors: [], warnings: [] };
  validateTableQuantity(table, params.quantity, collector);
  validateTableColors(table, params.colors, collector);
  validateTableDimensions(table, params, collector);
  return validationResult(collector);
}

function validateTechniqueStatus(technique: TechniqueInput, collector: ValidationCollector): void {
  if (!technique.isActive) collector.errors.push({ code: 'TECHNIQUE_INACTIVE', field: 'technique', message: 'Técnica não está ativa' });
}

function validateTechniqueColors(technique: TechniqueInput, colors: number | undefined, collector: ValidationCollector): void {
  if (!technique.requiresColors) return;
  if (colors === undefined || colors === null) {
    collector.errors.push({ code: 'COLORS_REQUIRED', field: 'colors', message: 'Esta técnica requer especificação de cores' });
    return;
  }
  if (colors < technique.minColors) {
    collector.errors.push({ code: 'BELOW_MIN_COLORS', field: 'colors', message: `Mínimo de ${technique.minColors} cor(es) requerido` });
  }
  if (colors > technique.maxColors) {
    collector.warnings.push({ code: 'EXCEEDS_MAX_COLORS', field: 'colors', message: `Número de cores (${colors}) excede máximo (${technique.maxColors})` });
  }
}

function validateTechniqueArea(technique: TechniqueInput, params: PriceCalculationParams, collector: ValidationCollector): void {
  if (!technique.priceByArea || !params.widthCm || !params.heightCm) return;
  const areaCm2 = params.widthCm * params.heightCm;
  if (technique.minAreaCm2 && areaCm2 < technique.minAreaCm2) {
    collector.errors.push({ code: 'BELOW_MIN_AREA', field: 'area', message: `Área mínima é ${technique.minAreaCm2}cm²` });
  }
  if (technique.maxAreaCm2 && areaCm2 > technique.maxAreaCm2) {
    collector.warnings.push({ code: 'EXCEEDS_MAX_AREA', field: 'area', message: `Área (${areaCm2}cm²) excede máximo (${technique.maxAreaCm2}cm²)` });
  }
}

/**
 * Valida se uma técnica é compatível com os parâmetros solicitados
 */
export function validateTechniqueForParams(
  technique: TechniqueInput,
  params: PriceCalculationParams
): ValidationResult {
  const collector: ValidationCollector = { errors: [], warnings: [] };
  validateTechniqueStatus(technique, collector);
  validateTechniqueColors(technique, params.colors, collector);
  validateTechniqueArea(technique, params, collector);
  return validationResult(collector);
}

// ============================================
// QUANTITY VALIDATION
// ============================================

/**
 * Valida se quantidade é válida para um conjunto de faixas
 */
export function validateQuantityRange(
  quantity: number,
  minQuantity: number,
  maxQuantity?: number | null
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (quantity <= 0) {
    errors.push({
      code: 'INVALID_QUANTITY',
      field: 'quantity',
      message: 'Quantidade deve ser maior que zero',
    });
  }
  
  if (quantity < minQuantity) {
    errors.push({
      code: 'BELOW_MIN_QUANTITY',
      field: 'quantity',
      message: `Quantidade mínima é ${minQuantity}`,
    });
  }
  
  if (maxQuantity && quantity > maxQuantity) {
    warnings.push({
      code: 'EXCEEDS_MAX_QUANTITY',
      field: 'quantity',
      message: `Quantidade (${quantity}) excede máximo usual (${maxQuantity})`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida quantidade simples (para serviços)
 */
export function validateQuantity(quantity: number): ValidationResult {
  return validateQuantityRange(quantity, 1);
}

/**
 * Valida número de cores
 */
export function validateColors(colors: number, maxColors?: number): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (colors <= 0) {
    errors.push({
      code: 'INVALID_COLORS',
      field: 'colors',
      message: 'Número de cores deve ser maior que zero',
    });
  }
  
  if (maxColors && colors > maxColors) {
    warnings.push({
      code: 'EXCEEDS_MAX_COLORS',
      field: 'colors',
      message: `Número de cores (${colors}) excede máximo (${maxColors})`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Valida dimensões de área
 */
export function validateArea(
  widthCm: number,
  heightCm: number,
  maxWidthCm?: number,
  maxHeightCm?: number
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  if (widthCm <= 0) {
    errors.push({
      code: 'INVALID_WIDTH',
      field: 'widthCm',
      message: 'Largura deve ser maior que zero',
    });
  }
  
  if (heightCm <= 0) {
    errors.push({
      code: 'INVALID_HEIGHT',
      field: 'heightCm',
      message: 'Altura deve ser maior que zero',
    });
  }
  
  if (maxWidthCm && widthCm > maxWidthCm) {
    warnings.push({
      code: 'EXCEEDS_MAX_WIDTH',
      field: 'widthCm',
      message: `Largura (${widthCm}cm) excede máximo (${maxWidthCm}cm)`,
    });
  }
  
  if (maxHeightCm && heightCm > maxHeightCm) {
    warnings.push({
      code: 'EXCEEDS_MAX_HEIGHT',
      field: 'heightCm',
      message: `Altura (${heightCm}cm) excede máximo (${maxHeightCm}cm)`,
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================
// BUSINESS RULES
// ============================================

/**
 * Verifica se precisa de setup (primeira gravação ou novo cliente)
 */
export function requiresSetup(
  isFirstOrder: boolean,
  hasExistingMatrix: boolean
): boolean {
  // Cobra setup apenas se não tiver matriz existente
  return isFirstOrder || !hasExistingMatrix;
}

/**
 * Calcula custo de manuseio baseado na complexidade
 */
export function calculateHandlingCost(
  baseHandling: number,
  positions: number,
  isFragile: boolean
): number {
  let cost = baseHandling;
  
  // Múltiplas posições aumenta manuseio
  if (positions > 1) {
    cost *= 1 + (positions - 1) * 0.25; // +25% por posição adicional
  }
  
  // Produtos frágeis dobram manuseio
  if (isFragile) {
    cost *= 2;
  }
  
  return Math.round(cost * 100) / 100;
}
