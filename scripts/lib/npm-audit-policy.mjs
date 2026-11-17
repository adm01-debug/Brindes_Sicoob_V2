// Politica do gate de npm audit, isolada para permitir cobertura unitaria.

// Sem excecoes por pacote: vulnerabilidades altas ou criticas bloqueiam o build.
export const ALLOWLIST = new Set();

// Excecoes por advisory, nunca por pacote: liberar um GHSA especifico mantem
// o pacote bloqueado para qualquer outra vulnerabilidade futura.
export const ALLOWED_ADVISORIES = new Map([
  [
    'GHSA-fc5q-39xc-vjpf',
    'picomatch <=4.0.7 ReDoS. Dependencia apenas de build (vite, vitest, tailwind, ' +
      'eslint), nunca entra no bundle, e o padrao glob vem do proprio repositorio. ' +
      'Sem versao corrigida publicada: micromatch/picomatch#194 ainda esta aberta. ' +
      'Remover assim que picomatch > 4.0.7 for lancado.',
  ],
]);

/**
 * Percorre a cadeia `via` ate as origens e devolve os identificadores de
 * advisory que afetam o pacote, direta ou transitivamente.
 */
export function collectAdvisoryIds(name, vulns, seen = new Set()) {
  if (seen.has(name)) return [];
  seen.add(name);
  const info = vulns[name];
  if (!info || !Array.isArray(info.via)) return [];
  const ids = [];
  for (const via of info.via) {
    if (typeof via === 'string') {
      ids.push(...collectAdvisoryIds(via, vulns, seen));
      continue;
    }
    const match = /GHSA-[0-9a-z-]+/.exec(via?.url ?? '');
    ids.push(match ? match[0] : `sem-id:${via?.title ?? 'desconhecido'}`);
  }
  return ids;
}

/** So libera o pacote quando todos os advisories dele estao liberados. */
export function isFullyAllowlisted(name, vulns, allowed = ALLOWED_ADVISORIES) {
  const ids = collectAdvisoryIds(name, vulns);
  if (ids.length === 0) return false;
  return ids.every((id) => allowed.has(id));
}

export function summarize(jsonStr) {
  let audit;
  try {
    audit = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  const vulns = audit?.vulnerabilities;
  if (!vulns || typeof vulns !== 'object') {
    // Formato antigo/alternativo: cai para as contagens agregadas de metadata.
    const v = audit?.metadata?.vulnerabilities;
    if (!v) return null;
    return { blocking: [], allowlisted: [], coarseCritical: v.critical || 0, coarseHigh: v.high || 0 };
  }
  const blocking = [];
  const allowlisted = [];
  for (const [name, info] of Object.entries(vulns)) {
    if (info.severity !== 'critical' && info.severity !== 'high') continue;
    if (ALLOWLIST.has(name) || isFullyAllowlisted(name, vulns)) {
      allowlisted.push(`${name} (${info.severity})`);
      continue;
    }
    blocking.push(`${name} (${info.severity})`);
  }
  return { blocking, allowlisted, coarseCritical: 0, coarseHigh: 0 };
}