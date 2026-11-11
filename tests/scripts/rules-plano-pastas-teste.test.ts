import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import rules from '../../scripts/rules/rules/plano-melhorias.mjs';

const rule = rules.find((r: { id: string }) => r.id === 'plano-pastas-de-teste');

function fakeCtx(files: string[]) {
  const root = '/repo';
  return {
    root,
    // mesma semântica do walk real (run.mjs): todo arquivo sob `dir`, recursivo.
    walk: (dir: string) => files.filter((f) => f === dir || f.startsWith(dir.endsWith('/') ? dir : `${dir}/`)),
  };
}

describe('plano-melhorias — plano-pastas-de-teste (__tests__ aninhado)', () => {
  it('conta __tests__ aninhado, não só o nível raiz de src/__tests__', () => {
    const ctx = fakeCtx([
      '/repo/src/components/Foo.tsx',
      '/repo/src/components/foo/__tests__/Bar.test.tsx',
      '/repo/tests/outro.test.ts',
    ]);
    const { items } = rule.run(ctx);
    expect(items.some((i: string) => i.includes('__tests__') && i.includes('1 arquivo'))).toBe(true);
  });

  it('não perde o aninhado nem no colocado nem em nenhum bucket (soma bate com o total real)', () => {
    const files = [
      '/repo/src/components/Foo.tsx',
      '/repo/src/components/foo/__tests__/Bar.test.tsx', // aninhado
      '/repo/src/components/Baz.test.tsx', // colocado
      '/repo/tests/outro.test.ts', // raiz
    ];
    const ctx = fakeCtx(files);
    const { items } = rule.run(ctx);
    const totalDetectado = items.reduce((acc: number, i: string) => {
      const m = /:\s*(\d+)\s*arquivo/.exec(i);
      return acc + (m ? Number(m[1]) : 0);
    }, 0);
    const totalReal = files.filter((f) => /\.(?:test|spec)\.[tj]sx?$/.test(f)).length;
    expect(totalDetectado).toBe(totalReal);
  });

  it('só uma convenção em uso (colocado) não reporta nada', () => {
    const ctx = fakeCtx(['/repo/src/components/Foo.tsx', '/repo/src/components/Foo.test.tsx']);
    expect(rule.run(ctx).items).toEqual([]);
  });
});
