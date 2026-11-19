#!/usr/bin/env node
/**
 * check-critical-test-skip-budget.mjs
 * ----------------------------------------------------------------
 * Gate de CI: impede que novos testes críticos (P0/RLS/segurança) sejam
 * silenciosamente ignorados ou desligados.
 *
 * Estratégia:
 *  - Varre `tests/p0`, `tests/rls`, `tests/security` e `e2e/flows/p0` (arquivos
 *    `.test.` e `.spec.`) contando skip declarado em TODAS as formas:
 *    `.skip`, `.todo`, `.only` (desliga os demais), `.fails`, `skipIf`, `runIf`,
 *    encadeados (`it.concurrent.skip`), `{ skip: true }`, `ctx.skip()` e `xit`/`xdescribe`.
 *  - O orçamento é POR ARQUIVO (`BASELINE_BY_FILE`; arquivo ausente = 0). Um total
 *    agregado deixava trocar um skip antigo por outro novo sem ninguém ver.
 *  - Algum arquivo acima do seu orçamento → falha (exit 1).
 *  - Abaixo → avisa para reduzir o orçamento no próximo lote (a catraca só aperta).
 *
 * Saída:
 *  - exit 0 → ok (dentro do orçamento de cada arquivo).
 *  - exit 1 → skip novo ou acima do orçamento (violação).
 *  - exit 2 → erro de execução/configuração (inclui raiz de testes ausente).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const isCI = process.env.CI === "true" || process.env.CI === "1";

export const roots = ["tests/p0", "tests/rls", "tests/security", "e2e/flows/p0"];
// Os testes P0 não têm cenários ignorados. As quatro ocorrências restantes são
// suites condicionais de RLS/segurança que só executam com credenciais de um
// banco efêmero; elas continuam visíveis e contabilizadas pelo gate.
export const BASELINE_BY_FILE = {
  "tests/rls/e2e-cleanup-rate-limit.test.ts": 1,
  "tests/rls/no-empty-rls-policies.test.ts": 1,
  "tests/rls/personas.test.ts": 1,
  "tests/security/edge-authz-bypass.test.ts": 1,
  // Cenários P0 de E2E (`e2e/flows/p0`). Esta raiz ficou FORA do gate até
  // 18/11/2026: eram 23 cenários críticos que podiam ser trocados ou
  // multiplicados sem ninguém ver. Os números abaixo CONGELAM a dívida que já
  // existia — não a autorizam. 01 a 05 são esqueletos aguardando a UX de
  // degradação correspondente; 06 e 07 são suites que só rodam com credenciais
  // E2E; 08 espera o link de "esqueci a senha" aparecer na interface.
  // A catraca só aperta: ao destravar um cenário, baixe o número aqui.
  "e2e/flows/p0/01-auth-recovery.spec.ts": 3,
  "e2e/flows/p0/02-catalog-degraded.spec.ts": 3,
  "e2e/flows/p0/03-quote-blocked.spec.ts": 2,
  "e2e/flows/p0/04-checkout-blocked.spec.ts": 3,
  "e2e/flows/p0/05-admin-down.spec.ts": 4,
  "e2e/flows/p0/06-auth-lifecycle.spec.ts": 4,
  "e2e/flows/p0/07-rls-enforcement.spec.ts": 2,
  "e2e/flows/p0/08-password-recovery.spec.ts": 1,
};
export const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
export const skipPattern =
  /\b(?:describe|it|test|suite|bench)(?:\.\w+)*\.(?:skip|todo|only|fails|skipIf|runIf)\b|\bskip\s*:\s*true\b|\b\w+\.skip\(\s*\)|\bx(?:it|describe|test)\s*\(|\bskipIf\b|\benabled\s*\?\s*describe\s*:\s*describe\.skip/g;

/** Ocorrências de skip em um fonte de teste. */
export function findSkips(source) {
  return [...source.matchAll(skipPattern)].map((match) => ({ offset: match.index ?? 0, value: match[0] }));
}

export function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : testFile.test(entry.name) ? [path] : [];
  });
}

/**
 * Compara as ocorrências com o orçamento por arquivo.
 * @returns {{ over: {file:string,count:number,allowed:number}[], under: {file:string,count:number,allowed:number}[], total: number }}
 */
export function evaluate(byFile, baseline = BASELINE_BY_FILE) {
  const over = [];
  const under = [];
  let total = 0;
  for (const file of new Set([...Object.keys(byFile), ...Object.keys(baseline)])) {
    const count = byFile[file]?.length ?? 0;
    const allowed = baseline[file] ?? 0;
    total += count;
    if (count > allowed) over.push({ file, count, allowed });
    else if (count < allowed) under.push({ file, count, allowed });
  }
  return { over, under, total };
}

function main() {
  const missing = roots.filter((root) => !existsSync(root));
  if (missing.length > 0) {
    // Raiz ausente (cwd errado, pasta renomeada) leria 0 skip e "passaria" sem verificar nada.
    console.error(`❌ Raiz(es) de testes críticos não encontrada(s): ${missing.join(", ")} (cwd=${process.cwd()}).`);
    process.exit(2);
  }

  const scanned = roots.flatMap(files);
  const byFile = {};
  for (const file of scanned) {
    const found = findSkips(readFileSync(file, "utf8"));
    if (found.length > 0) byFile[file.split("\\").join("/")] = found;
  }

  const { over, under, total } = evaluate(byFile);
  const allowedTotal = Object.values(BASELINE_BY_FILE).reduce((sum, n) => sum + n, 0);
  console.log(`Contratos críticos ignorados declarados: ${total}/${allowedTotal} (${scanned.length} arquivos varridos)`);

  if (over.length > 0) {
    console.error(`\n❌ Skip acima do orçamento nos contratos P0/RLS/segurança:\n`);
    for (const { file, count, allowed } of over) {
      console.error(`   • ${file}: ${count} (orçamento ${allowed})`);
      for (const o of byFile[file] ?? []) {
        if (isCI) {
          console.log(
            `::error file=${file},title=Skip crítico adicionado::${o.value} — remova o skip ou justifique no orçamento por arquivo.`,
          );
        }
      }
    }
    console.error(
      "\n   → Remova o skip ou, se for dívida aceita, atualize BASELINE_BY_FILE com justificativa no código.\n",
    );
    process.exit(1);
  }

  if (under.length > 0) {
    for (const { file, count, allowed } of under) {
      console.log(`Dívida reduzida em ${file}: ${count}/${allowed}; reduza o orçamento no próximo lote.`);
    }
  } else {
    console.log("✅ Nenhum skip novo adicionado aos contratos críticos.");
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    main();
  } catch (err) {
    console.error("\x1b[31m❌ Falha inesperada no gate:\x1b[0m " + (err?.message ?? err));
    process.exit(2);
  }
}
