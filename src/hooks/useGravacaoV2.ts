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

// Re-export types & helpers for backward compat
export type { TabelaPrecoOficial, FaixaPrecoOficial, CustomizationPriceV2, PrintAreaWithTechniques } from './gravacao/gravacao-types';
export {
  TECHNIQUE_COLORS, TECHNIQUE_ICONS, AREA_SHAPES, QUANTITY_TIERS_REFERENCE,
  getTechniqueColor, getTechniqueIcon, formatPrice,
  calculateTotalWithColorDiscount, calculateSetupCost, findPriceTier, calculateCustomizationTotal,
} from './gravacao/gravacao-constants';

import type { TabelaPrecoOficial, FaixaPrecoOficial, CustomizationPriceV2, PrintAreaWithTechniques } from './gravacao/gravacao-types';

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

      return areas.map((area) => {
        const techniques: { id: string; nome: string; codigo: string }[] = [];
        for (const tid of (area.allowed_technique_ids || [])) {
          const tech = techById.get(tid);
          if (tech) techniques.push({ id: String(tech.id ?? ''), nome: String(tech.nome ?? ''), codigo: String(tech.codigo_curto ?? tech.codigo_tabela ?? '') });
        }
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
          techniques,
        };
      });
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
    larguraCm?: number | null, alturaCm?: number | null
  ): Promise<CustomizationPriceV2 | null> => {
    setLoading(true);
    setError(null);
    try {
      const rawResult = await invokeExternalRpc<Record<string, unknown>>(
        'fn_get_customization_price',
        { p_area_id: areaId, p_quantidade: quantidade, p_num_cores: numCores, p_largura_cm: larguraCm ?? null, p_altura_cm: alturaCm ?? null }
      );
      if (!rawResult?.success) { setLoading(false); return null; }

      const asRecord = (value: unknown): Record<string, unknown> =>
        (value && typeof value === 'object') ? (value as Record<string, unknown>) : {};
      const area = asRecord(rawResult.area);
      const faixa = asRecord(rawResult.faixa);
      const tabela = asRecord(rawResult.tabela);
      const parametros = asRecord(rawResult.parametros);
      const custos = asRecord(rawResult.custos);
      const precos = asRecord(rawResult.precos);
      const tabelaCodigo = (tabela.codigo_tabela as string | undefined) || '';

      const result: CustomizationPriceV2 = {
        success: true,
        area_id: (area.id as string | undefined) || areaId,
        area_code: (area.code as string | undefined) || '',
        area_name: (area.name as string | undefined) || '',
        area_order: (faixa.ordem as number | undefined) || 0,
        tabela_id: (tabela.id as string | undefined) || '',
        tabela_codigo: tabelaCodigo,
        tabela_codigo_curto: tabelaCodigo.split('-')[0] || '',
        technique: (tabela.nome as string | undefined) || '',
        codigo_orcamento: (rawResult.codigo_orcamento as string | undefined) || '',
        quantity: (parametros.quantidade as number | undefined) || quantidade,
        num_cores: (parametros.num_cores as number | undefined) || numCores,
        tier_used: (faixa.ordem as number | undefined) || 0,
        tier_min_qty: (faixa.quantidade_minima as number | undefined) || 0,
        tier_max_qty: (faixa.quantidade_maxima as number | undefined) || 0,
        cost_base_unit: (custos.custo_base_unitario as number | undefined) || 0,
        cost_unit_total: (custos.custo_unitario_total as number | undefined) || 0,
        cost_setup: (custos.custo_setup_base as number | undefined) || 0,
        cost_total: ((custos.custo_unitario_total as number | undefined) || 0) * quantidade,
        markup_percent: (precos.markup_percent as number | undefined) || 0,
        preco_minimo_unitario: 0,
        unit_price: (precos.preco_unitario_final as number | undefined) || 0,
        subtotal_pecas: (precos.subtotal_pecas as number | undefined) || 0,
        faturamento_minimo_gravacao: (precos.faturamento_minimo_gravacao as number | undefined) || 0,
        minimum_applied: (precos.aplica_minimo as boolean | undefined) || false,
        total_price: (precos.total_final as number | undefined) || 0,
        margin_percent: (precos.markup_percent as number | undefined) || 0,
        price_by_color: (tabela.cobra_por_cor as boolean | undefined) || false,
        setup_by_color: false,
        production_days: (faixa.prazo_dias as number | null | undefined) ?? null,
        largura_max_tecnica: (area.max_width as number | null | undefined) ?? null,
        altura_max_tecnica: (area.max_height as number | null | undefined) ?? null,
      };
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
