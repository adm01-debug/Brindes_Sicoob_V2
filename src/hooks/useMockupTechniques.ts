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

interface TabelaPrecoOficial {
  id: string;
  codigo: string;
  nome: string;
}

interface FaixaPreco {
  largura_max: number | null;
  altura_max: number | null;
}

/**
 * Fetches product customization options from external DB via RPC.
 */
export function useProductCustomizationOptionsForMockup(productId: string | undefined) {
  return useQuery({
    queryKey: ['mockup-customization-options', productId],
    queryFn: async () => {
      const raw = await invokeExternalRpc<Record<string, unknown>>(
        'fn_get_product_customization_options',
        { p_product_id: productId! }
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

      // Group faixas by technique ID
      const faixasByTech = new Map<string, FaixaPreco[]>();
      for (const f of faixaResult.records ?? []) {
        const key = f.tabela_preco_gravacao_id;
        if (!faixasByTech.has(key)) faixasByTech.set(key, []);
        faixasByTech.get(key)!.push(f);
      }

      // Build code → dimensions map
      const codeMap = new Map<string, { maxWidth: number | null; maxHeight: number | null }>();

      for (const tech of techResult.records ?? []) {
        const faixas = faixasByTech.get(tech.id) || [];
        if (!faixas.length) continue;

        const larguras: number[] = [];
        const alturas: number[] = [];
        let larguraSentinel = false;
        let alturaSentinel = false;

        for (const f of faixas) {
          if (f.largura_max != null) {
            if (f.largura_max >= 90) larguraSentinel = true;
            else larguras.push(f.largura_max);
          }
          if (f.altura_max != null) {
            if (f.altura_max >= 90) alturaSentinel = true;
            else alturas.push(f.altura_max);
          }
        }

        let maxWidth = larguras.length > 0 ? Math.max(...larguras) : null;
        let maxHeight = alturas.length > 0 ? Math.max(...alturas) : null;
        if (larguraSentinel) maxWidth = null;
        if (alturaSentinel) maxHeight = null;

        codeMap.set(tech.code, { maxWidth, maxHeight });
      }

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

  return useMemo(() => {
    // No product selected -> return all techniques without limits
    if (!selectedProduct || !techniques.length) {
      return techniques.map(t => ({
        ...t,
        maxWidth: null,
        maxHeight: null,
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
      }));
    }

    // No customization data yet (loading) -> return empty to avoid showing wrong list
    if (!customizationData?.locations) {
      return [];
    }

    // RPC returned successfully but product has NO configured areas
    // → Use technique-level dimensions from pricing tables
    if (customizationData.locations.length === 0) {
      return techniques.map(t => {
        const dims = t.code ? techniqueDims?.get(t.code) : undefined;
        return {
          ...t,
          maxWidth: dims?.maxWidth ?? null,
          maxHeight: dims?.maxHeight ?? null,
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
      });
    }

    // Extract all unique techniques from all locations
    // Use a map keyed by tecnica_nome to deduplicate, keeping the best dimensions
    const techniqueMap = new Map<string, {
      option: CustomizationOption;
      locationName: string;
    }>();

    for (const location of customizationData.locations) {
      for (const option of location.options) {
        const key = option.tecnica_nome;
        const existing = techniqueMap.get(key);
        
        const area = option.efetiva_largura_max * option.efetiva_altura_max;
        const existingArea = existing 
          ? existing.option.efetiva_largura_max * existing.option.efetiva_altura_max 
          : 0;
        
        if (!existing || area > existingArea) {
          techniqueMap.set(key, {
            option,
            locationName: location.location_name,
          });
        }
      }
    }

    if (techniqueMap.size === 0) {
      return [];
    }

    // Build the result — use technique_id from the RPC as the ID
    const result: TechniqueWithLimits[] = [];
    
    for (const [techName, { option, locationName }] of techniqueMap.entries()) {
      result.push({
        id: option.technique_id,
        name: option.tecnica_nome,
        code: option.codigo_tabela || null,
        maxWidth: option.efetiva_largura_max || null,
        maxHeight: option.efetiva_altura_max || null,
        areaName: `${locationName} — ${option.tecnica_nome}`,
        locationName,
        maxColors: option.max_cores ?? null,
        chargesPerColor: option.cobra_por_cor ?? false,
        usesDimension: option.usa_dimensao ?? false,
        isCurved: option.is_curved ?? false,
        setupCost: option.custo_setup ?? null,
        variationLabel: option.variacao_label || null,
        groupCode: option.grupo_tecnica || null,
        shape: option.shape || null,
      });
    }

    // Sort by name
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [techniques, selectedProduct, customizationData, techniqueDims]);
}
