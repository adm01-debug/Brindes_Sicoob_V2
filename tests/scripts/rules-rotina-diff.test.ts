import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error módulo .mjs sem tipos
import { comparar, carregarBase } from '../../scripts/rules/diff.mjs';

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

describe('rules/rotina — base da comparação (carregarBase)', () => {
  const mk = (dias: Record<string, unknown>) => {
    const out = mkdtempSync(join(tmpdir(), 'base-'));
    for (const [d, json] of Object.entries(dias)) {
      mkdirSync(join(out, d), { recursive: true });
      writeFileSync(join(out, d, 'latest.json'), typeof json === 'string' ? json : JSON.stringify(json));
    }
    return out;
  };
  const rel = (id: string) => ({ results: [{ id, severity: 'alta', kind: 'falha', items: [] }] });

  it('repetição no mesmo dia compara com o relatório de hoje, não com o dia anterior', () => {
    const out = mk({ '2026-11-08': rel('ontem'), '2026-11-09': rel('hoje') });
    const b = carregarBase(out, '2026-11-09');
    expect(b.json.results[0].id).toBe('hoje');
    expect(b.rotulo).toContain('execução anterior de hoje');
    rmSync(out, { recursive: true, force: true });
  });

  it('sem relatório de hoje usa o último dia anterior legível', () => {
    const out = mk({ '2026-11-06': rel('seis'), '2026-11-07': '{quebrado', '2026-11-10': rel('futuro') });
    const b = carregarBase(out, '2026-11-09');
    expect(b.json.results[0].id).toBe('seis');
    expect(b.rotulo).toBe('2026-11-06');
    rmSync(out, { recursive: true, force: true });
  });

  it('relatório de hoje corrompido cai para o dia anterior; sem nada devolve null', () => {
    const out = mk({ '2026-11-08': rel('ontem'), '2026-11-09': '{x' });
    expect(carregarBase(out, '2026-11-09').rotulo).toBe('2026-11-08');
    rmSync(out, { recursive: true, force: true });
    expect(carregarBase(mk({}), '2026-11-09')).toBeNull();
  });
});
