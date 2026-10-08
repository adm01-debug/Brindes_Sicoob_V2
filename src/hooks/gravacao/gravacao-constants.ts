/**
 * Constantes e helpers do Sistema de Gravação
 * Extraído de useGravacaoV2.ts
 */

import type { TabelaPrecoOficial, FaixaPrecoOficial } from './gravacao-types';

// ============================================
// CONSTANTES
// ============================================

const LASER_TECHNIQUE_COLOR = 'bg-red-100 text-red-800';

export const TECHNIQUE_COLORS: Record<string, string> = {
  SERIGRAFIA: 'bg-blue-100 text-blue-800',
  SERITEX: 'bg-blue-100 text-blue-800',
  LASER: LASER_TECHNIQUE_COLOR,
  FIBER: LASER_TECHNIQUE_COLOR,
  LASER_CO2: LASER_TECHNIQUE_COLOR,
  CO2: LASER_TECHNIQUE_COLOR,
  LASER_UV: LASER_TECHNIQUE_COLOR,
  UV_DIGITAL: 'bg-purple-100 text-purple-800',
  DIGITAL: 'bg-purple-100 text-purple-800',
  TAMPOGRAFIA: 'bg-green-100 text-green-800',
  TAMPO: 'bg-green-100 text-green-800',
  BORDADO: 'bg-yellow-100 text-yellow-800',
  SUBLIMACAO: 'bg-pink-100 text-pink-800',
  SUBLI: 'bg-pink-100 text-pink-800',
  HOT_STAMPING: 'bg-orange-100 text-orange-800',
  STAMP: 'bg-orange-100 text-orange-800',
  TRANSFER_DIGITAL: 'bg-cyan-100 text-cyan-800',
  DTF: 'bg-cyan-100 text-cyan-800',
  ADESIVO: 'bg-indigo-100 text-indigo-800',
  DOMING: 'bg-indigo-100 text-indigo-800',
  ETIQUETA: 'bg-gray-100 text-gray-800',
  HEAT_TRANSFER: 'bg-rose-100 text-rose-800',
  FILME_RECORTE: 'bg-teal-100 text-teal-800',
  DECALQUE: 'bg-amber-100 text-amber-800',
  EMBORRACHADO: 'bg-lime-100 text-lime-800',
};

export const TECHNIQUE_ICONS: Record<string, string> = {
  SERIGRAFIA: '🖌️',
  SERITEX: '🖌️',
  LASER: '⚡',
  FIBER: '⚡',
  LASER_CO2: '⚡',
  CO2: '⚡',
  LASER_UV: '⚡',
  UV_DIGITAL: '🎨',
  DIGITAL: '🎨',
  TAMPOGRAFIA: '📘',
  TAMPO: '📘',
  BORDADO: '🧵',
  SUBLIMACAO: '🌈',
  SUBLI: '🌈',
  HOT_STAMPING: '✨',
  STAMP: '✨',
  TRANSFER_DIGITAL: '📋',
  DTF: '📋',
  ADESIVO: '🏷️',
  DOMING: '🏷️',
  ETIQUETA: '🏷️',
  HEAT_TRANSFER: '🔥',
  FILME_RECORTE: '✂️',
  DECALQUE: '🔥',
  EMBORRACHADO: '🔲',
};

export const AREA_SHAPES = {
  rectangle: 'Retângulo',
  circle: 'Círculo',
  oval: 'Oval',
  triangle: 'Triângulo',
  custom: 'Customizado',
} as const;

export const QUANTITY_TIERS_REFERENCE = [
  { min: 1, max: 9, label: '1-9 un' },
  { min: 10, max: 24, label: '10-24 un' },
  { min: 25, max: 49, label: '25-49 un' },
  { min: 50, max: 99, label: '50-99 un' },
  { min: 100, max: 249, label: '100-249 un' },
  { min: 250, max: 499, label: '250-499 un' },
  { min: 500, max: 999, label: '500-999 un' },
  { min: 1000, max: null, label: '1000+ un' },
];

// ============================================
// HELPERS
// ============================================

function matchByPrefix(codigo: string, map: Record<string, string>): string | undefined {
  const prefix = codigo.split('-')[0]?.split('_')[0]?.toUpperCase();
  return prefix ? map[prefix] : undefined;
}

