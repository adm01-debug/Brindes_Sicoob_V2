/**
 * Price response adapter — Tradutor unificado de payloads do RPC
 * `fn_get_customization_price` para o tipo canônico `CustomizationPriceFlat`.
 *
 * Suporta 3 formatos:
 *   1. v5.9-nested  — `{ area: {...}, tabela: {...}, faixa: {...}, custos: {...}, precos: {...} }`
 *   2. v6.x-flat    — payload achatado em PT (`preco_unitario`, `valor_gravacao`, ...)
 *   3. v7-new       — payload hipotético em EN (`unit_price`, `subtotal_pieces`, ...)
 *
 * O front continua falando o "idioma canônico". Quando o back mudar nomes
 * de colunas, basta atualizar o `RENAME_MAP_V7` aqui — nenhum consumidor
 * precisa ser tocado.
 */

import type { CustomizationPriceFlat } from '@/hooks/useGravacaoPriceV2';
import { detectPriceSchema, warnUnknownSchemaOnce, type PriceSchemaVersion } from './schema-detection';
import { validateRpcPayload } from '@/lib/personalization/rpc-validator';
import { PRICE_CONTRACT } from '@/lib/personalization/rpc-contracts';

// ============================================
// MAPA DE RENOMEAÇÃO v7 (futuro)
// ============================================

/**
 * Mapeamento de nomes futuros (EN) → nomes atuais (PT).
 * Aplicado ANTES do parser flat para que o mesmo código atenda ambos.
 * Evolui conforme o back migra colunas.
 */
const RENAME_MAP_V7: Record<string, string> = {
  unit_price: 'preco_unitario',
  unit_price_per_piece: 'preco_por_unidade',
  subtotal_pieces: 'valor_gravacao',
  total_charged: 'total_cobrado',
  setup_total_value: 'setup_total',
  table_code: 'tabela',
  table_name: 'nome_tabela',
  technique_group: 'grupo_tecnica',
  quantity: 'quantidade',
  num_colors: 'num_cores',
  production_days: 'prazo_dias',
};

function normalizeV7Aliases(resp: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...resp };
  for (const [alias, canonical] of Object.entries(RENAME_MAP_V7)) {
    copyAlias(out, alias, canonical);
  }
  copyNestedAliases(out, 'markup', {
    unit_cost: 'custo_unitario',
    setup_cost_table: 'custo_setup_tabela',
    markup_percent: 'markup_pct',
  });
  copyNestedAliases(out, 'detalhes', {
    charges_per_color: 'cobra_por_cor',
    max_colors: 'max_cores',
  });
  copyNestedAliases(out, 'faixa', {
    min_qty: 'qtd_min',
    max_qty: 'qtd_max',
    production_days: 'prazo_dias',
  });
  return out;
}

function copyAlias(target: Record<string, unknown>, alias: string, canonical: string): void {
  if (!(alias in target) || canonical in target) return;
  target[canonical] = target[alias];
}

function copyNestedAliases(
  target: Record<string, unknown>,
  property: string,
  aliases: Record<string, string>,
): void {
  const nested = target[property];
  if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return;
  for (const [alias, canonical] of Object.entries(aliases)) {
    copyAlias(nested as Record<string, unknown>, alias, canonical);
  }
}

// ============================================
// PARSERS POR FORMATO
// ============================================

interface NestedPriceResponse extends Record<string, unknown> {
  success?: boolean;
  area?: { id?: string; code?: string; name?: string };
  tabela?: {
    id?: string;
    codigo_tabela?: string;
    nome?: string;
    grupo_tecnica?: string;
    cobra_por_cor?: boolean;
    max_cores?: number;
  };
  codigo_orcamento?: string;
  parametros?: { quantidade?: number; num_cores?: number };
  precos?: {
    preco_unitario_final?: number;
    subtotal_pecas?: number;
    faturamento_minimo_gravacao?: number;
    aplica_minimo?: boolean;
    total_final?: number;
    markup_percent?: number;
  };
  custos?: {
    custo_base_unitario?: number;
    custo_unitario_total?: number;
    custo_setup_base?: number;
  };
  faixa?: { prazo_dias?: number; ordem?: number; quantidade_minima?: number; quantidade_maxima?: number };
  redirected_from?: string;
  redirected_to?: string;
}

