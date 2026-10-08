/**
 * useWizardPricing - Price comparison & recalculation logic for simulator wizard
 */

import { useCallback, useEffect, useRef, type Dispatch } from 'react';
import { toast } from 'sonner';
import { invokeExternalRpc } from '@/lib/external-rpc';
import type { CustomizationPriceResponse } from '@/hooks/useGravacaoPriceV2';
import { adaptPriceResponse } from '@/lib/personalization/adapters';
import type {
  SimulatorWizardState,
  WizardAction,
  TechniqueComparisonResult,
  Personalization,
} from '@/types/domain/simulator-wizard';
import { logger } from "@/lib/logger";

interface UseWizardPricingParams {
  state: SimulatorWizardState;
  dispatch: Dispatch<WizardAction>;
}

type WizardTechnique = NonNullable<SimulatorWizardState['selectedLocation']>['availableTechniques'][number];

function wizardEffectiveColors(technique: WizardTechnique, requested: number): number {
  if (technique.cobraPorCor === false || technique.maxColors === 0 || technique.maxColors === 1) return 1;
  return requested;
}

function wizardRpcParams(
  technique: WizardTechnique,
  specs: SimulatorWizardState['engravingSpecs'],
  quantity: number,
): Record<string, unknown> {
  const params: Record<string, unknown> = {
    p_area_id: technique.printAreaId,
    p_quantidade: quantity,
    p_num_cores: wizardEffectiveColors(technique, specs.colors),
  };
  if (technique.usaDimensao !== false && specs.width > 0 && specs.height > 0) {
    params.p_largura_cm = specs.width;
    params.p_altura_cm = specs.height;
  }
  return params;
}

function findPersonalizationTechnique(state: SimulatorWizardState, personalization: Personalization) {
  return state.availableLocations
    .flatMap(location => location.availableTechniques)
    .find(technique => technique.printAreaId === personalization.technique.id);
}

async function recalculatePersonalization(
  personalization: Personalization,
  state: SimulatorWizardState,
  dispatch: Dispatch<WizardAction>,
): Promise<void> {
  try {
    const technique = findPersonalizationTechnique(state, personalization);
    if (!technique) return;
    const result = await invokeExternalRpc<CustomizationPriceResponse>(
      'fn_get_customization_price',
      wizardRpcParams(technique, personalization.specs, state.quantity),
    );
    if (!result?.success) return;
    const price = adaptPriceResponse(result as unknown as Record<string, unknown>);
    dispatch({
      type: 'RECALC_PERSONALIZATION_PRICING',
      payload: {
        personalizationId: personalization.id,
        pricing: {
          unitPrice: price.unit_price,
          setupPrice: price.faturamento_minimo_gravacao,
          subtotal: price.subtotal_pecas,
          totalPrice: price.total_price,
          costPerUnit: state.quantity > 0 ? price.total_price / state.quantity : 0,
          budgetCode: price.codigo_orcamento,
          productionDays: price.production_days,
        },
      },
    });
  } catch (error) {
    logger.warn(`Erro ao recalcular preço para ${personalization.technique.name}:`, error);
  }
}

async function recalculatePersonalizations(
  personalizations: Personalization[],
  state: SimulatorWizardState,
  dispatch: Dispatch<WizardAction>,
): Promise<void> {
  await Promise.all(personalizations.map(item => recalculatePersonalization(item, state, dispatch)));
  toast.success('Preços recalculados para nova tiragem!');
}

function techniqueUnavailableReason(technique: WizardTechnique, requestedColors: number): string | null {
  if (technique.hasPricing === false) return 'Preço sob consulta';
  if (technique.maxColors !== null && technique.maxColors > 0 && requestedColors > technique.maxColors) {
    return `Máximo ${technique.maxColors} ${technique.maxColors === 1 ? 'cor' : 'cores'}`;
  }
  return null;
}

