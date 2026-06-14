// Barrel export para hooks de Gravação
export { useTecnicasGravacao, useTecnicaGravacao } from './useTecnicasGravacao';
export { useVariantesGravacao } from './useVariantesGravacao';
export { useFornecedoresGravacao } from './useFornecedoresGravacao';

// ============================================
// SISTEMA DE PREÇOS v2 - ARQUITETURA OFICIAL
// Implementado em 02/02/2026
// ============================================
export {
  // Hooks principais v2
  useProductPrintAreas,
  useTabelasPrecoOficial,
  useFaixasPrecoOficial,
  useCustomizationPriceLegacy,
  useTabelaPrecoPorCodigo,
  // Tipos v2
  type TabelaPrecoOficial,
  type FaixaPrecoOficial,
  type CustomizationPriceV2,
  type PrintAreaWithTechniques,
  // Constantes e helpers
  TECHNIQUE_COLORS,
  TECHNIQUE_ICONS,
  AREA_SHAPES,
  QUANTITY_TIERS_REFERENCE,
  getTechniqueColor,
  getTechniqueIcon,
  formatPrice,
  calculateTotalWithColorDiscount,
  calculateSetupCost,
  findPriceTier,
  calculateCustomizationTotal,
} from '../useGravacaoV2';
