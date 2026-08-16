#!/usr/bin/env node
/**
 * tscheck-files
 * --------------------------------------------------------------
 * Typecheck rápido de um subconjunto de arquivos, reaproveitando as
 * mesmas flags de `tsconfig.app.json` (strict + noUncheckedIndexedAccess).
 *
 * Uso:
 *   node scripts/tscheck-files.mjs src/hooks/useX.ts src/pages/Y.tsx
 *
 * Observação: o programa gerado inclui os arquivos pedidos e tudo que eles
 * importam, então erros de dependências também aparecem — filtre pelo caminho
 * que estiver corrigindo.
 */
import { writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = process.argv.slice(2).filter(Boolean);
if (files.length === 0) {
  console.error("Informe ao menos um arquivo.");
  process.exit(2);
}

const cfgPath = `tsconfig.probe.${process.pid}.json`;
writeFileSync(
  cfgPath,
  JSON.stringify({ extends: "./tsconfig.app.json", include: files }, null, 2),
);

try {
  const res = spawnSync("npx", ["tsgo", "--noEmit", "-p", cfgPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const lines = out.split("\n").filter((l) => /error TS/.test(l));
  const scoped = lines.filter((l) => files.some((f) => l.startsWith(f)));
  for (const l of scoped) console.log(l);
  console.log(`\n— ${scoped.length} erro(s) nos arquivos pedidos (${lines.length} no programa inteiro).`);
  process.exit(scoped.length === 0 ? 0 : 1);
} finally {
  try {
    unlinkSync(cfgPath);
  } catch {
    /* noop */
  }
}
