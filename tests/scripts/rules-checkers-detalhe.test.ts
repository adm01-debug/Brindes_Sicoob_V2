import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error módulo .mjs sem tipos
import checkers from '../../scripts/rules/rules/checkers.mjs';
// @ts-expect-error módulo .mjs sem tipos
import { comparar } from '../../scripts/rules/diff.mjs';

type Regra = { id: string; run: (ctx: unknown) => { items: string[] } };
const gate = (checkers as Regra[]).find((r) => r.id === 'gate-seller-scope')!;

function rodar(linhas: string[]) {
  const root = mkdtempSync(join(tmpdir(), 'checkers-'));
  mkdirSync(join(root, 'scripts'));
  const corpo = linhas.map((l) => `console.error(${JSON.stringify(l)});`).join('\n');
  writeFileSync(join(root, 'scripts', 'check-seller-scope.mjs'), `${corpo}\nprocess.exit(1);`);
  const r = gate.run({ root, behind: 0 });
  rmSync(root, { recursive: true, force: true });
  return r.items;
}

describe('rules/checkers — detalhe por ocorrência', () => {
  const cab = '❌ seller-scope check falhou — 1 violação(ões):';

  it('mantém as linhas com arquivo e tabela, não só o cabeçalho', () => {
    const items = rodar([cab, '  src/a.ts: query em "orders" sem seller scope']);
    expect(items).toContain('src/a.ts: query em "orders" sem seller scope');
  });

  it('corrigir uma violação e introduzir outra aparece como 1 novo + 1 resolvido', () => {
    const dia1 = rodar([cab, '  src/a.ts: query em "orders" sem seller scope']);
    const dia2 = rodar([cab, '  src/b.ts: query em "quotes" sem seller scope']);
    const mk = (items: string[]) => ({ results: [{ id: 'gate-seller-scope', severity: 'alta', kind: 'falha', items }] });
    const d = comparar(mk(dia2), mk(dia1));
    expect(d.novos.map((n: { item: string }) => n.item)).toContain('src/b.ts: query em "quotes" sem seller scope');
    expect(d.resolvidos.map((n: { item: string }) => n.item)).toContain('src/a.ts: query em "orders" sem seller scope');
  });

  it('remove cor ANSI e limita o volume', () => {
    const muitas = Array.from({ length: 200 }, (_, i) => `\u001b[31mfalha ${i}\u001b[0m`);
    const items = rodar(muitas);
    expect(items[0]).toBe('falha 0');
    expect(items.length).toBeLessThanOrEqual(61);
    expect(items.at(-1)).toContain('omitida');
  });
});
