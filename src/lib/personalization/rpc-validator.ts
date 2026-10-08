/**
 * RPC Validator — Compara o payload retornado contra o contrato declarado.
 *
 * Filosofia: **só observa**. Nunca lança. O parse real continua nos adapters.
 *
 * - Resolve aliases (canônico → nome efetivamente recebido).
 * - Suporta paths aninhados (`faixa.qtd_min`) e wildcards de array
 *   (`locations[].options[].technique_id`).
 * - Em dev: warn deduplicado por contrato/campo.
 * - Em prod: incrementa `window.__personalizationSchemaStats.contractMismatches`.
 */

import type { RpcContract } from './rpc-contracts';
import { recordContractMismatch } from './adapters/schema-detection';

export interface ValidationResult {
  contract: string;
  ok: boolean;
  missing: string[];
  extras: string[];
  resolvedAliases: Record<string, string>;
}

const warnedKeys = new Set<string>();
function warnOnce(key: string, msg: string, payload?: unknown): void {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(`[rpc-validator] ${msg}`, payload);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function resolveSegment(cursors: unknown[], rawSegment: string): unknown[] {
  const isArray = rawSegment.endsWith('[]');
  const segment = isArray ? rawSegment.slice(0, -2) : rawSegment;
  const next: unknown[] = [];
  for (const cursor of cursors) {
    if (!isObject(cursor)) continue;
    const value = cursor[segment];
    if (value === undefined) continue;
    if (isArray && Array.isArray(value)) next.push(...value);
    else if (!isArray) next.push(value);
  }
  return next;
}

/**
 * Resolve um path do tipo `a.b[].c` contra um payload.
 * Retorna a lista de valores encontrados (uma entrada por elemento de array
 * atravessado). Vazio = path ausente em todas as ramificações.
 */
function resolvePath(payload: unknown, path: string): unknown[] {
  const segments = path.split('.');
  let cursors: unknown[] = [payload];

  for (const rawSeg of segments) {
    cursors = resolveSegment(cursors, rawSeg);
    if (cursors.length === 0) return [];
  }
  return cursors;
}

/**
 * Verifica se uma chave canônica (ou um de seus aliases) está presente.
 * Retorna o nome efetivamente encontrado, ou null.
 */
function findFieldName(
  payload: unknown,
  canonical: string,
  aliasMap: Record<string, string[]>,
): string | null {
  if (resolvePath(payload, canonical).length > 0) return canonical;
  const aliases = aliasMap[canonical] ?? [];
  for (const alias of aliases) {
    if (resolvePath(payload, alias).length > 0) return alias;
  }
  return null;
}

/** Lista chaves de primeiro nível do payload (para detectar `extras`). */
function topLevelKeys(payload: unknown): string[] {
  if (!isObject(payload)) return [];
  return Object.keys(payload);
}

function knownTopLevel(contract: RpcContract): Set<string> {
  const out = new Set<string>();
  const collect = (path: string) => {
    const top = (path.split('.')[0] ?? '').replace(/\[\]$/, '');
    if (top) out.add(top);
  };
  contract.requiredFields.forEach(collect);
  contract.optionalFields.forEach(collect);
  // Aliases também
  for (const aliases of Object.values(contract.aliasMap)) {
    aliases.forEach(collect);
  }
  // Sempre tolerados
  ['success', 'error'].forEach((k) => out.add(k));
  return out;
}

function resolveRequiredFields(
  contract: RpcContract,
  payload: unknown,
): { missing: string[]; resolvedAliases: Record<string, string> } {
  const missing: string[] = [];
  const resolvedAliases: Record<string, string> = {};
  for (const field of contract.requiredFields) {
    const found = findFieldName(payload, field, contract.aliasMap);
    if (!found) missing.push(field);
    else if (found !== field) resolvedAliases[field] = found;
  }
  return { missing, resolvedAliases };
}

function reportValidation(
  contract: RpcContract,
  payload: unknown,
  missing: string[],
  ...validation: [extras: string[], resolvedAliases: Record<string, string>]
): void {
  const [extras, resolvedAliases] = validation;
  if (missing.length > 0) {
    recordContractMismatch(contract.name, missing, extras);
    if (import.meta.env.DEV) {
      warnOnce(
        `${contract.name}:${missing.join(',')}`,
        `Payload de ${contract.name} faltando campos: ${missing.join(', ')}`,
        payload,
      );
    }
    return;
  }
  if (Object.keys(resolvedAliases).length > 0 && import.meta.env.DEV) {
    warnOnce(
      `${contract.name}:aliases:${Object.keys(resolvedAliases).join(',')}`,
      `Payload de ${contract.name} usando aliases: ${JSON.stringify(resolvedAliases)}`,
    );
  }
}

export function validateRpcPayload(
  contract: RpcContract,
  payload: unknown,
): ValidationResult {
  const { missing, resolvedAliases } = resolveRequiredFields(contract, payload);

  // Extras: chaves top-level desconhecidas
  const known = knownTopLevel(contract);
  const extras = topLevelKeys(payload).filter((k) => !known.has(k));

  const ok = missing.length === 0;

  reportValidation(contract, payload, missing, extras, resolvedAliases);

  return { contract: contract.name, ok, missing, extras, resolvedAliases };
}
