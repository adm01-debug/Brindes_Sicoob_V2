import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const raiz = process.cwd();
function executarCompiler(codigo, args = []) {
  const dir = mkdtempSync(path.join(tmpdir(), 'sicoob-typecheck-'));
  try {
    const baseline = JSON.stringify({ total: 1, files: { 'src/exemplo.ts': 1 } });
    writeFileSync(path.join(dir, '.typecheck-baseline.json'), baseline);
    if (codigo !== null) {
      mkdirSync(path.join(dir, 'node_modules/typescript/bin'), { recursive: true });
      writeFileSync(path.join(dir, 'node_modules/typescript/bin/tsc'), codigo);
    }
    const result = spawnSync(process.execPath, [path.join(raiz, 'scripts/check-typecheck-baseline.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
    return { ...result, baseline, depois: readFileSync(path.join(dir, '.typecheck-baseline.json'), 'utf8') };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
for (const [nome, codigo] of [
  ['compilador ausente', null],
  ['processo interrompido sem diagnóstico', 'console.error("Falha de execução"); process.exit(1)'],
  ['erro global de configuração', 'console.error("error TS18003: Nenhum arquivo de entrada"); process.exit(2)'],
]) {
  test(`${nome} bloqueia verificação e atualização do baseline`, () => {
    const result = executarCompiler(codigo, ['--update']);
    assert.equal(result.status, 2);
    assert.equal(result.depois, result.baseline);
  });
}
test('diagnóstico conhecido é contado e não piora o baseline', () => {
  const result = executarCompiler('console.log("src/exemplo.ts(1,1): error TS2322: tipo incompatível"); process.exit(2)');
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Total atual:\s+1/);
});
test('erro em arquivo novo é regressão e bloqueia o gate', () => {
  assert.equal(executarCompiler('console.log("src/novo.ts(1,1): error TS2322: tipo incompatível"); process.exit(2)').status, 1);
});
test('auditoria indisponível não vira aprovação', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'sicoob-audit-'));
  try {
    writeFileSync(path.join(dir, 'npm'), '#!/bin/sh\nprintf "resposta indisponível"\nexit 1\n', { mode: 0o755 });
    const result = spawnSync(process.execPath, [path.join(raiz, 'scripts/check-npm-audit.mjs')], { cwd: raiz, encoding: 'utf8', env: { ...process.env, PATH: `${dir}:${process.env.PATH}` } });
    assert.equal(result.status, 2);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