export function getTechniqueColor(codigo: string): string {
  return TECHNIQUE_COLORS[codigo] || matchByPrefix(codigo, TECHNIQUE_COLORS) || 'bg-gray-100 text-gray-800';
}

export function getTechniqueIcon(codigo: string): string {
  return TECHNIQUE_ICONS[codigo] || matchByPrefix(codigo, TECHNIQUE_ICONS) || '🔧';
}

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// ============================================
// CALCULATORS
// ============================================

export function calculateTotalWithColorDiscount(
  basePrice: number, numCores: number, tabela: TabelaPrecoOficial
): number {
  if (!tabela.cobra_por_cor || numCores <= 1) return basePrice;
  let discount = 0;
  if (numCores === 2 && tabela.desconto_segunda_cor) discount = tabela.desconto_segunda_cor;
  else if (numCores === 3 && tabela.desconto_terceira_cor) discount = tabela.desconto_terceira_cor;
  else if (numCores >= 4 && tabela.desconto_quarta_cor_mais) discount = tabela.desconto_quarta_cor_mais;
  return basePrice * (1 - discount) * numCores;
}

export function calculateSetupCost(numCores: number, tabela: TabelaPrecoOficial): number {
  if (!tabela.custo_setup) return 0;
  return tabela.custo_setup_por_cor ? tabela.custo_setup * numCores : tabela.custo_setup;
}

export function findPriceTier(quantidade: number, faixas: FaixaPrecoOficial[]): FaixaPrecoOficial | null {
  for (const faixa of faixas) {
    if (quantidade >= faixa.quantidade_minima && (faixa.quantidade_maxima === null || quantidade <= faixa.quantidade_maxima)) {
      return faixa;
    }
  }
  return faixas[faixas.length - 1] ?? null;
}

export function calculateCustomizationTotal(
  quantidade: number, numCores: number, tabela: TabelaPrecoOficial,
  ...pricing: [faixas: FaixaPrecoOficial[], markupPercent?: number]
) {
  const [faixas, markupPercent = 115] = pricing;
  const faixa = findPriceTier(quantidade, faixas);
  const markupMultiplier = 1 + (markupPercent / 100);

  if (!faixa) {
    return {
      faixa: null, custoUnitarioBase: 0, custoUnitarioTotal: 0, custoSetup: 0,
      custoManuseio: 0, custoTotalPecas: 0, precoUnitario: 0, precoMinimoUnitario: 0,
      subtotalPecas: 0, faturamentoMinimoGravacao: tabela.faturamento_minimo || 0,
      minimumApplied: false, total: 0, margemPercent: 0, prazoDias: null as number | null,
    };
  }

  const custoUnitarioBase = faixa.preco_unitario;
  const custoUnitarioTotal = calculateTotalWithColorDiscount(custoUnitarioBase, numCores, tabela);
  const custoSetup = calculateSetupCost(numCores, tabela);
  const custoManuseio = tabela.custo_manuseio_por_peca
    ? (tabela.custo_manuseio || 0) * quantidade
    : (tabela.custo_manuseio || 0);
  const custoTotalPecas = custoUnitarioTotal * quantidade;

  let precoUnitario = custoUnitarioTotal * markupMultiplier;
  const precoMinimoUnitario = 1.00;
  if (precoUnitario < precoMinimoUnitario) precoUnitario = precoMinimoUnitario;

  const subtotalPecas = precoUnitario * quantidade;
  const faturamentoMinimoGravacao = custoSetup * markupMultiplier;

  const minimumApplied = subtotalPecas < faturamentoMinimoGravacao;
  const total = minimumApplied ? faturamentoMinimoGravacao : subtotalPecas;

  const custoTotal = custoTotalPecas + custoManuseio;
  const margemPercent = custoTotal > 0 ? ((total - custoTotal) / custoTotal) * 100 : 0;

  return {
    faixa, custoUnitarioBase, custoUnitarioTotal, custoSetup, custoManuseio,
    custoTotalPecas, precoUnitario, precoMinimoUnitario, subtotalPecas,
    faturamentoMinimoGravacao, minimumApplied, total, margemPercent,
    prazoDias: faixa.prazo_dias,
  };
}
