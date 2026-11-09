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

function rodarCorpo(corpo: string) {
  const root = mkdtempSync(join(tmpdir(), 'checkers-'));
  mkdirSync(join(root, 'scripts'));
  writeFileSync(join(root, 'scripts', 'check-seller-scope.mjs'), corpo);
  const r = gate.run({ root, behind: 0 }) as { items: string[]; error?: string };
  rmSync(root, { recursive: true, force: true });
  return r;
}

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
  it('gate que não executa (dependência ausente) é inconclusivo, não achado', () => {
    const r = rodarCorpo("import 'pacote-que-nao-existe-xyz';");
    expect(r.items).toEqual([]);
    expect(r.error).toContain('não executou');
    expect(r.error).toContain('inconclusivo');
  });

  it('gate morto por sinal ou exceção não tratada também é inconclusivo', () => {
    expect(rodarCorpo("process.kill(process.pid, 'SIGKILL');").error).toContain('não executou');
    expect(rodarCorpo("throw new TypeError('quebrou');").error).toContain('TypeError');
  });

  it('violação que só menciona "TypeError" no texto continua sendo achado', () => {
    const r = rodarCorpo("console.error('src/a.ts: catch (e: TypeError) sem seller scope'); process.exit(1);");
    expect(r.error).toBeUndefined();
    expect(r.items).toEqual(['src/a.ts: catch (e: TypeError) sem seller scope']);
  });

  it('achado de ontem + gate que não executou hoje: nada é anunciado como resolvido', () => {
    const ontem = rodar(['❌ seller-scope check falhou — 1 violação(ões):', '  src/a.ts: query em "orders" sem seller scope']);
    const hoje = rodarCorpo("import 'pacote-que-nao-existe-xyz';");
    const mk = (items: string[], error?: string) => ({ results: [{ id: 'gate-seller-scope', severity: 'alta', kind: 'falha', items, ...(error ? { error } : {}) }] });
    const d = comparar(mk(hoje.items, hoje.error), mk(ontem));
    expect(d.resolvidos).toEqual([]);
    expect(d.novos).toEqual([]);
    expect(d.inconclusivas).toContain('gate-seller-scope');
  });
});
