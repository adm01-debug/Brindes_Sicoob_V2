/**
 * useProductMatch — Finds matching products based on category, tags, nicho, and complementary relationships.
 * 
 * Scoring:
 * - Same category: +30
 * - Shared tags (público, datas, endomarketing): +10 each
 * - Shared nicho/ramo: +15 each
 * - Same supplier: +5
 * - Complementary name keywords: +20
 */
import { useMemo } from 'react';
import type { Product } from '@/types/product-catalog';

export interface MatchResult {
  product: Product;
  score: number;
  reasons: string[];
  matchType: 'identical' | 'similar' | 'complementary';
}

// Complementary product keyword pairs (Portuguese)
const COMPLEMENTARY_PAIRS: [string[], string[]][] = [
  [['tábua', 'tabua'], ['faca', 'garfo', 'espeto', 'pegador']],
  [['caneta'], ['caderno', 'agenda', 'bloco', 'estojo']],
  [['garrafa', 'squeeze', 'copo'], ['canudo', 'tampa', 'abridor']],
  [['mochila', 'bolsa', 'mala'], ['necessaire', 'estojo', 'porta']],
  [['camiseta', 'camisa'], ['boné', 'bone', 'chapéu']],
  [['mouse', 'teclado'], ['mousepad', 'hub', 'suporte']],
  [['carregador', 'powerbank'], ['cabo', 'adaptador']],
  [['vinho', 'cerveja'], ['abridor', 'saca-rolha', 'taça', 'copo']],
  [['churrasco'], ['avental', 'tábua', 'tabua', 'faca', 'espeto', 'pegador', 'grelha']],
  [['café', 'cafe'], ['xícara', 'caneca', 'copo', 'coador']],
  [['toalha'], ['roupão', 'chinelo', 'necessaire']],
  [['cadeira'], ['almofada', 'encosto', 'apoio']],
];

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findComplementaryKeywords(name: string): string[] {
  const normalized = normalizeText(name);
  const complements: string[] = [];

  for (const [groupA, groupB] of COMPLEMENTARY_PAIRS) {
    if (groupA.some(kw => normalized.includes(normalizeText(kw)))) {
      complements.push(...groupB);
    }
    if (groupB.some(kw => normalized.includes(normalizeText(kw)))) {
      complements.push(...groupA);
    }
  }
  return complements;
}

interface ScorePart {
  score: number;
  reasons: string[];
}

function categoryScore(source: Product, candidate: Product): ScorePart {
  const matches = source.category_id && candidate.category_id && source.category_id === candidate.category_id;
  return matches ? { score: 30, reasons: ['Mesma categoria'] } : { score: 0, reasons: [] };
}

function normalizedTags(product: Product, key: keyof Product['tags']): string[] {
  return (product.tags?.[key] || []).map((tag) => tag.trim().toLowerCase());
}

function sharedValues(left: string[], right: string[]): string[] {
  return left.filter((value) => value && right.includes(value));
}

function tagScore(source: Product, candidate: Product): ScorePart {
  const labels: Record<string, string> = {
    publicoAlvo: 'Público-alvo',
    datasComemorativas: 'Data comemorativa',
    endomarketing: 'Endomarketing',
  };
  const categories: (keyof Product['tags'])[] = ['publicoAlvo', 'datasComemorativas', 'endomarketing'];
  const matches = categories.flatMap((category) => {
    const shared = sharedValues(normalizedTags(source, category), normalizedTags(candidate, category));
    return shared.length ? [{ category, shared }] : [];
  });
  return {
    score: matches.reduce((total, match) => total + (10 * match.shared.length), 0),
    reasons: matches.map((match) => `${labels[match.category]}: ${match.shared.join(', ')}`),
  };
}

function nicheValues(product: Product): string[] {
  return [...normalizedTags(product, 'nicho'), ...normalizedTags(product, 'ramo')];
}

function nicheScore(source: Product, candidate: Product): ScorePart {
  const shared = sharedValues(nicheValues(source), nicheValues(candidate));
  return shared.length
    ? { score: 15 * shared.length, reasons: [`Nicho: ${shared.join(', ')}`] }
    : { score: 0, reasons: [] };
}