interface FlatPriceResponse extends Record<string, unknown> {
  success?: boolean;
  area_id?: string;
  area_code?: string;
  nome_tabela?: string;
  tabela_id?: string;
  tabela?: string;
  grupo_tecnica?: string;
  codigo_orcamento?: string;
  quantidade?: number;
  num_cores?: number;
  preco_unitario?: number;
  preco_por_unidade?: number;
  valor_gravacao?: number;
  setup_total?: number;
  total_cobrado?: number;
  prazo_dias?: number;
  markup?: { custo_unitario?: number; custo_setup_tabela?: number; markup_pct?: number };
  detalhes?: { cobra_por_cor?: boolean; max_cores?: number };
  faixa?: { prazo_dias?: number; faixa_id?: string | number; qtd_min?: number; qtd_max?: number };
  redirected_from?: string;
  redirected_to?: string;
}

function firstDefined<T>(...values: Array<T | null | undefined>): T | undefined {
  return values.find((value) => value !== null && value !== undefined) ?? undefined;
}

function withDefault<T>(fallback: T, ...values: Array<T | null | undefined>): T {
  return firstDefined(...values) ?? fallback;
}

function parseNested(resp: NestedPriceResponse): CustomizationPriceFlat {
  const area = resp.area ?? {};
  const tabela = resp.tabela ?? {};
  const parametros = resp.parametros ?? {};
  const precos = resp.precos ?? {};
  const custos = resp.custos ?? {};
  const faixa = resp.faixa ?? {};
  const tableCode = withDefault('', tabela.codigo_tabela);
  return {
    success: !!resp.success,
    area_id: withDefault('', area.id),
    area_code: withDefault('', area.code),
    area_name: withDefault('', area.name),
    tabela_id: withDefault('', tabela.id),
    tabela_codigo: tableCode,
    tabela_codigo_curto: firstDefined(tableCode.split('-')[0], tableCode, '') ?? '',
    technique: withDefault('', tabela.nome),
    grupo_tecnica: withDefault('', tabela.grupo_tecnica),
    codigo_orcamento: withDefault('', resp.codigo_orcamento),
    quantity: withDefault(0, parametros.quantidade),
    num_cores: withDefault(1, parametros.num_cores),
    unit_price: withDefault(0, precos.preco_unitario_final),
    subtotal_pecas: withDefault(0, precos.subtotal_pecas),
    faturamento_minimo_gravacao: withDefault(0, precos.faturamento_minimo_gravacao),
    minimum_applied: withDefault(false, precos.aplica_minimo),
    total_price: withDefault(0, precos.total_final),
    cost_base_unit: withDefault(0, custos.custo_base_unitario),
    cost_unit_total: withDefault(0, custos.custo_unitario_total),
    cost_setup: withDefault(0, custos.custo_setup_base),
    markup_percent: withDefault(0, precos.markup_percent),
    margin_percent: withDefault(0, precos.markup_percent),
    price_by_color: withDefault(false, tabela.cobra_por_cor),
    max_cores: withDefault(1, tabela.max_cores),
    production_days: withDefault<number | null>(null, faixa.prazo_dias),
    tier_used: withDefault(0, faixa.ordem),
    tier_min_qty: withDefault(0, faixa.quantidade_minima),
    tier_max_qty: withDefault(0, faixa.quantidade_maxima),
    redirected_from: resp.redirected_from,
    redirected_to: resp.redirected_to,
  };
}

