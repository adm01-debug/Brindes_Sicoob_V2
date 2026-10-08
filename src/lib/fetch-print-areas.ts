/**
 * Busca áreas de gravação de um produto do BD externo.
 * 
 * FONTE ÚNICA: tabela 'print_area_techniques' no BD externo.
 * Dados da técnica vêm via lookup em 'tabela_preco_gravacao_oficial'.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from "@/lib/logger";
import {
  adaptPrintAreaTechniqueRows,
  adaptTabelaPrecoRows,
  type TabelaPrecoCanonical,
  type PrintAreaTechniqueCanonical,
} from '@/lib/personalization/adapters';

export interface PrintAreaFromProduct {
  id: string;
  product_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  component_code: string | null;
  location_name: string | null;
  location_code: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  is_active: boolean;
  display_order: number;
  max_colors: number | null;
  allowed_technique_ids: string[];
  customization_price_table_id: string | null;
  supplier_technique_code?: string;
  serv_code?: string;
  area_cm2?: number | null;
  // Campos da técnica (resolvidos via JOIN conceitual)
  technique_name?: string | null;
  technique_code?: string | null;
  technique_group?: string | null;
  setup_cost?: number | null;
  charges_per_color?: boolean;
}

function definedOr<T>(value: T | null | undefined, fallback: T): T {
  return value === null || value === undefined ? fallback : value;
}

async function fetchRawPrintAreas(productId: string): Promise<PrintAreaTechniqueCanonical[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'print_area_techniques',
      operation: 'select',
      filters: { product_id: productId, is_active: true },
      orderBy: { column: 'technique_order', ascending: true },
      limit: 50,
    },
  });
  if (error || !data?.success) {
    logger.warn('[fetchPrintAreas] Erro ao buscar print_area_techniques:', error?.message || data?.error);
    return [];
  }
  return adaptPrintAreaTechniqueRows(data.data?.records || []);
}

function collectPriceTableIds(areas: PrintAreaTechniqueCanonical[]): Set<string> {
  const ids = new Set<string>();
  for (const area of areas) {
    const id = definedOr(area.price_table_id, area.tabela_preco_id);
    if (id) ids.add(id);
  }
  return ids;
}

async function fetchTechniquesById(ids: Set<string>): Promise<Map<string, TabelaPrecoCanonical>> {
  const techniques = new Map<string, TabelaPrecoCanonical>();
  if (ids.size === 0) return techniques;
  const { data } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tabela_preco_gravacao_oficial',
      operation: 'select',
      filters: { ativo: true },
      limit: 100,
    },
  });
  if (!data?.success) return techniques;
  for (const technique of adaptTabelaPrecoRows(data.data?.records || [])) {
    if (ids.has(technique.id)) techniques.set(technique.id, technique);
  }
  return techniques;
}

function techniqueCode(technique: Partial<TabelaPrecoCanonical>): string | null {
  return definedOr(
    technique.codigo_curto,
    definedOr(technique.codigo_tabela, definedOr(technique.code, definedOr(technique.codigo, null))),
  );
}

function maxTechniqueColors(technique: Partial<TabelaPrecoCanonical>): number | null {
  const value = definedOr(technique.max_colors, technique.max_cores);
  if (typeof value === 'string') return Number(value);
  return definedOr(value, null);
}

function displayAreaName(locationName: string | null, techniqueName: string | null, index: number): string {
  if (!locationName) return `Área ${index + 1}`;
  return techniqueName ? `${locationName} — ${techniqueName}` : locationName;
}

function calculatedArea(width: number, height: number): number | null {
  return width && height ? Number((width * height).toFixed(2)) : null;
}

function mapPrintArea(
  area: PrintAreaTechniqueCanonical,
  index: number,
  productId: string,
  techniques: Map<string, TabelaPrecoCanonical>,
): PrintAreaFromProduct {
  const techniqueId = definedOr(area.price_table_id, definedOr(area.tabela_preco_id, null));
  const technique: Partial<TabelaPrecoCanonical> = techniqueId
    ? definedOr<Partial<TabelaPrecoCanonical>>(techniques.get(techniqueId), {})
    : {};
  const name = definedOr(technique.name, definedOr(technique.nome, null));
  const code = techniqueCode(technique);
  const locationCode = definedOr(area.location_code, definedOr(area.area_code, ''));
  const locationName = definedOr(area.location_name, definedOr(area.area_name, null));
  const maxWidth = definedOr(area.max_width, definedOr(area.largura_max, 0));
  const maxHeight = definedOr(area.max_height, definedOr(area.altura_max, 0));
  const setupCost = definedOr(technique.custo_setup, definedOr(technique.setup_price, null));
  return {
    id: area.id || `${productId}-area-${index}`,
    product_id: productId,
    area_code: locationCode,
    area_name: displayAreaName(locationName, name, index),
    component_name: null,
    component_code: null,
    location_name: locationName,
    location_code: locationCode || null,
    max_width: maxWidth,
    max_height: maxHeight,
    unit: 'cm',
    shape: area.shape || 'rectangle',
    is_curved: definedOr(area.is_curved, false),
    is_primary: index === 0,
    is_active: definedOr(area.is_active, area.ativo) !== false,
    display_order: definedOr(area.technique_order, index),
    max_colors: maxTechniqueColors(technique),
    allowed_technique_ids: techniqueId ? [techniqueId] : [],
    customization_price_table_id: techniqueId,
    supplier_technique_code: code ?? undefined,
    serv_code: technique.codigo_curto ?? undefined,
    area_cm2: calculatedArea(maxWidth, maxHeight),
    technique_name: name,
    technique_code: code,
    technique_group: definedOr(
      technique.group_name,
      definedOr(technique.nome_grupo, definedOr(technique.group, definedOr(technique.grupo_tecnica, null))),
    ),
    setup_cost: typeof setupCost === 'number' ? setupCost : null,
    charges_per_color: Boolean(definedOr(technique.charges_per_color, technique.cobra_por_cor)),
  };
}

/**
 * Busca áreas de gravação da tabela print_area_techniques + resolve técnicas.
 * Retorna array vazio se o produto não tiver áreas configuradas.
 */
export async function fetchPrintAreasFromProduct(productId: string): Promise<PrintAreaFromProduct[]> {
  try {
    const areas = await fetchRawPrintAreas(productId);
    if (!areas.length) return [];
    const techniques = await fetchTechniquesById(collectPriceTableIds(areas));
    return areas.map((area, index) => mapPrintArea(area, index, productId, techniques));
  } catch (err) {
    logger.warn('[fetchPrintAreas] Exceção:', err);
    return [];
  }
}
