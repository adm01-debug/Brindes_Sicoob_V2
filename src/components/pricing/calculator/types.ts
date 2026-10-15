/**
 * Types for QuantityPriceCalculator module.
 */

export interface CalcProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  images: string[];
  category_name: string | null;
}

export interface ProductTechnique {
  id: string;
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  componentName: string;
  locationName: string;
  locationCode: string;
  composedCode: string;
  maxWidth: number | null;
  maxHeight: number | null;
  maxArea: number | null;
  maxColors: number | null;
  isDefault: boolean;
}

export interface SelectedTechniqueConfig {
  technique: ProductTechnique;
  colors: number;
  sizeOption: string;
  sizeModifier: number;
}

export function isPriceConfigurationSupported(config: SelectedTechniqueConfig): boolean {
  // A tabela do banco calcula preço por técnica e tiragem; cores adicionais e
  // área variável ainda não fazem parte desse contrato de preço.
  return config.colors === 1 && config.sizeOption === 'standard';
}

export const availableSizes = [
  { label: 'Pequeno (até 5cm²)', value: 'small', modifier: 0.8 },
  { label: 'Padrão (até 20cm²)', value: 'standard', modifier: 1 },
  { label: 'Grande (até 50cm²)', value: 'large', modifier: 1.3 },
  { label: 'Extra Grande (50cm²+)', value: 'xlarge', modifier: 1.6 },
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}
