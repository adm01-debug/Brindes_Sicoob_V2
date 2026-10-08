/**
 * Domain Selectors: Personalização
 * 
 * Funções puras para seleção e filtragem de dados.
 */

import type {
  PriceTableInput,
  TechniqueInput,
  TableSelectionCriteria,
  ColorOption,
  SizeOption,
  PriceTier,
} from './types';

// ============================================
// TABLE SELECTION
// ============================================

function preferMatches(candidates: PriceTableInput[], predicate: (table: PriceTableInput) => boolean): PriceTableInput[] {
  const matches = candidates.filter(predicate);
  return matches.length > 0 ? matches : candidates;
}

function filterByTechniqueName(candidates: PriceTableInput[], name?: string): PriceTableInput[] {
  if (!name) return candidates;
  const normalized = name.toLowerCase();
  return preferMatches(candidates, table => table.techniqueName.toLowerCase().includes(normalized));
}

function filterByTechniqueCode(candidates: PriceTableInput[], code?: string): PriceTableInput[] {
  if (!code) return candidates;
  const normalized = code.toLowerCase();
  return preferMatches(candidates, table => table.tableCode.toLowerCase().includes(normalized) || normalized.includes(table.tableCode.toLowerCase()));
}

function compareColorCapacity(first: PriceTableInput, second: PriceTableInput, colors: number): number {
  const firstFits = first.maxColors !== null && first.maxColors >= colors;
  const secondFits = second.maxColors !== null && second.maxColors >= colors;
  if (firstFits !== secondFits) return firstFits ? -1 : 1;
  const firstCapacity = first.maxColors || 0;
  const secondCapacity = second.maxColors || 0;
  return firstFits ? firstCapacity - secondCapacity : secondCapacity - firstCapacity;
}

function sortByColorCapacity(candidates: PriceTableInput[], colors?: number): PriceTableInput[] {
  if (!colors) return candidates;
  return candidates.sort((first, second) => compareColorCapacity(first, second, colors));
}

function filterByDimensions(candidates: PriceTableInput[], criteria: TableSelectionCriteria): PriceTableInput[] {
  if (!criteria.widthCm || !criteria.heightCm) return candidates;
  const { widthCm, heightCm } = criteria;
  return preferMatches(candidates, table =>
    (table.maxWidthCm === null || table.maxWidthCm >= widthCm) &&
    (table.maxHeightCm === null || table.maxHeightCm >= heightCm),
  );
}

/**
 * Seleciona a melhor tabela de preço para os critérios dados
 * Prioridade: cores -> dimensões -> primeira disponível
 */
export function selectBestTable(
  tables: PriceTableInput[],
  criteria: TableSelectionCriteria
): PriceTableInput | null {
  if (tables.length === 0) return null;
  
  let candidates = tables.filter(t => t.isActive);
  if (candidates.length === 0) return null;
  candidates = filterByTechniqueName(candidates, criteria.techniqueName);
  candidates = filterByTechniqueCode(candidates, criteria.techniqueCode);
  candidates = sortByColorCapacity(candidates, criteria.colors);
  candidates = filterByDimensions(candidates, criteria);
  return candidates[0] ?? null;
}

/**
 * Filtra tabelas por técnica
 */
export function filterTablesByTechnique(
  tables: PriceTableInput[],
  techniqueName: string
): PriceTableInput[] {
  const normalized = techniqueName.toLowerCase();
  
  return tables.filter(t =>
    t.techniqueName.toLowerCase().includes(normalized) ||
    t.tableCode.toLowerCase().includes(normalized)
  );
}

/**
 * Agrupa tabelas por nome de técnica
 */
export function groupTablesByTechnique(
  tables: PriceTableInput[]
): Map<string, PriceTableInput[]> {
  const grouped = new Map<string, PriceTableInput[]>();
  
  for (const table of tables) {
    const key = table.techniqueName;
    const group = grouped.get(key) ?? [];
    group.push(table);
    grouped.set(key, group);
  }
  
  return grouped;
}

// ============================================
// TECHNIQUE SELECTION
// ============================================

/**
 * Filtra técnicas por categoria
 */
export function filterTechniquesByCategory(
  techniques: TechniqueInput[],
  category: string
): TechniqueInput[] {
  return techniques.filter(t => 
    t.category.toLowerCase() === category.toLowerCase() && t.isActive
  );
}

/**
 * Retorna técnicas únicas (por código)
 */
