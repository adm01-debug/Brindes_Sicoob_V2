/**
 * useMockupTechniques — Filter techniques by product using fn_get_product_customization_options RPC
 * 
 * When a product is selected, fetches its REAL customization options from the external DB
 * and returns ONLY the techniques that are configured for that product.
 * 
 * When the product has NO customization data configured (locations: []),
 * returns all techniques BUT enriches them with their inherent max dimensions
 * from tabela_preco_gravacao_oficial + tabela_preco_gravacao_oficial_faixa.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { invokeExternalRpc } from "@/lib/external-rpc";
import { invokeExternalDb } from "@/lib/external-db";
import { adaptCustomizationOptions } from "@/lib/personalization/adapters";
import { logger } from "@/lib/logger";

interface Technique {
  id: string;
  name: string;
  code: string | null;
}

export interface TechniqueWithLimits extends Technique {
  /** Max width in cm */
  maxWidth: number | null;
  /** Max height in cm */
  maxHeight: number | null;
  /** Area name (e.g., "Lado A — Fiber Laser | Plana") */
  areaName: string | null;
  /** Location name (e.g., "Lado A") */
  locationName: string | null;
  // ─── Atributos novos (RPC fn_get_product_customization_options) ───
  /** Máximo de cores suportadas pela técnica nessa área */
  maxColors: number | null;
  /** Se a tabela cobra por cor (multiplica preço por cor) */
  chargesPerColor: boolean;
  /** Se a técnica usa dimensão (cobra por área) */
  usesDimension: boolean;
  /** Se a técnica suporta superfície curva */
  isCurved: boolean;
  /** Custo de setup (R$) */
  setupCost: number | null;
  /** Label da variação (ex.: "Fiber Laser | Plana") */
  variationLabel: string | null;
  /** Grupo da técnica (ex.: "LASER", "SERIGRAFIA") */
  groupCode: string | null;
  /** Shape declarado pelo RPC (ex.: "rect", "round") */
  shape: string | null;
}

/** Shape of each option inside a location from the RPC */
interface CustomizationOption {
  technique_id: string;
  tecnica_nome: string;
  codigo_tabela: string;
  grupo_tecnica: string;
  max_width: number;
  max_height: number;
  efetiva_largura_max: number;
  efetiva_altura_max: number;
  max_cores: number;
  cobra_por_cor: boolean;
  custo_setup: number;
  is_curved: boolean;
  usa_dimensao: boolean;
  variacao_label: string;
  shape: string;
}

interface CustomizationLocation {
  location_code: string;
  location_name: string;
  location_order: number;
  options: CustomizationOption[];
}

interface CustomizationResponse {
  product_id: string;
  locations: CustomizationLocation[];
}

interface FaixaPreco {
  largura_max: number | null;
  altura_max: number | null;
}

interface TechniqueDimensions {
  maxWidth: number | null;
  maxHeight: number | null;
}

function groupPriceTiers(rows: Array<FaixaPreco & { tabela_preco_gravacao_id: string }>): Map<string, FaixaPreco[]> {
  const grouped = new Map<string, FaixaPreco[]>();
  for (const row of rows) {
    const tiers = grouped.get(row.tabela_preco_gravacao_id) || [];
    tiers.push(row);
    grouped.set(row.tabela_preco_gravacao_id, tiers);
  }
  return grouped;
}

function maxDimension(rows: FaixaPreco[], key: 'largura_max' | 'altura_max'): number | null {
  const values = rows.map(row => row[key]).filter((value): value is number => value !== null && value !== undefined);
  if (values.some(value => value >= 90)) return null;
  return values.length > 0 ? Math.max(...values) : null;
}

function buildDimensionMap(
  techniques: Array<{ id: string; code: string }>,
  groupedTiers: Map<string, FaixaPreco[]>,
): Map<string, TechniqueDimensions> {
  const dimensions = new Map<string, TechniqueDimensions>();
  for (const technique of techniques) {
    const tiers = groupedTiers.get(technique.id) || [];
    if (tiers.length === 0) continue;
    dimensions.set(technique.code, {
      maxWidth: maxDimension(tiers, 'largura_max'),
      maxHeight: maxDimension(tiers, 'altura_max'),
    });
  }
  return dimensions;
}

function techniqueWithoutLimits(technique: Technique, dimensions?: TechniqueDimensions): TechniqueWithLimits {
  return {
    ...technique,
    maxWidth: dimensions?.maxWidth ?? null,
    maxHeight: dimensions?.maxHeight ?? null,
    areaName: null,
    locationName: null,
    maxColors: null,
    chargesPerColor: false,
    usesDimension: false,
    isCurved: false,
    setupCost: null,
    variationLabel: null,
    groupCode: null,
    shape: null,
  };
}

function bestOptionsByTechnique(locations: CustomizationLocation[]) {
  const best = new Map<string, { option: CustomizationOption; locationName: string }>();
  for (const location of locations) {
    for (const option of location.options) {
      const existing = best.get(option.tecnica_nome);
      const area = option.efetiva_largura_max * option.efetiva_altura_max;
      const existingArea = existing
        ? existing.option.efetiva_largura_max * existing.option.efetiva_altura_max
        : 0;
      if (!existing || area > existingArea) {
        best.set(option.tecnica_nome, { option, locationName: location.location_name });
      }
    }
  }
  return best;
}

