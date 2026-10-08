/**
 * Hooks: Áreas de Gravação (Print Areas)
 * 
 * FONTE ÚNICA: tabela 'print_area_techniques' no BD externo.
 * Técnicas resolvidas via lookup em 'tabela_preco_gravacao_oficial'.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AreaShape, PrintAreaWithTechniques, TecnicaGravacao } from '@/types/gravacao';
import { logger } from "@/lib/logger";
import {
  adaptPrintAreaTechniqueRows,
  adaptTabelaPrecoRows,
  adaptTecnicaRows,
  type PrintAreaTechniqueCanonical,
  type TabelaPrecoCanonical,
} from '@/lib/personalization/adapters';

const EXTERNAL_DB_BRIDGE_FUNCTION = 'external-db-bridge';

function areaShape(shape: string | null | undefined): AreaShape {
  const valid: AreaShape[] = ['rectangle', 'circle', 'oval', 'triangle', 'custom'];
  return valid.includes(shape as AreaShape) ? shape as AreaShape : 'rectangle';
}

function areaTechnique(tech: TabelaPrecoCanonical | null | undefined) {
  if (!tech) return [];
  return [{
    id: tech.id,
    nome: tech.name ?? tech.nome ?? '',
    codigo: tech.codigo_curto ?? tech.codigo_tabela ?? tech.code ?? tech.codigo ?? '',
  }];
}

function areaLocation(area: PrintAreaTechniqueCanonical) {
  return {
    name: area.location_name ?? area.area_name ?? null,
    code: area.location_code ?? area.area_code ?? '',
  };
}

function areaDimensions(area: PrintAreaTechniqueCanonical) {
  return {
    max_width: area.max_width ?? area.largura_max ?? 0,
    max_height: area.max_height ?? area.altura_max ?? 0,
  };
}

function areaTechniqueId(area: PrintAreaTechniqueCanonical) {
  return area.price_table_id ?? area.tabela_preco_id ?? null;
}

async function fetchPriceTechniques() {
  const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
    body: {
      table: 'tabela_preco_gravacao_oficial',
      operation: 'select',
      filters: { ativo: true },
      limit: 100,
    },
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error || 'Erro ao buscar técnicas');
  return adaptTabelaPrecoRows(data.data?.records || []);
}

function toPrintArea(
  area: PrintAreaTechniqueCanonical,
  index: number,
  techniquesById: Map<string, TabelaPrecoCanonical>,
): PrintAreaWithTechniques {
  const techniqueId = areaTechniqueId(area);
  const technique = techniqueId ? techniquesById.get(techniqueId) : null;
  const location = areaLocation(area);
  const techniqueName = technique?.name ?? technique?.nome;
  const displayName = location.name
    ? (techniqueName ? `${location.name} — ${techniqueName}` : location.name)
    : `Área ${index + 1}`;
  return {
    area_id: area.id,
    area_code: location.code,
    area_name: displayName,
    component_name: null,
    location_name: location.name,
    ...areaDimensions(area),
    unit: 'cm',
    shape: areaShape(area.shape),
    is_curved: area.is_curved ?? false,
    is_primary: index === 0,
    display_order: area.technique_order ?? index,
    techniques: areaTechnique(technique),
  };
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Busca áreas de gravação de um produto via print_area_techniques.
 */
async function fetchProductPrintAreas(productId: string): Promise<PrintAreaTechniqueCanonical[]> {
  try {
    const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
      body: {
        table: 'print_area_techniques',
        operation: 'select',
        filters: { product_id: productId, is_active: true },
        orderBy: { column: 'technique_order', ascending: true },
        limit: 50,
      },
    });

    if (error || !data?.success) {
      logger.warn('[usePrintAreas] Erro ao buscar print_area_techniques:', error?.message || data?.error);
      return [];
    }

    return adaptPrintAreaTechniqueRows(data.data?.records || []);
  } catch (err) {
    logger.warn('[usePrintAreas] Exceção ao buscar áreas:', err);
    return [];
  }
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook: Busca áreas de gravação de um produto com técnicas resolvidas
 */
export function usePrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['print-areas', productId],
    queryFn: async (): Promise<PrintAreaWithTechniques[]> => {
      if (!productId) return [];

      const areas = await fetchProductPrintAreas(productId);
      if (!areas.length) return [];

      // Buscar técnicas ativas
      const allTechs = await fetchPriceTechniques();
      const techById = new Map(allTechs.map(t => [t.id, t]));

      return areas.map((area, index) => toPrintArea(area, index, techById));
    },
    enabled: !!productId,
    staleTime: 60000,
  });
}

/**
 * Hook: Busca todas as técnicas de gravação ativas
 */
export function useTechniques() {
  return useQuery({
    queryKey: ['techniques-all'],
    queryFn: async (): Promise<TecnicaGravacao[]> => {
      const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { ativo: true },
          orderBy: { column: 'ordem_exibicao', ascending: true },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar técnicas');

      return adaptTecnicaRows(data.data?.records || []) as unknown as TecnicaGravacao[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook: Busca estatísticas de uso das técnicas
 */
export function useTechniqueStats() {
  return useQuery({
    queryKey: ['technique-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
        body: {
          table: 'v_technique_stats',
          operation: 'select',
          orderBy: { column: 'produtos_com_tecnica', ascending: false },
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Erro ao buscar estatísticas');

      return data.data?.records || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Hook: Verifica se um produto tem áreas de gravação
 */
export function useHasPrintAreas(productId: string | null) {
  return useQuery({
    queryKey: ['has-print-areas', productId],
    queryFn: async (): Promise<boolean> => {
      if (!productId) return false;

      try {
        const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
          body: {
            table: 'print_area_techniques',
            operation: 'select',
            select: 'id',
            filters: { product_id: productId, is_active: true },
            limit: 1,
          },
        });

        if (error || !data?.success) return false;
        const records = data.data?.records || [];
        return records.length > 0;
      } catch {
        return false;
      }
    },
    enabled: !!productId,
    staleTime: 60000,
  });
}