export function getUniqueTechniques(
  techniques: TechniqueInput[]
): TechniqueInput[] {
  const seen = new Set<string>();
  return techniques.filter(t => {
    if (seen.has(t.code)) return false;
    seen.add(t.code);
    return true;
  });
}

/**
 * Retorna categorias únicas das técnicas
 */
export function getUniqueCategories(techniques: TechniqueInput[]): string[] {
  const categories = [...new Set(techniques.map(t => t.category))];
  return categories.sort();
}

// ============================================
// OPTIONS EXTRACTION
// ============================================

/**
 * Extrai opções de cores disponíveis das tabelas
 */
export function extractColorOptions(
  tables: PriceTableInput[],
  hasPriceByColor: boolean
): ColorOption[] {
  if (!hasPriceByColor || tables.length === 0) return [];
  
  // Coletar todos os maxColors únicos
  const uniqueColors = [
    ...new Set(
      tables
        .map(t => t.maxColors)
        .filter((c): c is number => c !== null && c > 0)
    ),
  ].sort((a, b) => a - b);
  
  // Se só há um valor, criar opções de 1 até o máximo
  if (uniqueColors.length <= 1) {
    const maxColors = uniqueColors[0] || 4;
    return Array.from({ length: maxColors }, (_, i) => ({
      value: i + 1,
      label: `${i + 1} ${i === 0 ? 'cor' : 'cores'}`,
    }));
  }
  
  // Se há variação, usar os valores disponíveis
  return uniqueColors.map(c => ({
    value: c,
    label: `${c} ${c === 1 ? 'cor' : 'cores'}`,
  }));
}

/**
 * Extrai opções de tamanho disponíveis das tabelas
 */
export function extractSizeOptions(tables: PriceTableInput[]): SizeOption[] {
  if (tables.length === 0) return [];
  
  const uniqueAreas = new Map<string, SizeOption>();
  
  for (const table of tables) {
    const width = table.maxWidthCm;
    const height = table.maxHeightCm;
    
    if (width && height && width > 0 && height > 0) {
      const key = `${width}x${height}`;
      if (!uniqueAreas.has(key)) {
        uniqueAreas.set(key, {
          label: `${width} x ${height} cm`,
          value: key,
          width,
          height,
          areaCm2: width * height,
          priceModifier: 1,
        });
      }
    }
  }
  
  // Ordenar por área
  return Array.from(uniqueAreas.values()).sort((a, b) => a.areaCm2 - b.areaCm2);
}

/**
 * Extrai quantidades sugeridas das faixas
 */
export function extractQuantityOptions(tiers: PriceTier[]): number[] {
  if (tiers.length === 0) return [1, 10, 50, 100, 500];
  
  return tiers.map(t => t.minQuantity).sort((a, b) => a - b);
}

// ============================================
// SCORING & RANKING
// ============================================

/**
 * Calcula score de compatibilidade entre tabela e critérios
 * Maior score = melhor match
 */
export function calculateTableScore(
  table: PriceTableInput,
  criteria: TableSelectionCriteria
): number {
  return activeScore(table)
    + textMatchScore(table.techniqueName, criteria.techniqueName)
    + textMatchScore(table.tableCode, criteria.techniqueCode)
    + colorScore(table, criteria.colors)
    + dimensionScore(table, criteria);
}

function activeScore(table: PriceTableInput): number {
  return table.isActive ? 100 : 0;
}

function textMatchScore(value: string, requested?: string): number {
  return requested && value.toLowerCase().includes(requested.toLowerCase()) ? 50 : 0;
}

function colorScore(table: PriceTableInput, colors?: number): number {
  if (!colors || table.maxColors === null) return 0;
  return table.maxColors >= colors ? 30 - Math.min(table.maxColors - colors, 30) : -20;
}

function dimensionScore(table: PriceTableInput, criteria: TableSelectionCriteria): number {
  if (!criteria.widthCm || !criteria.heightCm) return 0;
  const fitsWidth = table.maxWidthCm === null || table.maxWidthCm >= criteria.widthCm;
  const fitsHeight = table.maxHeightCm === null || table.maxHeightCm >= criteria.heightCm;
  return fitsWidth && fitsHeight ? 20 : -10;
}

/**
 * Ordena tabelas por score de compatibilidade
 */
export function rankTablesByCriteria(
  tables: PriceTableInput[],
  criteria: TableSelectionCriteria
): PriceTableInput[] {
  return [...tables].sort((a, b) => {
    const scoreA = calculateTableScore(a, criteria);
    const scoreB = calculateTableScore(b, criteria);
    return scoreB - scoreA;
  });
}
