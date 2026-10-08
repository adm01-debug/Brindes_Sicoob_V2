/**
 * Hook: Lista de Técnicas
 * 
 * ============================================
 * IMPORTANTE: USA SOMENTE O BD EXTERNO PROMOBRIND!
 * Tabela real: tabela_preco_gravacao_oficial
 * O bridge mapeia 'tecnica_gravacao' → tabela real
 * ============================================
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TECNICAS_QUERY_OPTIONS } from '@/lib/query-config';
import { TECNICAS_QUERY_KEYS } from './keys';
import type { 
  TecnicaUnificada, 
  TecnicaResumo,
  TecnicaFiltros,
} from '@/types/tecnica-unificada';
import { adaptTecnicaRow, adaptTecnicaRows, type TecnicaGravacaoCanonical } from '@/lib/personalization/adapters';

const EXTERNAL_DB_BRIDGE_FUNCTION = 'external-db-bridge';

/**
 * Shape retornado pelo bridge, **após** passar pelo adapter — contém ambos
 * os nomes (PT legado + EN canônico). Consumidores podem ler qualquer um.
 */
type TecnicaBridgeResponse = TecnicaGravacaoCanonical;

function firstDefined<T>(values: Array<T | null | undefined>, fallback: T): T {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return fallback;
}

function parseMaxColors(row: TecnicaBridgeResponse): number {
  const value = row.max_colors ?? row.max_cores;
  return typeof value === 'string' ? parseInt(value, 10) : (value ?? 0);
}

function readSetupCost(row: TecnicaBridgeResponse): number {
  const value = row.custo_setup ?? row.setup_price ?? (row as { setup_cost?: number }).setup_cost;
  return typeof value === 'number' ? value : 0;
}

function readMinimumQuantity(row: TecnicaBridgeResponse): number | null {
  return (row as { min_quantity?: number | null }).min_quantity ?? row.quantidade_corte ?? null;
}

function readProductionDays(row: TecnicaBridgeResponse): number | null {
  return firstDefined([
    row.production_days,
    row.tempo_producao_dias,
    (row as { estimated_days?: number | null }).estimated_days,
  ], null);
}

function readCategory(row: TecnicaBridgeResponse): string {
  return firstDefined([row.group_name, row.nome_grupo, row.group, row.grupo_tecnica], 'geral');
}

function matchesSearch(tecnica: TecnicaUnificada, search: string | undefined): boolean {
  if (!search) return true;
  const term = search.toLowerCase();
  return [tecnica.nome, tecnica.codigo, tecnica.descricao ?? '']
    .some(value => value.toLowerCase().includes(term));
}

function matchesFilters(tecnica: TecnicaUnificada, filtros: TecnicaFiltros): boolean {
  const requirements = [
    !filtros.apenasAtivas || tecnica.ativo,
    !filtros.categoria || tecnica.categoria === filtros.categoria,
    filtros.permiteCores === undefined || tecnica.permiteCores === filtros.permiteCores,
    filtros.precoPorArea === undefined || tecnica.precoPorArea === filtros.precoPorArea,
    filtros.precoPorPontos === undefined || tecnica.precoPorPontos === filtros.precoPorPontos,
    filtros.aplicaCurva === undefined || tecnica.aplicaSuperficieCurva === filtros.aplicaCurva,
    matchesSearch(tecnica, filtros.busca),
  ];
  return requirements.every(Boolean);
}

/**
 * Transforma resposta canônica do adapter para TecnicaUnificada.
 * Lê tanto nomes antigos (PT) quanto novos (EN), com preferência ao EN
 * quando ambos estão presentes.
 */
function bridgeToTecnicaUnificada(row: TecnicaBridgeResponse): TecnicaUnificada {
  const maxCores = parseMaxColors(row);
  const handling = firstDefined([row.handling_price, row.custo_manuseio], 0);
  const curva = firstDefined([row.applies_to_curved, row.aplica_superficie_curva, row.is_curved], false);
  const ordem = firstDefined([row.display_order, row.ordem_exibicao, row.ordem_grupo], 0);

  return {
    id: row.id,
    codigo: firstDefined([row.code, row.codigo], ''),
    codigoFornecedor: firstDefined([row.internal_code, row.codigo_interno], null),
    codigoStricker: null,
    nome: firstDefined([row.name, row.nome], ''),
    descricao: firstDefined([row.description, row.descricao], null),
    categoria: readCategory(row),
    icone: null,
    permiteCores: firstDefined([row.allows_colors, row.permite_cores], maxCores > 0),
    minCores: 1,
    maxCores: maxCores || 0,
    precoPorCor: firstDefined([row.charges_per_color, row.cobra_por_cor], false),
    precoCorExtra: 0,
    precoPorArea: firstDefined([row.price_by_area, row.cobra_por_area], false),
    precoPorPontos: firstDefined([row.price_by_points, row.cobra_por_pontos], false),
    areaMinimaCm2: null,
    areaMaximaCm2: firstDefined([row.max_area_cm2, row.area_maxima_cm2], null),
    pontosMaximos: null,
    custoSetup: readSetupCost(row),
    custoManuseio: typeof handling === 'number' ? handling : 0,
    multiplicadorCusto: 1,
    quantidadeMinima: readMinimumQuantity(row),
    prazoEstimado: readProductionDays(row),
    aplicaSuperficieCurva: !!curva,
    promptSuffix: null,
    ativo: !!firstDefined([row.active, row.ativo], true),
    ordemExibicao: typeof ordem === 'number' ? ordem : 0,
    fonte: 'externo',
    criadoEm: firstDefined([row.created_at], ''),
    atualizadoEm: firstDefined([row.updated_at], ''),
  };
}

