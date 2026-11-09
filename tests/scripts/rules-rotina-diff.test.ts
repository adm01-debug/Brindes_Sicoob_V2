import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sem tipos
import { comparar } from '../../scripts/rules/diff.mjs';

const res = (id: string, items: string[], error?: string) => ({ id, severity: 'media', items, ...(error ? { error } : {}) });
const exec = (...results: ReturnType<typeof res>[]) => ({ results });

describe('rules/diff — comparação entre execuções', () => {
  it('detecta novos e resolvidos', () => {
    const r = comparar(exec(res('r1', ['a', 'c'])), exec(res('r1', ['a', 'b'])));
    expect(r.novos.map((x: { item: string }) => x.item)).toEqual(['c']);
    expect(r.resolvidos.map((x: { item: string }) => x.item)).toEqual(['b']);
  });

  it('primeira execução não tem base: nada novo nem resolvido', () => {
    expect(comparar(exec(res('r1', ['a'])), null)).toMatchObject({ novos: [], resolvidos: [] });
  });

  it('regra que ERROU hoje não vira "resolvida" (inconclusiva)', () => {
    const r = comparar(exec(res('r1', [], 'arquivo indisponível')), exec(res('r1', ['a', 'b'])));
    expect(r.resolvidos).toEqual([]);
    expect(r.inconclusivas).toEqual(['r1']);
  });

  it('regra que errou ontem também fica de fora (não vira "novo" em massa)', () => {
    const r = comparar(exec(res('r1', ['a', 'b'])), exec(res('r1', [], 'falhou')));
    expect(r.novos).toEqual([]);
  });
});
