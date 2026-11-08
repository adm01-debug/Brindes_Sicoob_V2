#!/usr/bin/env node
/**
 * check-critical-test-skip-budget.mjs
 * ----------------------------------------------------------------
 * Gate de CI: impede que novos testes críticos (P0/RLS/segurança) sejam
 * silenciosamente ignorados via `.skip` / `skipIf` / `describe.skip`.
 *
 * Estratégia:
 *  - Varre `tests/p0`, `tests/rls` e `tests/security` contando ocorrências
 *    de skip declarado.
 *  - Compara com um baseline fixo (dívida conhecida e aceita).
 *  - Se o número crescer → falha (exit 1): alguém adicionou um skip novo.
 *  - Se diminuir → avisa para atualizar o baseline no próximo lote.
 *
 * Saída:
 *  - exit 0 → ok (dentro do baseline).
 *  - exit 1 → novos skips adicionados (violação).
 *  - exit 2 → erro de execução/configuração.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const isCI = process.env.CI === "true" || process.env.CI === "1";

const roots = ["tests/p0", "tests/rls", "tests/security"];
// Os testes P0 não têm cenários ignorados. As quatro ocorrências restantes são
// suites condicionais de RLS/segurança que só executam com credenciais de um
// banco efêmero; elas continuam visíveis e contabilizadas pelo gate.
const baseline = 4;
const testFile = /\.test\.[cm]?[jt]sx?$/;
const skipPattern = /\b(?:describe|it|test)\.skip\b|\bskipIf\b|\benabled\s*\?\s*describe\s*:\s*describe\.skip/g;

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : testFile.test(entry.name) ? [path] : [];
  });
}

function main() {
  const occurrences = roots.flatMap(files).flatMap((file) => {
    const source = readFileSync(file, "utf8");
    return [...source.matchAll(skipPattern)].map((match) => ({ file, offset: match.index ?? 0, value: match[0] }));
  });

  console.log(`Contratos críticos ignorados declarados: ${occurrences.length}/${baseline}`);

  if (occurrences.length > baseline) {
    const extra = occurrences.length - baseline;
    console.error(`\n❌ ${extra} novo(s) skip(s) adicionado(s) aos contratos P0/RLS/segurança:\n`);
    for (const o of occurrences) {
      console.error(`   • ${o.file}  (${o.value})`);
      if (isCI) {
        console.log(
          `::error file=${o.file},title=Skip crítico adicionado::${o.value} — remova o skip ou justifique no baseline.`,
        );
      }
    }
    console.error(
      `\n   → Remova o skip ou, se for dívida aceita, atualize o baseline (${baseline} → ${occurrences.length}) ` +
        "com justificativa no código.\n",
    );
    process.exit(1);
  }

  if (occurrences.length < baseline) {
    console.log(`Dívida reduzida em ${baseline - occurrences.length}; atualize o baseline no próximo lote.`);
  } else {
    console.log("✅ Nenhum skip novo adicionado aos contratos críticos.");
  }
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error("\x1b[31m❌ Falha inesperada no gate:\x1b[0m " + (err?.message ?? err));
  process.exit(2);
}