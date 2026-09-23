#!/usr/bin/env node
/**
 * check-migration-immutability
 * --------------------------------------------------------------
 * Gate de CI que falha se um PR editar ou remover um arquivo de
 * migration que já existe na branch-base (normalmente `origin/main`).
 *
 * Por quê:
 *   O Supabase rastreia migration aplicada por NOME de arquivo, não por
 *   conteúdo (tabela `supabase_migrations.schema_migrations`). Editar um
 *   arquivo já mesclado — mesmo só pra "completar" um recurso — não faz
 *   o banco reaplicar nada: o arquivo no disco e o schema real divergem
 *   silenciosamente. Isso já aconteceu de verdade neste repositório
 *   (PR #7, 2026-09-13): cinco migrations do PR #6 foram editadas
 *   in-place num worktree antes de irem para produção; o problema só foi
 *   pego por revisão manual, não por CI. Ver
 *   docs/correcoes-validacao-2026-09-13.md.
 *
 * Regra: qualquer arquivo em `supabase/migrations/*.sql` presente na
 * branch-base não pode ser modificado nem removido. Arquivo novo é
 * sempre permitido — é assim que se corrige ou complementa algo que já
 * foi mesclado (ver docs/plano-melhorias-50-etapas.md, etapa 14).
 *
 * Uso local:
 *   node scripts/check-migration-immutability.mjs
 *   MIGRATION_BASE_REF=origin/main node scripts/check-migration-immutability.mjs
 *
 * Uso CI (precisa de `fetch-depth: 0` no checkout):
 *   - name: Migration immutability gate
 *     run: node scripts/check-migration-immutability.mjs
 */
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const MIGRATIONS_DIR = "supabase/migrations";

function runGit(args) {
  return spawnSync("git", args, { cwd: ROOT, encoding: "utf8", shell: false });
}

function verifiedRef(candidate) {
  if (!candidate) return null;
  const result = runGit(["rev-parse", "--verify", candidate]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function resolveBaseCommit() {
  const candidates = [
    process.env.MIGRATION_BASE_REF,
    process.env.GITHUB_EVENT_BEFORE,
    process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null,
    "origin/main",
    "HEAD^",
  ];
  const head = verifiedRef("HEAD");
  for (const candidate of candidates) {
    const sha = verifiedRef(candidate);
    if (sha && sha !== head) return { ref: candidate, sha };
  }
  return null;
}

const base = resolveBaseCommit();
if (!base) {
  console.log(
    "❌ Não foi possível resolver uma base distinta de HEAD para validar a imutabilidade das migrations.",
  );
  process.exit(1);
}

const diff = runGit([
  "diff",
  "--name-status",
  "--diff-filter=MDR",
  base.sha,
  "--",
  MIGRATIONS_DIR,
]);
if (diff.status !== 0) {
  console.error("❌ git diff falhou:", diff.stderr);
  process.exit(1);
}

const lines = diff.stdout
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

if (lines.length === 0) {
  console.log(`✅ Nenhuma migration existente em ${base.ref} foi modificada ou removida.`);
  process.exit(0);
}

console.error(
  `❌ ${lines.length} migration(s) já presente(s) em ${base.ref} foram alteradas ou removidas — isso NÃO reaplica no banco, só gera drift entre o arquivo e o schema real:\n`,
);
for (const line of lines) {
  const [status, ...rest] = line.split(/\s+/);
  const path = rest[rest.length - 1];
  const verb = status.startsWith("M") ? "modificado" : status.startsWith("D") ? "removido" : "renomeado";
  console.error(`   ${verb.padEnd(10)} ${path}`);
}
console.error(
  "\nCrie uma migration NOVA com o delta em vez de editar a existente. Ver docs/plano-melhorias-50-etapas.md (etapa 14) e docs/correcoes-validacao-2026-09-13.md.",
);
process.exit(1);
