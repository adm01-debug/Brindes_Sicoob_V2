/**
 * useLivePricePreview - Debounced price estimate for StepSpecs
 * 
 * Fetches a quick price estimate from the cheapest technique
 * as the user adjusts dimensions/colors, before clicking "Compare".
 */

import { useState, useEffect, useRef } from 'react';
import { invokeExternalRpc } from '@/lib/external-rpc';
import type { CustomizationPriceResponse } from '@/hooks/useGravacaoPriceV2';
import { adaptPriceResponse } from '@/lib/personalization/adapters';
import type { EngravingLocation, EngravingSpecs } from '@/types/domain/simulator-wizard';

export interface LivePriceEstimate {
  cheapestName: string;
  cheapestCode: string;
  unitPrice: number;
  totalPrice: number;
  costPerUnit: number;
  productionDays: number | null;
  /** Detalhamento (breakdown) retornado pelo RPC para inspeção pelo usuário */
  breakdown: {
    areaName: string;
    areaCode: string;
    locationName: string | null;
    techniqueGroup: string;
    tableCode: string;
    tableCodeShort: string;
    quotationCode: string;
    quantity: number;
    numColors: number;
    maxColors: number;
    priceByColor: boolean;
    width: number | null;
    height: number | null;
    areaCm2: number | null;
    subtotalPieces: number;
    setupTotal: number;
    minimumApplied: boolean;
    tierMinQty: number;
    tierMaxQty: number;
    markupPercent: number;
  };
}

interface UseLivePricePreviewParams {
  selectedLocation: EngravingLocation | null;
  engravingSpecs: EngravingSpecs;
  quantity: number;
  enabled?: boolean;
}

type PreviewTechnique = EngravingLocation['availableTechniques'][number];
type AdaptedPrice = ReturnType<typeof adaptPriceResponse>;

function valueOr<T>(value: T | null | undefined, fallback: T): T {
  return value || fallback;
}

function effectiveColorCount(technique: PreviewTechnique, requested: number): number {
  const chargesPerColor = technique.cobraPorCor !== false;
  return !chargesPerColor || (technique.maxColors ?? 0) <= 1 ? 1 : requested;
}

function buildPreviewRpcParams(
  technique: PreviewTechnique,
  specs: EngravingSpecs,
  quantity: number,
  colors: number,
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    p_area_id: technique.printAreaId,
    p_quantidade: quantity,
    p_num_cores: colors,
  };
  if (technique.usaDimensao !== false && specs.width > 0 && specs.height > 0) {
    params.p_largura_cm = specs.width;
    params.p_altura_cm = specs.height;
  }
  return params;
}

function usedDimensions(technique: PreviewTechnique, specs: EngravingSpecs) {
  const usesDimensions = technique.usaDimensao !== false;
  const width = usesDimensions && specs.width > 0 ? specs.width : null;
  const height = usesDimensions && specs.height > 0 ? specs.height : null;
  return { width, height, area: width && height ? +(width * height).toFixed(2) : null };
}

function toLiveEstimate(
  price: AdaptedPrice,
  technique: PreviewTechnique,
  location: EngravingLocation,
  ...preview: [specs: EngravingSpecs, quantity: number, colors: number]
): LivePriceEstimate {
  const [specs, quantity, colors] = preview;
  const dimensions = usedDimensions(technique, specs);
  return {
    cheapestName: valueOr(price.technique, technique.techniqueName),
    cheapestCode: valueOr(price.tabela_codigo_curto, technique.techniqueCode),
    unitPrice: price.unit_price,
    totalPrice: price.total_price,
    costPerUnit: quantity > 0 ? price.total_price / quantity : 0,
    productionDays: price.production_days,
    breakdown: {
      areaName: valueOr(price.area_name, valueOr(location.locationName, '—')),
      areaCode: valueOr(price.area_code, ''),
      locationName: location.locationName ?? null,
      techniqueGroup: valueOr(price.grupo_tecnica, ''),
      tableCode: valueOr(price.tabela_codigo, ''),
      tableCodeShort: valueOr(price.tabela_codigo_curto, ''),
      quotationCode: valueOr(price.codigo_orcamento, ''),
      quantity: valueOr(price.quantity, quantity),
      numColors: valueOr(price.num_cores, colors),
      maxColors: price.max_cores ?? technique.maxColors ?? 1,
      priceByColor: !!price.price_by_color,
      width: dimensions.width,
      height: dimensions.height,
      areaCm2: dimensions.area,
      subtotalPieces: valueOr(price.subtotal_pecas, 0),
      setupTotal: valueOr(price.faturamento_minimo_gravacao, 0),
      minimumApplied: !!price.minimum_applied,
      tierMinQty: valueOr(price.tier_min_qty, 0),
      tierMaxQty: valueOr(price.tier_max_qty, 0),
      markupPercent: valueOr(price.markup_percent, 0),
    },
  };
}

async function fetchLiveEstimate(
  location: EngravingLocation,
  specs: EngravingSpecs,
  quantity: number,
): Promise<LivePriceEstimate | null> {
  const technique = location.availableTechniques.find(item => item.hasPricing !== false);
  if (!technique) return null;
  const colors = effectiveColorCount(technique, specs.colors);
  const result = await invokeExternalRpc<CustomizationPriceResponse>(
    'fn_get_customization_price',
    buildPreviewRpcParams(technique, specs, quantity, colors),
  );
  if (!result?.success) return null;
  return toLiveEstimate(adaptPriceResponse({ ...result }), technique, location, specs, quantity, colors);
}

export function useLivePricePreview({
  selectedLocation,
  engravingSpecs,
  quantity,
  enabled = true,
}: UseLivePricePreviewParams) {
  const [estimate, setEstimate] = useState<LivePriceEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef(false);

  useEffect(() => {
    if (!enabled || !selectedLocation || selectedLocation.availableTechniques.length === 0) {
      setEstimate(null);
      return;
    }

    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current = true; // Cancel in-flight

    const specs = {
      colors: engravingSpecs.colors,
      width: engravingSpecs.width,
      height: engravingSpecs.height,
    };
    timerRef.current = setTimeout(async () => {
      abortRef.current = false;
      setIsLoading(true);

      try {
        const nextEstimate = await fetchLiveEstimate(selectedLocation, specs, quantity);
        if (abortRef.current) return; // Stale response
        setEstimate(nextEstimate);
      } catch {
        if (!abortRef.current) setEstimate(null);
      } finally {
        if (!abortRef.current) setIsLoading(false);
      }
    }, 800); // 800ms debounce

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current = true;
    };
  }, [selectedLocation, engravingSpecs.colors, engravingSpecs.width, engravingSpecs.height, quantity, enabled]);

  return { estimate, isLoading };
}