function truthyOrNull<T>(value: T): T | null {
  return value || null;
}

function definedOrNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function optionToTechnique(option: CustomizationOption, locationName: string): TechniqueWithLimits {
  return {
    id: option.technique_id,
    name: option.tecnica_nome,
    code: truthyOrNull(option.codigo_tabela),
    maxWidth: truthyOrNull(option.efetiva_largura_max),
    maxHeight: truthyOrNull(option.efetiva_altura_max),
    areaName: `${locationName} — ${option.tecnica_nome}`,
    locationName,
    maxColors: definedOrNull(option.max_cores),
    chargesPerColor: option.cobra_por_cor,
    usesDimension: option.usa_dimensao,
    isCurved: option.is_curved,
    setupCost: definedOrNull(option.custo_setup),
    variationLabel: truthyOrNull(option.variacao_label),
    groupCode: truthyOrNull(option.grupo_tecnica),
    shape: truthyOrNull(option.shape),
  };
}

function resolveFilteredTechniques(
  techniques: Technique[],
  selectedProduct: { id: string } | null,
  data: CustomizationResponse | null | undefined,
  dimensions: Map<string, TechniqueDimensions> | undefined,
): TechniqueWithLimits[] {
  if (!selectedProduct || techniques.length === 0) return techniques.map(technique => techniqueWithoutLimits(technique));
  if (!data?.locations) return [];
  if (data.locations.length === 0) {
    return techniques.map(technique => techniqueWithoutLimits(
      technique,
      technique.code ? dimensions?.get(technique.code) : undefined,
    ));
  }
  const result = Array.from(bestOptionsByTechnique(data.locations).values())
    .map(({ option, locationName }) => optionToTechnique(option, locationName));
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetches product customization options from external DB via RPC.
 */
export function useProductCustomizationOptionsForMockup(productId: string | undefined) {
  return useQuery({
    queryKey: ['mockup-customization-options', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Produto não identificado');
      const raw = await invokeExternalRpc<Record<string, unknown>>(
        'fn_get_product_customization_options',
        { p_product_id: productId }
      );
      // Passa pelo adapter para absorver futuras mudanças de schema (PT → EN).
      const adapted = adaptCustomizationOptions(raw);
      return adapted as unknown as CustomizationResponse | null;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches max dimensions for ALL techniques in 2 batch queries:
 * 1. All active rows from tabela_preco_gravacao_oficial (via alias)
 * 2. All faixas from tabela_preco_gravacao_oficial_faixa
 * Then matches by code in JS. Uses same sentinel logic as external-db-bridge.
 */
function useAllTechniqueDimensions(techniques: Technique[], shouldFetch: boolean) {
  return useQuery({
    queryKey: ['all-technique-dimensions-v2'],
    queryFn: async () => {
      // 1. Fetch ALL active techniques from external DB (via alias — bridge maps filters)
      const techResult = await invokeExternalDb<{ id: string; code: string; name: string }>({
        table: 'personalization_techniques',
        operation: 'select',
        limit: 200,
      });

      if (!techResult.records?.length) return new Map<string, { maxWidth: number | null; maxHeight: number | null }>();

      // 2. Fetch ALL faixas in one query
      const faixaResult = await invokeExternalDb<{ tabela_preco_gravacao_id: string; largura_max: number | null; altura_max: number | null }>({
        table: 'tabela_preco_gravacao_oficial_faixa',
        operation: 'select',
        select: 'tabela_preco_gravacao_id,largura_max,altura_max',
        limit: 5000,
      });

      const codeMap = buildDimensionMap(
        techResult.records ?? [],
        groupPriceTiers(faixaResult.records ?? []),
      );

      logger.log('[useMockupTechniques] Loaded technique dimensions for', codeMap.size, 'techniques');
      return codeMap;
    },
    enabled: shouldFetch,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Filters techniques to ONLY those available for the selected product.
 * Uses fn_get_product_customization_options RPC.
 * 
 * When product has NO configured areas (locations: []):
 * → Returns all techniques enriched with their inherent max dimensions
 *   from the pricing tables (tabela_preco_gravacao_oficial_faixa).
 * 
 * Returns unique techniques with dimension limits from the best (largest) area.
 */
export function useFilteredTechniques(
  techniques: Technique[],
  selectedProduct: { id: string } | null
): TechniqueWithLimits[] {
  const { data: customizationData } = useProductCustomizationOptionsForMockup(selectedProduct?.id);
  
  // Determine if we need technique-level dimensions (product has no configured areas)
  const needsTechniqueDims = !!selectedProduct 
    && !!customizationData?.locations 
    && customizationData.locations.length === 0;

  const { data: techniqueDims } = useAllTechniqueDimensions(techniques, needsTechniqueDims);

  return useMemo(
    () => resolveFilteredTechniques(techniques, selectedProduct, customizationData, techniqueDims),
    [techniques, selectedProduct, customizationData, techniqueDims],
  );
}