function supplierScore(source: Product, candidate: Product): ScorePart {
  const matches = source.supplier?.id && candidate.supplier?.id && source.supplier.id === candidate.supplier.id;
  return matches ? { score: 5, reasons: ['Mesmo fornecedor'] } : { score: 0, reasons: [] };
}

function complementaryScore(source: Product, candidate: Product): ScorePart {
  const candidateName = normalizeText(candidate.name);
  const sourceName = normalizeText(source.name);
  const matches = findComplementaryKeywords(source.name).filter((keyword) => {
    const normalized = normalizeText(keyword);
    return candidateName.includes(normalized) && !sourceName.includes(normalized);
  });
  return matches.length
    ? { score: 20 * matches.length, reasons: [`Complementar: ${matches.join(', ')}`] }
    : { score: 0, reasons: [] };
}

function calculateMatchScore(source: Product, candidate: Product): { score: number; reasons: string[] } {
  const parts = [
    categoryScore(source, candidate),
    tagScore(source, candidate),
    nicheScore(source, candidate),
    supplierScore(source, candidate),
    complementaryScore(source, candidate),
  ];
  return {
    score: parts.reduce((total, part) => total + part.score, 0),
    reasons: parts.flatMap((part) => part.reasons),
  };
}

function getMatchType(score: number, isSameCategory: boolean, hasComplementary: boolean): MatchResult['matchType'] {
  if (hasComplementary) return 'complementary';
  if (isSameCategory && score >= 40) return 'identical';
  return 'similar';
}

export interface MatchFilters {
  minScore: number;
  matchTypes: MatchResult['matchType'][];
  categoryFilter?: string;
  supplierFilter?: string;
  onlyInStock: boolean;
}

const DEFAULT_FILTERS: MatchFilters = {
  minScore: 10,
  matchTypes: ['identical', 'similar', 'complementary'],
  onlyInStock: false,
};

function passesMatchFilters(candidate: Product, source: Product, filters: MatchFilters): boolean {
  if (candidate.id === source.id) return false;
  if (filters.onlyInStock && candidate.stockStatus === 'out-of-stock') return false;
  if (filters.categoryFilter && candidate.category?.name !== filters.categoryFilter) return false;
  if (filters.supplierFilter && candidate.supplier?.name !== filters.supplierFilter) return false;
  return true;
}

function matchCandidate(candidate: Product, source: Product, filters: MatchFilters): MatchResult | null {
  if (!passesMatchFilters(candidate, source, filters)) return null;
  const { score, reasons } = calculateMatchScore(source, candidate);
  if (score < filters.minScore) return null;
  const matchType = getMatchType(
    score,
    source.category_id === candidate.category_id,
    reasons.some((reason) => reason.startsWith('Complementar')),
  );
  return filters.matchTypes.includes(matchType) ? { product: candidate, score, reasons, matchType } : null;
}

export function useProductMatch(
  sourceProduct: Product | null,
  allProducts: Product[],
  filters: Partial<MatchFilters> = {}
): { matches: MatchResult[]; isProcessing: boolean } {
  const mergedFilters = useMemo<MatchFilters>(() => ({
    minScore: filters.minScore ?? DEFAULT_FILTERS.minScore,
    matchTypes: filters.matchTypes ?? DEFAULT_FILTERS.matchTypes,
    categoryFilter: filters.categoryFilter,
    supplierFilter: filters.supplierFilter,
    onlyInStock: filters.onlyInStock ?? DEFAULT_FILTERS.onlyInStock,
  }), [
    filters.categoryFilter,
    filters.matchTypes,
    filters.minScore,
    filters.onlyInStock,
    filters.supplierFilter,
  ]);

  const matches = useMemo(() => {
    if (!sourceProduct || allProducts.length === 0) return [];

    return allProducts
      .map((candidate) => matchCandidate(candidate, sourceProduct, mergedFilters))
      .filter((match): match is MatchResult => match !== null)
      .sort((left, right) => right.score - left.score);
  }, [sourceProduct, allProducts, mergedFilters]);

  return { matches, isProcessing: false };
}
