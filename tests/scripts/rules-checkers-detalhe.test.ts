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

describe('rules/checkers — honestidade do resultado', () => {
  const imutavel = (checkers as Regra[]).find((r) => r.id === 'gate-migration-imutavel')!;
  const rodarImutavel = (behind: number) => {
    const root = mkdtempSync(join(tmpdir(), 'checkers-'));
    mkdirSync(join(root, 'scripts'));
    writeFileSync(join(root, 'scripts', 'check-migration-immutability.mjs'), 'console.error("removido x");\nprocess.exit(1);');
    const r = imutavel.run({ root, behind }) as { items: string[]; error?: string; note?: string };
    rmSync(root, { recursive: true, force: true });
    return r;
  };

  it('gate sensível a clone atrasado é inconclusivo (erro da regra), nunca "sem itens" resolvido', () => {
    const r = rodarImutavel(3);
    expect(r.items).toEqual([]);
    expect(r.error).toContain('inconclusivo');
    expect(r.note).toBeUndefined();
    // Com erro a regra sai da comparação diária: não pode virar "resolvido".
    const mk = (extra: object) => ({ results: [{ id: 'gate-migration-imutavel', severity: 'alta', kind: 'falha', items: ['removido x'], ...extra }] });
    const d = comparar({ results: [{ id: 'gate-migration-imutavel', severity: 'alta', kind: 'falha', items: [], error: r.error }] }, mk({}));
    expect(d.resolvidos).toEqual([]);
  });

  it('clone em dia reporta a violação normalmente', () => {
    expect(rodarImutavel(0).items).toContain('removido x');
  });

  it('a linha de omitidas conta só as linhas únicas (repetidas não inventam omissão)', () => {
    // 70 linhas, mas só 40 únicas (<= 60): nenhuma omitida.
    const linhas = Array.from({ length: 70 }, (_, i) => `falha ${i % 40}`);
    const items = rodar(linhas);
    expect(items).toHaveLength(40);
    expect(items.some((l) => l.includes('omitida'))).toBe(false);
  });

  it('omitidas = únicas - exibidas', () => {
    const items = rodar(Array.from({ length: 75 }, (_, i) => `falha ${i}`));
    expect(items.at(-1)).toContain('+15 linha(s) omitida(s)');
  });
});
