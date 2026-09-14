#!/usr/bin/env node
/**
 * tscheck-files
 * --------------------------------------------------------------
 * Typecheck de um subconjunto de arquivos, reaproveitando as mesmas
 * flags de `tsconfig.app.json` (strict + noUncheckedIndexedAccess) sem
 * rodar o projeto inteiro.
 *
 * Uso:
 *   node scripts/tscheck-files.mjs src/hooks/useX.ts src/pages/Y.tsx
 *
 * Observação: o programa gerado inclui os arquivos pedidos e tudo que eles
 * importam, então erros de dependências também aparecem — filtre pelo caminho
 * que estiver corrigindo.
 *
 * Nota (2026-09-14): chamava `npx tsgo`, um pacote que não existe no
 * registro do npm (404) — o script sempre reportava "0 erro(s)" pra
 * qualquer arquivo, sempre, porque a saída era o erro do npx, não do
 * TypeScript. Corrigido para `npx tsc` (o compilador real, já é
 * devDependency do projeto). Mais lento que o `tsgo` prometia ser, mas
 * pelo menos correto — ver docs/correcoes-validacao-2026-09-13.md.
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
  const res = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false", "-p", cfgPath], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const lines = out.split("\n").filter((l) => /error TS/.test(l));
  const scoped = lines.filter((l) => files.some((f) => l.startsWith(f)));
  for (const l of scoped) console.log(l);
  console.log(`\n— ${scoped.length} erro(s) nos arquivos pedidos (${lines.length} no programa inteiro).`);
  process.exitCode = scoped.length === 0 ? 0 : 1;
} finally {
  try {
    unlinkSync(cfgPath);
  } catch {
    /* noop */
  }
}
