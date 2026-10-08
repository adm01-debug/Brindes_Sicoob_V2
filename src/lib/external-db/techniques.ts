/**
 * Techniques and Print Areas for Promobrind.
 */
import { invokeExternalDb } from './bridge';
import type { PrintAreaFromProduct } from '@/lib/fetch-print-areas';

export interface PromobrindPrintArea {
  id: string;
  product_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  location_name: string | null;
  max_width_cm: number | null;
  max_height_cm: number | null;
  max_area_cm2: number | null;
  is_curved: boolean;
  technique_id: string | null;
  technique_code: string | null;
  technique_name: string | null;
  max_colors: number | null;
  is_default: boolean;
  area_image_url: string | null;
}

export interface PromobrindTechnique {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  category?: string | null;
  setup_price?: number | null;
  handling_price?: number | null;
  base_cost_multiplier?: number | null;
  requires_color_count?: boolean;
  min_colors?: number;
  max_colors?: number | null;
  price_by_color?: boolean;
  price_by_area?: boolean;
  is_active?: boolean;
  display_order?: number;
  setup_cost?: number | null;
  unit_cost?: number | null;
  min_quantity?: number | null;
  estimated_days?: number | null;
  [key: string]: unknown;
}

const TECHNIQUE_SELECT_FIELDS = 'id, codigo, code, nome, name, descricao, description, permite_cores, requires_color_count, max_cores, max_colors, cobra_por_cor, price_by_color, cobra_por_area, price_by_area, ativo, is_active, tempo_producao_dias, estimated_days, ordem_exibicao, display_order';

function firstField(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'string' ? value : String(value);
}

function optionalBoolean(value: unknown): boolean | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'boolean' ? value : Boolean(value);
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  return typeof value === 'number' ? value : Number(value);
}

function firstTruthy<T>(fallback: T, ...values: Array<T | null | undefined | false | '' | 0>): T {
  for (const value of values) {
    if (value) return value as T;
  }
  return fallback;
}

function printAreaTechniqueFields(technique?: Record<string, unknown>, fallbackId?: string) {
  return {
    technique_id: firstTruthy<string | null>(null, technique?.id as string | undefined, fallbackId),
    technique_code: optionalString(technique?.codigo) ?? null,
    technique_name: optionalString(technique?.nome) ?? null,
    max_colors: optionalNumber(technique?.max_cores) ?? null,
  };
}

function mapTechniqueFields(t: Record<string, unknown>): PromobrindTechnique {
  const maxCoresRaw = firstField(t, 'max_cores', 'max_colors');
  const maxCores = typeof maxCoresRaw === 'number' ? maxCoresRaw : typeof maxCoresRaw === 'string' ? Number(maxCoresRaw) : null;
  return {
    ...t,
    id: t.id as string,
    code: optionalString(firstField(t, 'codigo', 'code')),
    name: optionalString(firstField(t, 'nome', 'name')) ?? '',
    description: optionalString(firstField(t, 'descricao', 'description')) ?? null,
    requires_color_count: optionalBoolean(firstField(t, 'permite_cores', 'requires_color_count')),
    max_colors: Number.isFinite(maxCores as number) ? (maxCores as number) : null,
    price_by_color: optionalBoolean(firstField(t, 'cobra_por_cor', 'price_by_color')),
    price_by_area: optionalBoolean(firstField(t, 'cobra_por_area', 'price_by_area')),
    is_active: optionalBoolean(firstField(t, 'ativo', 'is_active')) ?? true,
    estimated_days: optionalNumber(firstField(t, 'tempo_producao_dias', 'estimated_days')) ?? null,
    display_order: optionalNumber(firstField(t, 'ordem_exibicao', 'display_order')),
    setup_price: null, handling_price: null, setup_cost: null, unit_cost: null, min_quantity: null,
  };
}

function mappedPrintArea(
  area: PrintAreaFromProduct,
  productId: string,
  technique?: Record<string, unknown>,
  fallbackTechniqueId?: string,
): PromobrindPrintArea {
  return {
    id: area.id,
    product_id: productId,
    area_code: firstTruthy('', area.area_code),
    area_name: firstTruthy('', area.area_name, area.location_name),
    component_name: area.component_name,
    location_name: area.location_name,
    max_width_cm: area.max_width,
    max_height_cm: area.max_height,
    max_area_cm2: null,
    is_curved: Boolean(area.is_curved),
    ...printAreaTechniqueFields(technique, fallbackTechniqueId),
    is_default: Boolean(area.is_primary),
    area_image_url: null,
  };
}

function expandPrintArea(area: PrintAreaFromProduct, productId: string, techniques: Map<string, Record<string, unknown>>): PromobrindPrintArea[] {
  if (area.allowed_technique_ids.length === 0) return [mappedPrintArea(area, productId)];
  return area.allowed_technique_ids.map(techniqueId => mappedPrintArea(area, productId, techniques.get(techniqueId), techniqueId));
}

export async function fetchPromobrindPrintAreas(productId: string): Promise<PromobrindPrintArea[]> {
  const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');
  const areas = await fetchPrintAreasFromProduct(productId);
  if (!areas.length) return [];

  const techResult = await invokeExternalDb<Record<string, unknown>>({
    table: 'tabela_preco_gravacao_oficial', operation: 'select',
    filters: { ativo: true }, limit: 100,
  });
  const techById = new Map((techResult.records || []).map((t) => [t.id as string, t]));
  return areas.flatMap(area => expandPrintArea(area, productId, techById));
}

export async function fetchPromobrindTechniques(options?: {
  ids?: string[]; codes?: string[]; limit?: number;
}): Promise<PromobrindTechnique[]> {
  const filters: Record<string, unknown> = { ativo: true };
  if (options?.ids?.length) filters.id = options.ids;
  if (options?.codes?.length) filters.codigo = options.codes;

  const result = await invokeExternalDb<PromobrindTechnique>({
    table: 'tecnica_gravacao', operation: 'select', filters,
    select: TECHNIQUE_SELECT_FIELDS, limit: options?.limit || 100,
    orderBy: { column: 'ordem_exibicao', ascending: true },
  });
  return (result.records || []).map(mapTechniqueFields);
}

export async function fetchPromobrindTechniqueById(techniqueId: string): Promise<PromobrindTechnique | null> {
  const result = await invokeExternalDb<PromobrindTechnique>({
    table: 'tecnica_gravacao', operation: 'select',
    filters: { id: techniqueId }, select: TECHNIQUE_SELECT_FIELDS, limit: 1,
  });
  const tech = result.records?.[0];
  return tech ? mapTechniqueFields(tech) : null;
}