function parseFlat(resp: FlatPriceResponse): CustomizationPriceFlat {
  const tabelaCode = withDefault('', resp.tabela);
  const unitPrice = withDefault(0, resp.preco_unitario, resp.preco_por_unidade);
  const quantity = withDefault(0, resp.quantidade);
  const valorGravacao = withDefault(unitPrice * quantity, resp.valor_gravacao);
  const markup = resp.markup ?? {};
  const detalhes = resp.detalhes ?? {};
  const faixa = resp.faixa ?? {};
  return {
    success: withDefault(true, resp.success),
    area_id: withDefault('', resp.area_id),
    area_code: withDefault(tabelaCode, resp.area_code),
    area_name: withDefault('', resp.nome_tabela),
    tabela_id: withDefault('', resp.tabela_id),
    tabela_codigo: tabelaCode,
    tabela_codigo_curto: firstDefined(tabelaCode.split('-')[0], tabelaCode) ?? '',
    technique: withDefault('', resp.nome_tabela),
    grupo_tecnica: withDefault('', resp.grupo_tecnica),
    codigo_orcamento: withDefault(`${tabelaCode}-${quantity}`, resp.codigo_orcamento),
    quantity,
    num_cores: withDefault(1, resp.num_cores),
    unit_price: unitPrice,
    subtotal_pecas: valorGravacao,
    faturamento_minimo_gravacao: withDefault(0, resp.setup_total, markup.custo_setup_tabela),
    minimum_applied: withDefault(0, resp.setup_total) > withDefault(0, resp.valor_gravacao),
    total_price: withDefault(0, resp.total_cobrado, resp.valor_gravacao),
    cost_base_unit: withDefault(0, markup.custo_unitario),
    cost_unit_total: withDefault(0, markup.custo_unitario),
    cost_setup: withDefault(0, markup.custo_setup_tabela),
    markup_percent: withDefault(0, markup.markup_pct),
    margin_percent: withDefault(0, markup.markup_pct),
    price_by_color: withDefault(false, detalhes.cobra_por_cor),
    max_cores: withDefault(1, detalhes.max_cores),
    production_days: withDefault<number | null>(null, faixa.prazo_dias, resp.prazo_dias),
    tier_used: faixa.faixa_id ? 1 : 0,
    tier_min_qty: withDefault(0, faixa.qtd_min),
    tier_max_qty: withDefault(0, faixa.qtd_max),
    redirected_from: resp.redirected_from,
    redirected_to: resp.redirected_to,
  };
}

// ============================================
// API PÚBLICA
// ============================================

export interface AdaptResult {
  flat: CustomizationPriceFlat;
  schemaVersion: PriceSchemaVersion;
}

/**
 * Adapta qualquer payload conhecido para o tipo canônico.
 * Retorna também a versão detectada (útil para debug/telemetria).
 */
export function adaptPriceResponseWithMeta(
  resp: Record<string, unknown> | null | undefined,
): AdaptResult {
  if (!resp) {
    return { flat: parseFlat({}), schemaVersion: 'unknown' };
  }
  // Validação observacional do payload bruto (apenas formatos não-nested)
  if (!('area' in resp)) {
    validateRpcPayload(PRICE_CONTRACT, resp);
  }
  const version = detectPriceSchema(resp);
  switch (version) {
    case 'v5.9-nested':
      return { flat: parseNested(resp as NestedPriceResponse), schemaVersion: version };
    case 'v6.x-flat':
      return { flat: parseFlat(resp as FlatPriceResponse), schemaVersion: version };
    case 'v7-new':
      return { flat: parseFlat(normalizeV7Aliases(resp) as FlatPriceResponse), schemaVersion: version };
    default: {
      warnUnknownSchemaOnce('price-response', resp);
      return { flat: parseFlat(resp as FlatPriceResponse), schemaVersion: 'unknown' };
    }
  }
}

/**
 * Versão simplificada — devolve apenas o flat canônico.
 * É a função que os consumidores devem importar.
 */
export function adaptPriceResponse(
  resp: Record<string, unknown> | null | undefined,
): CustomizationPriceFlat {
  return adaptPriceResponseWithMeta(resp).flat;
}