async function fetchTechniquePrice(
  technique: WizardTechnique,
  state: SimulatorWizardState,
): Promise<TechniqueComparisonResult> {
  const unavailableReason = techniqueUnavailableReason(technique, state.engravingSpecs.colors);
  if (unavailableReason) return createUnavailableResult(technique, unavailableReason);
  try {
    const result = await invokeExternalRpc<CustomizationPriceResponse>(
      'fn_get_customization_price',
      wizardRpcParams(technique, state.engravingSpecs, state.quantity),
    );
    if (!result?.success) return createUnavailableResult(technique, 'Erro no cálculo de preço');
    const price = adaptPriceResponse(result as unknown as Record<string, unknown>);
    return {
      techniqueId: technique.techniqueId,
      techniqueName: price.technique || technique.techniqueName,
      techniqueCode: price.tabela_codigo_curto || technique.techniqueCode,
      printAreaId: technique.printAreaId,
      maxColors: price.max_cores ?? technique.maxColors,
      isAvailable: true,
      unitPrice: price.unit_price,
      setupPrice: price.faturamento_minimo_gravacao,
      subtotal: price.subtotal_pecas,
      totalPrice: price.total_price,
      costPerUnit: state.quantity > 0 ? price.total_price / state.quantity : 0,
      minimumApplied: price.minimum_applied,
      budgetCode: price.codigo_orcamento,
      productionDays: price.production_days,
      markupPercent: price.markup_percent,
      marginPercent: price.margin_percent,
      tierUsed: price.tier_used,
      tierMinQty: price.tier_min_qty,
      tierMaxQty: price.tier_max_qty,
      rawData: result as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logger.warn(`Erro ao calcular preço para ${technique.techniqueName}:`, error);
    return createUnavailableResult(technique, 'Erro ao calcular preço');
  }
}

function markComparisonHighlights(results: TechniqueComparisonResult[]): TechniqueComparisonResult[] {
  const available = results.filter(result => result.isAvailable);
  if (available.length === 0) return results;
  const cheapest = [...available].sort((a, b) => a.totalPrice - b.totalPrice)[0];
  const fastest = [...available].sort((a, b) =>
    (a.productionDays || 999) - (b.productionDays || 999)
  )[0];
  if (!cheapest || !fastest) return results;
  for (const result of available) {
    result.isCheapest = result.printAreaId === cheapest.printAreaId;
    result.isFastest = result.printAreaId === fastest.printAreaId && available.length > 1;
  }
  return [
    ...available.sort((a, b) => a.totalPrice - b.totalPrice),
    ...results.filter(result => !result.isAvailable),
  ];
}

export function useWizardPricing({ state, dispatch }: UseWizardPricingParams) {
  // ============================================
  // EFEITO: Recalcular preços ao mudar quantidade
  // ============================================

  const recalcTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const persToRecalc = state.personalizations.filter(
      (p) => p.pricing._needsRecalc === true
    );
    if (persToRecalc.length === 0) return;

    if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);

    recalcTimerRef.current = setTimeout(() => {
      void recalculatePersonalizations(persToRecalc, state, dispatch);
    }, 600);

    return () => {
      if (recalcTimerRef.current) clearTimeout(recalcTimerRef.current);
    };
  }, [dispatch, state]);

  // ============================================
  // COMPARAÇÃO DE PREÇOS
  // ============================================

  const fetchComparisonPrices = useCallback(async () => {
    if (!state.selectedLocation) {
      toast.error('Selecione um local primeiro');
      return;
    }

    const techniques = state.selectedLocation.availableTechniques;
    if (techniques.length === 0) {
      toast.warning('Nenhuma técnica disponível para este local');
      return;
    }

    dispatch({ type: 'SET_CALCULATING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const allResults = await Promise.all(techniques.map(technique => fetchTechniquePrice(technique, state)));
      const sorted = markComparisonHighlights(allResults);

      dispatch({ type: 'SET_COMPARISON_RESULTS', payload: sorted });
      dispatch({ type: 'SET_STEP', payload: 'comparison' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao comparar técnicas';
      dispatch({ type: 'SET_ERROR', payload: message });
      toast.error(message);
    } finally {
      dispatch({ type: 'SET_CALCULATING', payload: false });
    }
  }, [dispatch, state]);

  // Confirmar técnica selecionada → cria personalização
  const confirmTechnique = useCallback((comparison: TechniqueComparisonResult) => {
    if (!state.selectedLocation || !comparison.isAvailable) return;

    dispatch({ type: 'SELECT_COMPARISON', payload: comparison });

    const personalization: Personalization = {
      id: `pers-${Date.now()}`,
      index: state.isEditingPersonalization
        ? state.currentPersonalizationIndex + 1
        : state.personalizations.length + 1,
      location: state.selectedLocation,
      technique: {
        id: comparison.techniqueId,
        code: comparison.techniqueCode,
        name: comparison.techniqueName,
      },
      specs: { ...state.engravingSpecs },
      pricing: {
        unitPrice: comparison.unitPrice,
        setupPrice: comparison.setupPrice,
        subtotal: comparison.subtotal,
        totalPrice: comparison.totalPrice,
        costPerUnit: comparison.costPerUnit,
        budgetCode: comparison.budgetCode,
        productionDays: comparison.productionDays,
      },
    };

    if (state.isEditingPersonalization) {
      dispatch({ type: 'UPDATE_PERSONALIZATION', payload: { index: state.currentPersonalizationIndex, personalization } });
      toast.success(`Gravação ${personalization.index} atualizada`);
    } else {
      dispatch({ type: 'ADD_PERSONALIZATION', payload: personalization });
      toast.success(`${comparison.techniqueName} adicionada`);
    }
  }, [state, dispatch]);

  return { fetchComparisonPrices, confirmTechnique };
}

// ============================================
// HELPERS
// ============================================

function createUnavailableResult(
  tech: {
    techniqueId: string;
    techniqueName: string;
    techniqueCode: string;
    printAreaId: string;
    maxColors: number | null;
  },
  reason: string
): TechniqueComparisonResult {
  return {
    techniqueId: tech.techniqueId,
    techniqueName: tech.techniqueName,
    techniqueCode: tech.techniqueCode,
    printAreaId: tech.printAreaId,
    maxColors: tech.maxColors,
    isAvailable: false,
    unavailableReason: reason,
    unitPrice: 0,
    setupPrice: 0,
    subtotal: 0,
    totalPrice: 0,
    costPerUnit: 0,
    minimumApplied: false,
    budgetCode: '',
    productionDays: null,
    markupPercent: 0,
    marginPercent: 0,
    tierUsed: 0,
    tierMinQty: 0,
    tierMaxQty: 0,
  };
}
