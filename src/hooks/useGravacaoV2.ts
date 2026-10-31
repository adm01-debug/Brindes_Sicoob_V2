/**
 * useGravacaoV2 - Hooks para Sistema de Gravação/Personalização v2
 * 
 * Tipos e helpers extraídos para gravacao/ subfolder.
 * Este arquivo mantém apenas os hooks React.
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalDb } from '@/lib/external-db';
import { invokeExternalRpc } from '@/lib/external-rpc';
import type { PrintAreaFromProduct } from '@/lib/fetch-print-areas';

// Re-export types & helpers for backward compat
export type { TabelaPrecoOficial, FaixaPrecoOficial, CustomizationPriceV2, PrintAreaWithTechniques } from './gravacao/gravacao-types';
export {
  TECHNIQUE_COLORS, TECHNIQUE_ICONS, AREA_SHAPES, QUANTITY_TIERS_REFERENCE,
  getTechniqueColor, getTechniqueIcon, formatPrice,
  calculateTotalWithColorDiscount, calculateSetupCost, findPriceTier, calculateCustomizationTotal,
} from './gravacao/gravacao-constants';

import type { TabelaPrecoOficial, FaixaPrecoOficial, CustomizationPriceV2, PrintAreaWithTechniques } from './gravacao/gravacao-types';

interface TechniqueSummary {
  id: string;
  nome: string;
  codigo: string;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function stringValue(record: Record<string, unknown>, key: string, fallback = ''): string {
  return typeof record[key] === 'string' ? record[key] : fallback;
}

function numberValue(record: Record<string, unknown>, key: string, fallback = 0): number {
  return typeof record[key] === 'number' ? record[key] : fallback;
}

function booleanValue(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === 'boolean' ? record[key] : false;
}

function nullableNumberValue(record: Record<string, unknown>, key: string): number | null {
  return typeof record[key] === 'number' ? record[key] : null;
}

function areaTechniques(
  ids: string[],
  techniquesById: Map<string, Record<string, unknown>>,
): TechniqueSummary[] {
  return ids.flatMap(id => {
    const technique = techniquesById.get(id);
    if (!technique) return [];
    return [{
      id: stringValue(technique, 'id'),
      nome: stringValue(technique, 'nome'),
      codigo: stringValue(technique, 'codigo_curto', stringValue(technique, 'codigo_tabela')),
    }];
  });
}

function toPrintArea(
  area: PrintAreaFromProduct,
  techniquesById: Map<string, Record<string, unknown>>,
): PrintAreaWithTechniques {
  return {
    area_id: area.id,
    area_code: area.area_code || '',
    area_name: area.area_name || '',
    max_width: area.max_width || 0,
    max_height: area.max_height || 0,
    shape: area.shape || 'rectangle',
    is_curved: area.is_curved ?? false,
    is_primary: area.is_primary ?? false,
    display_order: area.display_order ?? 0,
    techniques: areaTechniques(area.allowed_technique_ids || [], techniquesById),
  };
}

function buildCustomizationPrice(
  raw: Record<string, unknown>,
  areaId: string,
  quantity: number,
  numColors: number,
): CustomizationPriceV2 {
  const area = toRecord(raw.area);
  const tier = toRecord(raw.faixa);
  const table = toRecord(raw.tabela);
  const parameters = toRecord(raw.parametros);
  const costs = toRecord(raw.custos);
  const prices = toRecord(raw.precos);
  const tableCode = stringValue(table, 'codigo_tabela');
  const unitCost = numberValue(costs, 'custo_unitario_total');
  return {
    success: true,
    area_id: stringValue(area, 'id', areaId),
    area_code: stringValue(area, 'code'),
    area_name: stringValue(area, 'name'),
    area_order: numberValue(tier, 'ordem'),
    tabela_id: stringValue(table, 'id'),
    tabela_codigo: tableCode,
    tabela_codigo_curto: tableCode.split('-')[0] || '',
    technique: stringValue(table, 'nome'),
    codigo_orcamento: stringValue(raw, 'codigo_orcamento'),
    quantity: numberValue(parameters, 'quantidade', quantity),
    num_cores: numberValue(parameters, 'num_cores', numColors),
    tier_used: numberValue(tier, 'ordem'),
    tier_min_qty: numberValue(tier, 'quantidade_minima'),
    tier_max_qty: numberValue(tier, 'quantidade_maxima'),
    cost_base_unit: numberValue(costs, 'custo_base_unitario'),
    cost_unit_total: unitCost,
    cost_setup: numberValue(costs, 'custo_setup_base'),
    cost_total: unitCost * quantity,
    markup_percent: numberValue(prices, 'markup_percent'),
    preco_minimo_unitario: 0,
    unit_price: numberValue(prices, 'preco_unitario_final'),
    subtotal_pecas: numberValue(prices, 'subtotal_pecas'),
    faturamento_minimo_gravacao: numberValue(prices, 'faturamento_minimo_gravacao'),
    minimum_applied: booleanValue(prices, 'aplica_minimo'),
    total_price: numberValue(prices, 'total_final'),
    margin_percent: numberValue(prices, 'markup_percent'),
    price_by_color: booleanValue(table, 'cobra_por_cor'),
    setup_by_color: false,
    production_days: nullableNumberValue(tier, 'prazo_dias'),
    largura_max_tecnica: nullableNumberValue(area, 'max_width'),
    altura_max_tecnica: nullableNumberValue(area, 'max_height'),
  };
}

// ============================================
// HOOKS
// ============================================

export function useProductPrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['product-print-areas-v2', productId],
    queryFn: async (): Promise<PrintAreaWithTechniques[]> => {
      if (!productId) return [];
      const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');
      const areas = await fetchPrintAreasFromProduct(productId);
      if (!areas.length) return [];

      const techResult = await invokeExternalDb<Record<string, unknown>>({
        table: 'tabela_preco_gravacao_oficial',
        operation: 'select',
        filters: { ativo: true },
        limit: 100,
      });

      const techById = new Map((techResult.records || []).map((t) => [t.id as string, t]));

      return areas.map(area => toPrintArea(area, techById));
    },
    enabled: !!productId,
    staleTime: 60 * 1000,
  });
}

export function useTabelasPrecoOficial() {
  return useQuery({
    queryKey: ['tabelas-preco-oficial'],
    queryFn: async (): Promise<TabelaPrecoOficial[]> => {
      const result = await invokeExternalDb<TabelaPrecoOficial>({
        table: 'tabela_preco_gravacao_oficial',
        operation: 'select',
        filters: { ativo: true },
        orderBy: { column: 'codigo', ascending: true },
      });
      return result.records || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFaixasPrecoOficial(tabelaPrecoId: string | null) {
  return useQuery({
    queryKey: ['faixas-preco-oficial', tabelaPrecoId],
    queryFn: async (): Promise<FaixaPrecoOficial[]> => {
      if (!tabelaPrecoId) return [];
      const result = await invokeExternalDb<FaixaPrecoOficial>({
        table: 'tabela_preco_gravacao_oficial_faixa',
        operation: 'select',
        filters: { tabela_preco_gravacao_id: tabelaPrecoId },
        orderBy: { column: 'ordem', ascending: true },
      });
      return result.records || [];
    },
    enabled: !!tabelaPrecoId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomizationPriceLegacy() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePriceByArea = useCallback(async (
    areaId: string, quantidade: number, numCores: number = 1,
    ...dimensions: [larguraCm?: number | null, alturaCm?: number | null]
  ): Promise<CustomizationPriceV2 | null> => {
    const [larguraCm, alturaCm] = dimensions;
    setLoading(true);
    setError(null);
    try {
      const rawResult = await invokeExternalRpc<Record<string, unknown>>(
        'fn_get_customization_price',
        { p_area_id: areaId, p_quantidade: quantidade, p_num_cores: numCores, p_largura_cm: larguraCm ?? null, p_altura_cm: alturaCm ?? null }
      );
      if (!rawResult?.success) { setLoading(false); return null; }

      const result = buildCustomizationPrice(rawResult, areaId, quantidade, numCores);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao calcular preço');
      setLoading(false);
      return null;
    }
  }, []);

  /** @deprecated Use calculatePriceByArea instead */
  const calculatePrice = calculatePriceByArea;
  /** @deprecated Use calculatePriceByArea instead */
  const calculatePriceWithVariant = calculatePriceByArea;

  return { calculatePrice, calculatePriceByArea, calculatePriceWithVariant, loading, error };
}

export function useTabelaPrecoPorCodigo(codigo: string | null) {
  return useQuery({
    queryKey: ['tabela-preco-codigo', codigo],
    queryFn: async (): Promise<TabelaPrecoOficial | null> => {
      if (!codigo) return null;
      const result = await invokeExternalDb<TabelaPrecoOficial>({
        table: 'tabela_preco_gravacao_oficial',
        operation: 'select',
        filters: { codigo },
        limit: 1,
      });
      return result.records?.[0] || null;
    },
    enabled: !!codigo,
    staleTime: 5 * 60 * 1000,
  });
}
