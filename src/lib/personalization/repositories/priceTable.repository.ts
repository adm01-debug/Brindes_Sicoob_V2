/**
 * Repository: Tabelas de Preço
 * 
 * Abstrai acesso a dados de tabelas de preço.
 * Único ponto de acesso ao BD externo para tabelas.
 */

import { invokeExternalDb } from '@/lib/external-db';
import { transformRawToTabelas, rawToTabelaPrecoTecnica } from '../transformers';
import type { TabelaPrecoTecnica, CustomizationPriceTableRaw } from '@/types/tecnica-unificada';
import { logger } from "@/lib/logger";

// ============================================
// TYPES
// ============================================

export interface PriceTableFilters {
  isActive?: boolean;
  techniqueId?: string;
  techniqueName?: string;
  tableCode?: string;
  tableCodeOption?: string;
  maxColors?: number;
  minColors?: number;
}

export interface PriceTableOrderBy {
  column: 'table_code' | 'table_code_option' | 'max_colors' | 'customization_type_name' | 'created_at';
  ascending?: boolean;
}

export interface PriceTableQueryOptions {
  filters?: PriceTableFilters;
  orderBy?: PriceTableOrderBy;
  limit?: number;
  offset?: number;
}

function databaseFilters(filters: PriceTableFilters = {}) {
  const result: Record<string, unknown> = {};
  if (filters.isActive !== undefined) result.is_active = filters.isActive;
  if (filters.techniqueId) result.technique_id = filters.techniqueId;
  if (filters.techniqueName) result.customization_type_name = filters.techniqueName;
  if (filters.tableCode) result.table_code = filters.tableCode;
  if (filters.tableCodeOption) result.table_code_option = filters.tableCodeOption;
  return result;
}

function filterByColorLimits(tables: TabelaPrecoTecnica[], filters: PriceTableFilters = {}) {
  let result = tables;
  const { maxColors, minColors } = filters;
  if (maxColors !== undefined) {
    result = result.filter((table) => table.maxCores !== null && table.maxCores <= maxColors);
  }
  if (minColors !== undefined) {
    result = result.filter((table) => table.maxCores !== null && table.maxCores >= minColors);
  }
  return result;
}

function selectBestTable(tables: TabelaPrecoTecnica[], colors?: number) {
  if (colors) {
    const matching = tables.find((table) => table.maxCores !== null && table.maxCores >= colors);
    if (matching) return matching;
  }
  return tables[tables.length - 1] ?? null;
}

function warnDimensionLimits(table: TabelaPrecoTecnica, widthCm?: number, heightCm?: number) {
  if (widthCm && table.larguraMaxCm && widthCm > table.larguraMaxCm) {
    logger.warn(`Largura ${widthCm}cm excede máximo ${table.larguraMaxCm}cm`);
  }
  if (heightCm && table.alturaMaxCm && heightCm > table.alturaMaxCm) {
    logger.warn(`Altura ${heightCm}cm excede máximo ${table.alturaMaxCm}cm`);
  }
}

// ============================================
// REPOSITORY
// ============================================

/**
 * Busca todas as tabelas com filtros opcionais
 */
export async function findAll(options: PriceTableQueryOptions = {}): Promise<TabelaPrecoTecnica[]> {
  const { filters, orderBy, limit = 500, offset } = options;

  // Construir filtros para o BD
  const dbFilters = databaseFilters(filters);

  const result = await invokeExternalDb<CustomizationPriceTableRaw>({
    table: 'customization_price_tables',
    operation: 'select',
    filters: Object.keys(dbFilters).length > 0 ? dbFilters : undefined,
    orderBy: orderBy ? {
      column: orderBy.column,
      ascending: orderBy.ascending ?? true,
    } : { column: 'table_code_option', ascending: true },
    limit,
    offset,
  });

  return filterByColorLimits(transformRawToTabelas(result.records ?? []), filters);
}

/**
 * Busca tabela por ID
 */
export async function findById(id: string): Promise<TabelaPrecoTecnica | null> {
  const result = await invokeExternalDb<CustomizationPriceTableRaw>({
    table: 'customization_price_tables',
    operation: 'select',
    filters: { id },
    limit: 1,
  });

  const raw = result.records?.[0];
  return raw ? rawToTabelaPrecoTecnica(raw) : null;
}

/**
 * Busca tabela por código de opção
 */
export async function findByCodeOption(codeOption: string): Promise<TabelaPrecoTecnica | null> {
  const result = await invokeExternalDb<CustomizationPriceTableRaw>({
    table: 'customization_price_tables',
    operation: 'select',
    filters: { table_code_option: codeOption },
    limit: 1,
  });

  const raw = result.records?.[0];
  return raw ? rawToTabelaPrecoTecnica(raw) : null;
}

/**
 * Busca tabelas por nome da técnica
 */
export async function findByTechniqueName(techniqueName: string): Promise<TabelaPrecoTecnica[]> {
  return findAll({
    filters: { techniqueName, isActive: true },
    orderBy: { column: 'max_colors', ascending: true },
  });
}

/**
 * Busca tabela adequada para parâmetros específicos
 */
export async function findBestMatch(params: {
  techniqueName: string;
  colors?: number;
  widthCm?: number;
  heightCm?: number;
}): Promise<TabelaPrecoTecnica | null> {
  const { techniqueName, colors, widthCm, heightCm } = params;

  const tabelas = await findByTechniqueName(techniqueName);
  
  if (tabelas.length === 0) return null;

  // Encontrar tabela que comporta o número de cores
  const selected = selectBestTable(tabelas, colors);
  if (selected) warnDimensionLimits(selected, widthCm, heightCm);
  return selected;
}

/**
 * Lista nomes de técnicas únicos
 */
export async function findTechniqueNames(): Promise<string[]> {
  const result = await invokeExternalDb<{ customization_type_name: string }>({
    table: 'customization_price_tables',
    operation: 'select',
    select: 'customization_type_name',
    filters: { is_active: true },
  });

  const nomes = [...new Set((result.records ?? []).map(r => r.customization_type_name))];
  return nomes.sort();
}

/**
 * Lista códigos de tabela únicos
 */
export async function findTableCodes(): Promise<string[]> {
  const result = await invokeExternalDb<{ table_code: string }>({
    table: 'customization_price_tables',
    operation: 'select',
    select: 'table_code',
    filters: { is_active: true },
  });

  const codes = [...new Set((result.records ?? []).map(r => r.table_code))];
  return codes.sort();
}

/**
 * Conta tabelas por técnica
 */
export async function countByTechnique(): Promise<Map<string, number>> {
  const tabelas = await findAll({ filters: { isActive: true } });
  
  const countMap = new Map<string, number>();
  for (const tabela of tabelas) {
    const count = countMap.get(tabela.nomeTecnica) || 0;
    countMap.set(tabela.nomeTecnica, count + 1);
  }
  
  return countMap;
}

// ============================================
// EXPORTS
// ============================================

export const PriceTableRepository = {
  findAll,
  findById,
  findByCodeOption,
  findByTechniqueName,
  findBestMatch,
  findTechniqueNames,
  findTableCodes,
  countByTechnique,
};

export default PriceTableRepository;
