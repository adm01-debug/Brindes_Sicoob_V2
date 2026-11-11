/**
 * Leitura fiel do JSON do reporter do Playwright, compartilhada por e2e-feature-summary e e2e-smoke-summary.
 * Sem dependências: só lógica pura sobre o objeto já parseado.
 */

/**
 * Status efetivo de um teste. Usa o status do TESTE (`expected`/`unexpected`/`flaky`/`skipped`), que já considera
 * `test.fail()` e retries, e só cai no último resultado se o JSON for de uma versão sem esse campo:
 *   - `test.fail()` que falha como esperado → `passed` (antes: contado como falha, exit 1 com o Playwright em 0);
 *   - `test.fail()` que PASSA → falha (`unexpected`);
 *   - flaky (passou após retry) → `passed`.
 */
export function effectiveStatus(test, last = {}) {
  if (test.status === 'skipped' || last.status === 'skipped') return 'skipped';
  if (test.status === 'expected' || test.status === 'flaky') return 'passed';
  if (test.status === 'unexpected') {
    return ['failed', 'timedOut', 'interrupted'].includes(last.status) ? last.status : 'failed';
  }
  return last.status || test.status || 'unknown';
}

/**
 * Erros do RUN, fora de qualquer spec (globalSetup que lança, config inválida, worker morto). Nesses casos
 * `suites` vem vazio e o resumo dizia "No failures" / exit 0 com o Playwright em exit 1.
 */
export function runErrors(raw) {
  return (Array.isArray(raw?.errors) ? raw.errors : []).map((error) => {
    const text = typeof error === 'string' ? error : (error?.message ?? error?.value ?? '');
    // Um erro sem mensagem continua sendo erro do run: nunca descartar nem virar "[object Object]".
    return String(text).split('\n')[0].trim().slice(0, 240) || 'erro do run sem mensagem';
  });
}

/**
 * `suite.file` no JSON do Playwright é RELATIVO AO testDir (`flows/20-x.spec.ts`), sem o prefixo `e2e/`.
 * Normaliza para `e2e/<...>` antes de classificar; sem isso toda feature caía em "uncategorized".
 */
export function normalizeSpecPath(file) {
  let rel = String(file ?? '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/^.*\/e2e\//, 'e2e/');
  if (rel && !rel.startsWith('e2e/')) rel = `e2e/${rel}`;
  return rel;
}
