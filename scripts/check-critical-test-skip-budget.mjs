#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const DEFAULT_ROOTS = ['tests/p0', 'tests/rls', 'tests/security', 'e2e/flows/p0'];
const testFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/;
const skipPattern =
  /\b(?:describe|it|test)\.skip\b|\bskipIf\b|\benabled\s*\?\s*describe\s*:\s*describe\.skip/g;

function files(workspace, directory) {
  const absoluteDirectory = join(workspace, directory);
  if (!existsSync(absoluteDirectory)) return [];
  return readdirSync(absoluteDirectory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(absoluteDirectory, entry.name);
    const relativePath = relative(workspace, absolutePath).replaceAll('\\', '/');
    return entry.isDirectory()
      ? files(workspace, relativePath)
      : testFile.test(entry.name)
        ? [relativePath]
        : [];
  });
}

function firstStringAfter(source, offset) {
  const window = source.slice(offset, offset + 600);
  const match = window.match(/(['"`])((?:\\.|[^'"`]){1,300})\1/);
  return match?.[2]?.replace(/\s+/g, ' ').trim() ?? '(sem título estável)';
}

export function collectCriticalSkips(workspace, roots = DEFAULT_ROOTS) {
  const raw = roots
    .flatMap((root) => files(workspace, root))
    .sort()
    .flatMap((file) => {
      const source = readFileSync(join(workspace, file), 'utf8');
      return [...source.matchAll(skipPattern)].map((match) => ({
        file,
        kind: match[0].replace(/\s+/g, ' '),
        label: match[0].startsWith('enabled')
          ? '(suite condicional por ambiente)'
          : firstStringAfter(source, match.index ?? 0),
      }));
    });

  const repetitions = new Map();
  return raw.map(({ file, kind, label }) => {
    const base = `${file} :: ${kind} :: ${label}`;
    const occurrence = (repetitions.get(base) ?? 0) + 1;
    repetitions.set(base, occurrence);
    return occurrence === 1 ? base : `${base} :: ocorrência ${occurrence}`;
  });
}

export function compareCriticalSkips(expected, actual) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return {
    added: actual.filter((entry) => !expectedSet.has(entry)),
    removed: expected.filter((entry) => !actualSet.has(entry)),
  };
}

function main() {
  const workspace = resolve(process.env.CRITICAL_SKIP_WORKSPACE ?? '.');
  const baselinePath = resolve(
    process.env.CRITICAL_SKIP_BASELINE ??
      join(workspace, 'scripts/critical-test-skips-baseline.json'),
  );
  const actual = collectCriticalSkips(workspace);

  if (process.argv.includes('--update-baseline')) {
    mkdirSync(dirname(baselinePath), { recursive: true });
    writeFileSync(
      baselinePath,
      `${JSON.stringify({ version: 1, total: actual.length, entries: actual }, null, 2)}\n`,
    );
    console.log(`Baseline de skips críticos atualizado: ${actual.length} entradas.`);
    return;
  }

  if (!existsSync(baselinePath)) {
    console.error(`Baseline de skips críticos ausente: ${baselinePath}`);
    process.exitCode = 2;
    return;
  }

  let baseline;
  try {
    baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  } catch (error) {
    console.error(
      `Baseline de skips críticos inválido: ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 2;
    return;
  }

  if (!Array.isArray(baseline.entries) || baseline.total !== baseline.entries.length) {
    console.error('Baseline de skips críticos inconsistente: total e entries divergem.');
    process.exitCode = 2;
    return;
  }

  const { added, removed } = compareCriticalSkips(baseline.entries, actual);
  console.log(`Contratos críticos ignorados declarados: ${actual.length}/${baseline.total}`);
  if (added.length === 0 && removed.length === 0) return;

  if (added.length > 0) {
    console.error('\nNovos skips críticos ou substituições não autorizadas:');
    for (const entry of added) console.error(`  + ${entry}`);
  }
  if (removed.length > 0) {
    console.error('\nSkips removidos ou renomeados sem atualizar o baseline:');
    for (const entry of removed) console.error(`  - ${entry}`);
  }
  console.error(
    '\nDepois de implementar e validar a redução, execute ' +
      '`npm run check:critical-test-skips -- --update-baseline` e revise o diff.',
  );
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === resolve(new URL(import.meta.url).pathname)) main();
