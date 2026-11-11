import { describe, expect, it } from 'vitest';

import { analyzeSmokeSpec } from '../../scripts/check-smoke-tags.mjs';

const COV = 'const SMOKE_COVERAGE = ["a", "b"] as const;\n';
const outside = (source: string) => analyzeSmokeSpec(COV + source).violations.map((v: { test: string }) => v.test);
const seen = (source: string) => analyzeSmokeSpec(COV + source).testsSeen.length;

describe('check-smoke-tags — teste FORA de describe @smoke precisa ser acusado', () => {
  it.each([
    ['top-level', "test('solto', async () => {});"],
    ['describe sem a tag', "test.describe('geral', () => { test('x', async () => {}); });"],
    ['título em outra linha', "test(\n  'zz fora',\n  async () => {},\n);"],
    ['título em variável', "const T = 'zz'; test(T, async () => {});"],
    ['alias de test', "const it = test; it('zz', async () => {});"],
    ['test.fail', "test.fail('zz', async () => {});"],
    ['test.fixme', "test.fixme('zz', async () => {});"],
    ['test.only', "test.only('zz', async () => {});"],
    ['com detalhes antes da função', "test('zz', { tag: '@x' }, async () => {});"],
    ['irmão de um describe @smoke', "test.describe('@smoke ok', () => { test('dentro', async () => {}); });\ntest('fora', async () => {});"],
    ['describe aninhado sob não-smoke', "test.describe('geral', () => { test.describe('@smoke so no filho', () => {}); test('x', async () => {}); });"],
  ])('%s', (_label, source) => {
    expect(outside(source).length).toBeGreaterThan(0);
  });
});

describe('check-smoke-tags — teste sob @smoke passa', () => {
  it.each([
    ['describe @smoke', "test.describe('@smoke geral', () => { test('x', async () => {}); });"],
    ['describe.serial', "test.describe.serial('@smoke serial', () => { test('x', async () => {}); });"],
    ['describe.parallel (antes: falso positivo)', "test.describe.parallel('@smoke extra', () => { test('dentro', async () => {}); });"],
    ['aninhado sob @smoke', "test.describe('@smoke raiz', () => { test.describe('filho', () => { test('x', async () => {}); }); });"],
    ['test.skip registrado sob @smoke', "test.describe('@smoke', () => { test.skip('x', async () => {}); });"],
    ['alias dentro de @smoke', "const it = test; test.describe('@smoke', () => { it('x', async () => {}); });"],
  ])('%s', (_label, source) => {
    expect(outside(source)).toEqual([]);
    expect(seen(source)).toBeGreaterThan(0);
  });

  it('test.skip(condição, motivo) e test.slow() dentro de um teste não são registros', () => {
    const source = `test.describe('@smoke', () => {
      test('real', async ({ page }) => {
        test.skip(!process.env.X, 'sem credencial');
        test.slow();
      });
    });`;
    expect(seen(source)).toBe(1);
    expect(outside(source)).toEqual([]);
  });

  it('test.describe.configure não é bloco describe', () => {
    expect(outside("test.describe.configure({ mode: 'serial' });\ntest('fora', async () => {});")).toEqual(['fora']);
  });

  it('informa linha e describes ativos', () => {
    const result = analyzeSmokeSpec(COV + "\ntest.describe('geral', () => {\n  test('x', async () => {});\n});");
    expect(result.violations).toEqual([{ line: 4, test: 'x', describes: ['geral'] }]);
  });

  it('conta as entradas de SMOKE_COVERAGE', () => {
    expect(analyzeSmokeSpec(COV).covCount).toBe(2);
    expect(analyzeSmokeSpec('const SMOKE_COVERAGE = [] as const;').covCount).toBe(0);
    expect(analyzeSmokeSpec('').covCount).toBe(0);
  });
});
