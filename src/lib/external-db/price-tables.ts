/**
 * Price tables for Promobrind customization.
 */
import { invokeExternalDb } from './bridge';

export interface PromobrindPriceTable {
  id: string;
  table_code: string;
  table_code_option: string;
  customization_type_name: string;
  technique_code: string | null;
  min_quantity: number;
  max_quantity: number | null;
  min_colors: number | null;
  max_colors: number | null;
  max_area_width_cm: number | null;
  max_area_height_cm: number | null;
  unit_price: number;
  setup_price: number | null;
  handling_price: number | null;
  sla_days: number | null;
  is_active: boolean;
  code_option?: string;
  technique_name?: string;
}

type PriceTableOptions = {
  techniqueName?: string;
  techniqueCode?: string;
  quantity?: number;
  colors?: number;
  width?: number;
  height?: number;
};

function numericOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && value !== 0 ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return numericOr(value, 0) || null;
}

function mapPriceTable(row: Record<string, unknown>): PromobrindPriceTable {
  return {
    id: row.id as string,
    table_code: row.table_code as string,
    table_code_option: row.table_code_option as string,
    customization_type_name: row.customization_type_name as string,
    technique_code: (row.serv_code || row.table_code) as string | null,
    min_quantity: numericOr(row.tier_1_min_qty, 1),
    max_quantity: nullableNumber(row.tier_15_min_qty),
    min_colors: null,
    max_colors: nullableNumber(row.max_colors),
    max_area_width_cm: nullableNumber(row.max_area_width_cm),
    max_area_height_cm: nullableNumber(row.max_area_height_cm),
    unit_price: numericOr(row.tier_1_unit_price, 0),
    setup_price: nullableNumber(row.setup_price),
    handling_price: nullableNumber(row.handling_price),
    sla_days: nullableNumber(row.tier_1_sla_days),
    is_active: row.is_active as boolean,
    code_option: row.table_code_option as string,
    technique_name: row.customization_type_name as string,
  };
}

function filterByQuantity(tables: PromobrindPriceTable[], quantity?: number): PromobrindPriceTable[] {
  if (!quantity) return tables;
  return tables.filter(table => table.min_quantity <= quantity && (table.max_quantity === null || table.max_quantity >= quantity));
}

function filterByColors(tables: PromobrindPriceTable[], colors?: number): PromobrindPriceTable[] {
  if (!colors) return tables;
  return tables.filter(table => (table.min_colors === null || table.min_colors <= colors) && (table.max_colors === null || table.max_colors >= colors));
}

function filterByMaximum(tables: PromobrindPriceTable[], value: number | undefined, field: 'max_area_width_cm' | 'max_area_height_cm'): PromobrindPriceTable[] {
  if (!value) return tables;
  return tables.filter(table => table[field] === null || table[field] >= value);
}

export async function fetchPromobrindPriceTables(options?: PriceTableOptions): Promise<PromobrindPriceTable[]> {
  const filters: Record<string, unknown> = { is_active: true };
  if (options?.techniqueName) filters.customization_type_name = options.techniqueName;
  if (options?.techniqueCode) filters.table_code = options.techniqueCode;

  const result = await invokeExternalDb<Record<string, unknown>>({
    table: 'customization_price_tables', operation: 'select',
    filters, select: '*', limit: 500,
    orderBy: { column: 'tier_1_min_qty', ascending: true },
  });

  let tables = (result.records ?? []).map(mapPriceTable);
  tables = filterByQuantity(tables, options?.quantity);
  tables = filterByColors(tables, options?.colors);
  tables = filterByMaximum(tables, options?.width, 'max_area_width_cm');
  tables = filterByMaximum(tables, options?.height, 'max_area_height_cm');
  return tables;
}

export async function findBestPriceTable(options: {
  techniqueName?: string;
  techniqueCode?: string;
  quantity: number;
  colors?: number;
  width?: number;
  height?: number;
}): Promise<PromobrindPriceTable | null> {
  const tables = await fetchPromobrindPriceTables(options);
  return tables[0] || null;
}
