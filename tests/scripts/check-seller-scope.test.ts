import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { analyzeSource } from '../../scripts/check-seller-scope.mjs';

const SCRIPT = resolve(__dirname, '../../scripts/check-seller-scope.mjs');
const tables = (source: string) => analyzeSource(source).map((v: { table: string }) => v.table);

describe('analyzeSource — consulta SEM escopo precisa ser acusada', () => {
  it.each([
    ['controle simples', 'const r = await supabase.from("quotes").select("*");'],
    ['aspas simples', "supabase.from('orders').select('*');"],
    ['template literal', 'supabase.from(`quotes`).select("*");'],
    ['nome em outra linha', 'supabase\n  .from(\n    "quotes",\n  )\n  .select("*");'],
    ['constante do arquivo', 'const T = "quotes" as const;\nsupabase.from(T).select("*");'],
    ['cast as any', 'supabase.from("quotes" as any).select("*");'],
    ['sinal só em comentário de linha', 'supabase.from("orders").select("*") // TODO .eq("seller_id", id)\n;'],
    ['sinal só em comentário de bloco', 'supabase.from("orders").select("*") /* .eq("seller_id", id) */;'],
    ['rpc seguinte não é escopo', 'const a = await supabase.from("quotes").select("*")\nawait supabase.rpc("log_view");'],
    ['rpc no mesmo statement não é escopo', 'supabase.from("quotes").select("*").then(() => supabase.rpc("x"));'],
    ['discount_approval_requests', 'supabase.from("discount_approval_requests").select("*");'],
  ])('%s', (_label, source) => {
    expect(analyzeSource(source).length).toBeGreaterThan(0);
  });

  it('em Promise.all cada query é avaliada sozinha (a escopada não "salva" a outra)', () => {
    const source = `await Promise.all([
      supabase.from("quotes").select("*"),
      supabase.from("orders").select("*").eq("seller_id", id),
    ]);`;
    expect(tables(source)).toEqual(['quotes']);
  });
});

describe('analyzeSource — consulta COM escopo ou justificada passa', () => {
  it.each([
    ['eq', 'supabase.from("quotes").select("*").eq("seller_id", id);'],
    ['eq em template', 'supabase.from("quotes").select("*").eq(`seller_id`, id);'],
    ['in', "supabase.from('orders').select('*').in('seller_id', ids);"],
    ['match', 'supabase.from("orders").select("*").match({ seller_id: id });'],
    ['filter', 'supabase.from("orders").select("*").filter("seller_id", "eq", id);'],
    ['or', 'supabase.from("orders").select("*").or("seller_id.eq.1,seller_id.eq.2");'],
    ['applySellerScope por fora', 'const q = applySellerScope(supabase.from("quotes").select("*"), { scope, userId });'],
    ['applySellerScope em linha anterior', 'const q = applySellerScope(\n  supabase.from("quotes").select("*"),\n  { scope },\n);'],
    ['rls-allow na linha', 'supabase.from("quotes").select("*"); // rls-allow: admin scope=all'],
    ['rls-allow na linha de cima', '// rls-allow: view server-side\nsupabase.from("quotes").select("*");'],
    ['filtro em linha seguinte da mesma cadeia', 'supabase\n  .from("orders")\n  .select("*")\n  .eq("seller_id", id);'],
    ['tabela não crítica', 'supabase.from("products").select("*");'],
    ['bucket de storage com nome de tabela', 'supabase.storage.from("quotes").upload(path, file);'],
    ['variável que não é constante conhecida', 'supabase.from(tableName).select("*");'],
  ])('%s', (_label, source) => {
    expect(analyzeSource(source)).toEqual([]);
  });

  it('informa a linha e a tabela da violação', () => {
    const source = 'const a = 1;\n\nsupabase.from("orders").select("*");\n';
    expect(analyzeSource(source)).toEqual([{ line: 3, table: 'orders', snippet: 'supabase.from("orders").select("*");' }]);
  });
});

describe('execução do gate', () => {
  it('a árvore real do repositório está limpa', () => {
    const result = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  });

  it.each(['q.ts', 'q.tsx', 'q.js', 'q.jsx', 'q.mts', 'q.mjs'])('varre arquivos %s', (name) => {
    // O script resolve a raiz pelo próprio caminho, então copiamos uma árvore mínima com ele dentro.
    const root = mkdtempSync(join(tmpdir(), 'seller-scope-'));
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'src/zz'), { recursive: true });
    writeFileSync(join(root, 'scripts/check-seller-scope.mjs'), readFileSync(SCRIPT));
    writeFileSync(join(root, 'src/zz', name), 'export const q = () => supabase.from("quotes").select("*");\n');
    const result = spawnSync(process.execPath, [join(root, 'scripts/check-seller-scope.mjs')], { encoding: 'utf8' });
    expect(result.status, result.stdout).toBe(1);
    expect(result.stderr).toContain(`src/zz/${name}`);
  });

  it('sem pasta src/ falha com exit 2 em vez de passar sem varrer', () => {
    const root = mkdtempSync(join(tmpdir(), 'seller-scope-vazio-'));
    mkdirSync(join(root, 'scripts'));
    writeFileSync(join(root, 'scripts/check-seller-scope.mjs'), readFileSync(SCRIPT));
    const result = spawnSync(process.execPath, [join(root, 'scripts/check-seller-scope.mjs')], { encoding: 'utf8' });
    expect(result.status).toBe(2);
  });
});
