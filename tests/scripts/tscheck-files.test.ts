import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SCRIPT = resolve(__dirname, '../../scripts/tscheck-files.mjs');

/** Projeto mínimo com um `npx` falso que imprime o diagnóstico pedido (sem rodar o tsc de verdade). */
function project(fakeNpx: string) {
  const dir = mkdtempSync(join(tmpdir(), 'tscheck-'));
  mkdirSync(join(dir, 'src/(grupo)'), { recursive: true });
  for (const file of ['src/bad.ts', 'src/bad file.ts', 'src/(grupo)/x.ts', 'src/ok.ts']) writeFileSync(join(dir, file), 'export {};\n');
  writeFileSync(join(dir, 'tsconfig.app.json'), '{}');
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'npx'), `#!/bin/sh\n${fakeNpx}\n`);
  chmodSync(join(bin, 'npx'), 0o755);
  return { dir, bin };
}
const run = (p: { dir: string; bin: string }, ...args: string[]) =>
  spawnSync(process.execPath, [SCRIPT, ...args], { cwd: p.dir, encoding: 'utf8', env: { ...process.env, PATH: `${p.bin}:${process.env.PATH}` } });
const leftovers = (dir: string) => readdirSync(dir).filter((name) => name.startsWith('tsconfig.probe.'));

const diagnostics = `printf 'src/bad.ts(1,14): error TS2322: x\\nsrc/bad file.ts(1,14): error TS2322: x\\nsrc/(grupo)/x.ts(1,1): error TS2322: x\\n'; exit 2`;

describe('tscheck-files', () => {
  it.each([
    ['caminho relativo', 'src/bad.ts'],
    ['com ./', './src/bad.ts'],
    ['com espaço', 'src/bad file.ts'],
    ['com parêntese', 'src/(grupo)/x.ts'],
  ])('acusa erro pedido por %s (exit 1)', (_label, arg) => {
    const p = project(diagnostics);
    const result = run(p, arg);
    expect(result.status, result.stdout + result.stderr).toBe(1);
    expect(result.stdout).toContain('1 erro(s) nos arquivos pedidos');
  });

  it('caminho absoluto também casa com a saída relativa do tsc', () => {
    const p = project(diagnostics);
    const result = run(p, join(p.dir, 'src/bad.ts'));
    expect(result.status, result.stdout).toBe(1);
  });

  it('não confunde prefixo: pedir src/bad não acusa src/bad.ts', () => {
    const p = project(diagnostics);
    writeFileSync(join(p.dir, 'src/bad'), '');
    expect(run(p, 'src/bad').status).toBe(0);
  });

  it('arquivo sem erro passa (exit 0)', () => {
    const p = project(diagnostics);
    const result = run(p, 'src/ok.ts');
    expect(result.status, result.stdout).toBe(0);
    expect(result.stdout).toContain('0 erro(s) nos arquivos pedidos');
  });

  it('arquivo inexistente é exit 2, não "0 erros"', () => {
    const p = project(diagnostics);
    const result = run(p, 'src/nao-existe.ts');
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('não encontrado');
  });

  it('npx/tsc que falha sem diagnóstico é exit 2, não "0 erros"', () => {
    const p = project(`echo "npm ERR! 404" >&2; exit 1`);
    const result = run(p, 'src/bad.ts');
    expect(result.status).toBe(2);
    expect(result.stdout).not.toContain('0 erro(s)');
  });

  it('sempre remove o tsconfig temporário, inclusive quando o compilador falha', () => {
    for (const fake of [diagnostics, `exit 1`]) {
      const p = project(fake);
      run(p, 'src/bad.ts');
      expect(leftovers(p.dir)).toEqual([]);
    }
  });

  it('sem argumentos é exit 2', () => {
    expect(run(project(diagnostics)).status).toBe(2);
  });
});