function isBridgeTechniqueActive(tecnica: TecnicaBridgeResponse): boolean {
  return firstDefined([tecnica.active, tecnica.ativo], true);
}

function toTecnicaResumo(tecnica: TecnicaBridgeResponse): TecnicaResumo {
  const maxCores = parseMaxColors(tecnica);
  return {
    id: tecnica.id,
    codigo: firstDefined([tecnica.code, tecnica.codigo], ''),
    nome: firstDefined([tecnica.name, tecnica.nome], ''),
    categoria: readCategory(tecnica),
    permiteCores: firstDefined([tecnica.allows_colors, tecnica.permite_cores], maxCores > 0),
    maxCores,
    precoPorCor: firstDefined([tecnica.charges_per_color, tecnica.cobra_por_cor], false),
    precoPorArea: firstDefined([tecnica.price_by_area, tecnica.cobra_por_area], false),
    ativo: isBridgeTechniqueActive(tecnica),
  };
}

/**
 * Busca técnicas do BD EXTERNO via edge function (já passa por adapter).
 */
async function fetchTecnicasExterno(): Promise<TecnicaBridgeResponse[]> {
  const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      orderBy: { column: 'ordem_exibicao', ascending: true },
      limit: 200,
    },
  });

  if (error) {
    console.error('Erro ao buscar técnicas do BD externo:', error);
    throw error;
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro desconhecido ao buscar técnicas');
  }

  return adaptTecnicaRows(data.data?.records || []);
}

/**
 * Lista completa de técnicas do BD EXTERNO com filtros
 */
export function useTecnicasList(filtros?: TecnicaFiltros) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.lista(), filtros],
    queryFn: async (): Promise<TecnicaUnificada[]> => {
      const rawData = await fetchTecnicasExterno();
      const tecnicas = rawData.map(bridgeToTecnicaUnificada);
      return filtros ? tecnicas.filter(tecnica => matchesFilters(tecnica, filtros)) : tecnicas;
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Lista resumida de técnicas do BD EXTERNO para dropdowns
 */
export function useTecnicasResumo(apenasAtivas = true) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.resumo(), apenasAtivas],
    queryFn: async (): Promise<TecnicaResumo[]> => {
      const rawData = await fetchTecnicasExterno();

      let tecnicas = rawData;
      if (apenasAtivas) {
        tecnicas = tecnicas.filter(isBridgeTechniqueActive);
      }

      return tecnicas.map(toTecnicaResumo);
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por ID do BD EXTERNO
 */
export function useTecnicaById(id: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.detalhe(id ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!id) return null;

      const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { id },
          limit: 1,
        },
      });

      if (error) throw error;

      const records = data?.data?.records || [];
      return records.length > 0 ? bridgeToTecnicaUnificada(adaptTecnicaRow(records[0])) : null;
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Técnica por código do BD EXTERNO
 */
export function useTecnicaByCodigo(codigo: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.porCodigo(codigo ?? ''),
    queryFn: async (): Promise<TecnicaUnificada | null> => {
      if (!codigo) return null;

      const { data, error } = await supabase.functions.invoke(EXTERNAL_DB_BRIDGE_FUNCTION, {
        body: {
          table: 'tecnica_gravacao',
          operation: 'select',
          filters: { codigo },
          limit: 1,
        },
      });

      if (error) throw error;

      const records = data?.data?.records || [];
      return records.length > 0 ? bridgeToTecnicaUnificada(adaptTecnicaRow(records[0])) : null;
    },
    ...TECNICAS_QUERY_OPTIONS,
  });
}

/**
 * Lista de categorias únicas (baseado em grupo_tecnica/nome_grupo)
 */
export function useCategoriasTecnicas() {
  const { data: tecnicas = [] } = useTecnicasList({ apenasAtivas: true });
  
  return [...new Set(tecnicas.map(t => t.categoria))].filter(c => c !== 'geral').sort();
}

/**
 * Invalidar todas as queries de técnicas
 */
export function useInvalidateTecnicas() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
  };
}
