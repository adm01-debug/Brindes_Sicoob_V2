import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { BASELINE_BY_FILE, evaluate, files, findSkips, roots } from '../../scripts/check-critical-test-skip-budget.mjs';

const SCRIPT = resolve(__dirname, '../../scripts/check-critical-test-skip-budget.mjs');

describe('findSkips — formas de desligar um teste', () => {
  it.each([
    ['describe.skip', "describe.skip('x', () => {});"],
    ['it.skip', "it.skip('x', () => {});"],
    ['test.skip', "test.skip('x', () => {});"],
    ['describe.todo', "describe.todo('x');"],
    ['it.todo', "it.todo('x');"],
    ['.only desliga os demais', "it.only('x', () => {});"],
    ['it.fails', "it.fails('x', () => {});"],
    ['encadeado', "it.concurrent.skip('x', async () => {});"],
    ['skipIf', "describe.skipIf(!process.env.DB)('x', () => {});"],
    ['runIf', "it.runIf(false)('x', () => {});"],
    ['runIf em describe', "describe.runIf(process.env.X)('x', () => {});"],
    ['opção skip: true', "it('x', { skip: true }, () => {});"],
    ['ctx.skip()', "it('x', (ctx) => { ctx.skip(); });"],
    ['xit', "xit('x', () => {});"],
    ['xdescribe', "xdescribe('x', () => {});"],
    ['ternário do projeto', 'const suite = enabled ? describe : describe.skip;'],
  ])('detecta %s', (_label, source) => {
    expect(findSkips(source).length).toBeGreaterThan(0);
  });

  it.each([
    ['teste normal', "it('x', () => { expect(1).toBe(1); });"],
    ['it.each', "it.each([1, 2])('x %s', (n) => {});"],
    ['comentário sobre pular', '// não vamos skipar este teste'],
    ['identificador parecido', 'const skipped = 1; const onlyOne = 2;'],
  ])('não acusa %s', (_label, source) => {
    expect(findSkips(source)).toEqual([]);
  });
});

describe('evaluate — orçamento por arquivo', () => {
  const found = (n: number) => Array.from({ length: n }, () => ({ offset: 0, value: 'x' }));

  it('aceita exatamente o orçamento', () => {
    const byFile = Object.fromEntries(Object.entries(BASELINE_BY_FILE).map(([file, n]) => [file, found(n as number)]));
    expect(evaluate(byFile)).toMatchObject({ over: [], under: [] });
  });

  it('skip novo em arquivo sem orçamento reprova, mesmo com o total igual ao antigo', () => {
    // Orçamento próprio: o teste mede a regra, não a lista de dívidas do dia.
    const baseline = { 'tests/rls/personas.test.ts': 1, 'tests/security/edge-authz-bypass.test.ts': 1 };
    // Remove um skip antigo e adiciona um novo em P0: o total agregado continua igual.
    const byFile = {
      'tests/security/edge-authz-bypass.test.ts': found(1),
      'tests/p0/novo.test.ts': found(1),
    };
    const result = evaluate(byFile, baseline);
    expect(result.total).toBe(2);
    expect(result.over).toEqual([{ file: 'tests/p0/novo.test.ts', count: 1, allowed: 0 }]);
    expect(result.under.map((entry: { file: string }) => entry.file)).toEqual(['tests/rls/personas.test.ts']);
  });

  it('segundo skip em arquivo que já tinha um reprova', () => {
    const byFile = { 'tests/rls/personas.test.ts': found(2) };
    expect(evaluate(byFile, { 'tests/rls/personas.test.ts': 1 }).over).toHaveLength(1);
  });
});

describe('execução do gate numa árvore de testes', () => {
  function tree(files: Record<string, string>) {
    const dir = mkdtempSync(join(tmpdir(), 'skip-budget-'));
    // Usa as raízes declaradas pelo módulo: acrescentar uma raiz ao gate não
    // pode fazer estes testes criarem uma árvore incompleta e cair no exit 2.
    for (const root of roots) mkdirSync(join(dir, root), { recursive: true });
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    return dir;
  }
  const run = (cwd: string) => spawnSync(process.execPath, [SCRIPT], { cwd, encoding: 'utf8' });
  const baselineFiles = () =>
    Object.fromEntries(
      Object.entries(BASELINE_BY_FILE).map(([file, n]) => [
        file,
        'const s = enabled ? describe : describe.skip;\n'.repeat(n as number),
      ]),
    );

  it('árvore dentro do orçamento passa', () => {
    const result = run(tree(baselineFiles()));
    expect(result.status, result.stderr).toBe(0);
  });

  it.each([
    ['tests/p0/zz.test.ts', "describe.todo('x');"],
    ['tests/p0/zz.spec.ts', "it.skip('x', () => {});"],
    ['tests/security/zz.test.ts', "it('x', { skip: true }, () => {});"],
    ['tests/rls/zz.test.ts', "it.runIf(false)('x', () => {});"],
  ])('%s com skip novo reprova (exit 1)', (name, content) => {
    const result = run(tree({ ...baselineFiles(), [name]: content }));
    expect(result.status, result.stdout).toBe(1);
    expect(result.stderr).toContain(name);
  });

  it('trocar um skip antigo por um novo em P0 reprova', () => {
    const files = baselineFiles();
    files['tests/rls/personas.test.ts'] = "it('ok', () => {});\n";
    files['tests/p0/novo.test.ts'] = "it.skip('x', () => {});\n";
    expect(run(tree(files)).status).toBe(1);
  });

  it('fora da raiz do repositório falha (exit 2) em vez de ler zero skips', () => {
    const result = run(mkdtempSync(join(tmpdir(), 'skip-budget-vazio-')));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain('não encontrada');
  });
});

describe('cobertura das raízes críticas', () => {
  it('inclui os cenários P0 de E2E, que ficaram fora do gate até 18/11/2026', () => {
    // e2e/flows/p0 tem 23 cenários críticos desligados. Enquanto a raiz não era
    // varrida, dava para trocar ou multiplicar skip ali sem o CI reclamar.
    expect(roots).toContain('e2e/flows/p0');
  });

  it('o orçamento cobre todos os specs P0 de E2E que têm skip hoje', () => {
    // Só entradas com orçamento positivo: zerar a dívida de um arquivo (remover
    // o último skip e baixar o orçamento para 0) é o caminho desejado e deixa a
    // entrada em BASELINE_BY_FILE como catraca permanente — a lista medida, que
    // só conta arquivo com skip, não teria como incluí-la.
    const orcados = Object.entries(BASELINE_BY_FILE)
      .filter(([f, n]) => f.startsWith('e2e/flows/p0/') && (n as number) > 0)
      .map(([f]) => f);
    const medidos = (files('e2e/flows/p0') as string[])
      .map((f: string) => f.split('\\').join('/'))
      .filter((f: string) => findSkips(readFileSync(f, 'utf8')).length > 0);

    expect(orcados.sort()).toEqual(medidos.sort());
  });

  it('nenhum spec P0 de E2E está acima do orçamento', () => {
    const byFile: Record<string, { offset: number; value: string }[]> = {};
    for (const file of files('e2e/flows/p0') as string[]) {
      const encontrados = findSkips(readFileSync(file, 'utf8'));
      if (encontrados.length > 0) byFile[file.split('\\').join('/')] = encontrados;
    }
    const soP0 = Object.fromEntries(
      Object.entries(BASELINE_BY_FILE).filter(([f]) => f.startsWith('e2e/flows/p0/')),
    );

    expect(evaluate(byFile, soP0).over).toEqual([]);
  });
});
