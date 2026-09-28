#!/usr/bin/env node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const roots = ["tests/p0", "tests/rls", "tests/security"];
const baseline = 41;
const testFile = /\.test\.[cm]?[jt]sx?$/;
const skipPattern = /\b(?:describe|it|test)\.skip\b|\bskipIf\b|\benabled\s*\?\s*describe\s*:\s*describe\.skip/g;

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? files(path) : testFile.test(entry.name) ? [path] : [];
  });
}

const occurrences = roots.flatMap(files).flatMap((file) => {
  const source = readFileSync(file, "utf8");
  return [...source.matchAll(skipPattern)].map((match) => ({ file, offset: match.index ?? 0, value: match[0] }));
});

console.log(`Contratos críticos ignorados declarados: ${occurrences.length}/${baseline}`);
if (occurrences.length > baseline) {
  console.error("Novos skips foram adicionados aos contratos P0/RLS/segurança.");
  process.exit(1);
}
if (occurrences.length < baseline) {
  console.log(`Dívida reduzida em ${baseline - occurrences.length}; atualize o baseline no próximo lote.`);
}
