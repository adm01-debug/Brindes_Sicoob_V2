// Testes do inventario do banco: node --test scripts/inventario/gerar-banco.unit.mjs
// Cobre as funcoes puras (envelopes de entrada, conferencia de origem, alertas) e o caminho
// completo `--entrada` escrevendo inventario/estado/banco.json num repo temporario.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  PARECE_CREDENCIAL,
  PROJETO_OFICIAL,
  compararEdges,
  conferirOrigem,
  contarUsoNoCodigo,
  edgesNoRepo,
  extrairInventario,
  montarInventario,
  rodaTodoDia,
  tabelasDeTypes,
} from './gerar-banco.mjs';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '..', '..');

const dadoBase = (extra = {}) => ({
  format_version: 1,
  medido_em: '2026-11-08T00:00:00Z',
  resumo: { tabelas_public: 1 },
  tabelas: [{ nome: 'quotes', rls: true, policies: 1, triggers: 0, linhas: 3, linhas_exatas: true, bytes: 8192, citada_no_banco: true }],
  cron: { disponivel: true, jobs: [], horas_paradas_7d: [], historico: { linhas: 0, mais_de_7_dias: 0 } },
  operacao: { filas: [] },
  ...extra,
});

test('extrairInventario aceita os envelopes de Management API, MCP e objeto direto', () => {
  const d = dadoBase();
  assert.equal(extrairInventario(d).medido_em, d.medido_em);
  assert.equal(extrairInventario({ rows: [{ inventario: d }] }).medido_em, d.medido_em);
  assert.equal(extrairInventario(JSON.stringify({ rows: [{ inventario: d }] })).medido_em, d.medido_em);
  assert.equal(extrairInventario({ result: { content: [{ type: 'text', text: JSON.stringify(d) }] } }).medido_em, d.medido_em);
  assert.equal(extrairInventario([{ inventario: JSON.stringify(d) }]).medido_em, d.medido_em);
});

test('extrairInventario recusa entrada incompleta, formato novo ou sem tabelas', () => {
  const { operacao, ...semOperacao } = dadoBase();
  assert.throws(() => extrairInventario(semOperacao), /sem as chaves: operacao/);
  assert.throws(() => extrairInventario(dadoBase({ format_version: 2 })), /format_version 2/);
  assert.throws(() => extrairInventario(dadoBase({ tabelas: [] })), /sem tabelas/);
});

test('tabelasDeTypes le as tabelas do types.ts deste repo', () => {
  const tabelas = tabelasDeTypes(RAIZ);
  assert.ok(tabelas.length > 100, `esperava >100 tabelas em types.ts, veio ${tabelas.length}`);
  assert.ok(tabelas.every((t) => /^[a-z0-9_]+$/.test(t)));
});

test('conferirOrigem aceita a resposta do banco oficial e recusa banco irmao', () => {
  const types = tabelasDeTypes(RAIZ);
  const oficial = dadoBase({ tabelas: types.map((nome) => ({ nome, rls: true, policies: 1, linhas: 0, citada_no_banco: true })) });
  const origem = conferirOrigem(oficial, types);
  assert.equal(origem.tabelas_em_comum_com_types, types.size ?? types.length);
  assert.ok(origem.migrations_no_repo > 0);
  // Banco irmao: poucas tabelas em comum.
  const irmao = dadoBase({ tabelas: [{ nome: 'produtos_catalogo_externo', rls: true, policies: 1, linhas: 1, citada_no_banco: false }] });
  assert.throws(() => conferirOrigem(irmao, types), new RegExp(PROJETO_OFICIAL));
  // types.ts vazio nao pode virar "origem conferida".
  assert.throws(() => conferirOrigem(oficial, []), /sem tabelas/);
});

test('conferirOrigem tolera tabela nova que o types.ts ainda nao tem', () => {
  const types = tabelasDeTypes(RAIZ);
  const comNovas = dadoBase({
    tabelas: [...types, 'tabela_nova_de_hoje', 'outra_nova'].map((nome) => ({ nome, rls: true, policies: 1, linhas: 0, citada_no_banco: true })),
  });
  assert.ok(conferirOrigem(comNovas, types).tabelas_em_comum_com_types > 0);
});

test('rodaTodoDia reconhece agenda diaria e recusa semanal/mensal', () => {
  assert.equal(rodaTodoDia('* * * * *'), true);
  assert.equal(rodaTodoDia('0 9 * * *'), true);
  assert.equal(rodaTodoDia('30 seconds'), true);
  assert.equal(rodaTodoDia('0 9 * * 1'), false);
  assert.equal(rodaTodoDia('0 9 1 * *'), false);
  assert.equal(rodaTodoDia(''), false);
  assert.equal(rodaTodoDia(undefined), false);
});

test('montarInventario aponta orfas, tabela sem RLS e RLS sem policy', () => {
  const dado = dadoBase({
    tabelas: [
      { nome: 'orfa', rls: true, policies: 2, linhas: 0, citada_no_banco: false },
      { nome: 'sem_rls', rls: false, policies: 0, linhas: 5, citada_no_banco: true },
      { nome: 'rls_sem_policy', rls: true, policies: 0, linhas: 5, citada_no_banco: true },
    ],
  });
  const inv = montarInventario(dado, {});
  assert.deepEqual(inv.tabelas_orfas.lista, ['orfa']);
  assert.deepEqual(inv.alertas.map((a) => a.tipo).sort(), ['rls_sem_policy', 'tabela_sem_rls']);
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'tabela_sem_rls').detalhe, ['sem_rls']);
  assert.deepEqual(inv.alertas.find((a) => a.tipo === 'rls_sem_policy').detalhe, ['rls_sem_policy']);
  assert.equal(inv.projeto, PROJETO_OFICIAL);
});

test('montarInventario alerta cron falhando, cron mudo, cron parado e historico sem limpeza', () => {
  const dado = dadoBase({
    cron: {
      disponivel: true,
      jobs: [
        { nome: 'falha', agenda: '* * * * *', ativo: true, execucoes_24h: 10, taxa_falha_7d_pct: 9 },
        { nome: 'mudo', agenda: '0 9 * * *', ativo: true, execucoes_24h: 0, taxa_falha_7d_pct: 0 },
        { nome: 'semanal-mudo', agenda: '0 9 * * 1', ativo: true, execucoes_24h: 0, taxa_falha_7d_pct: 0 },
        { nome: 'inativo', agenda: '* * * * *', ativo: false, execucoes_24h: 0, taxa_falha_7d_pct: 90 },
      ],
      horas_paradas_7d: [{ hora: '2026-11-07T03:00Z', execucoes: 4, falhas: 4 }],
      historico: { linhas: 100000, mais_de_7_dias: 60000 },
    },
  });
  const alertas = Object.fromEntries(montarInventario(dado, {}).alertas.map((a) => [a.tipo, a.detalhe]));
  assert.deepEqual(alertas.cron_falhando, ['falha (9% em 7d)']);
  assert.deepEqual(alertas.cron_sem_execucao, ['mudo']);
  assert.deepEqual(alertas.cron_parado, ['2026-11-07T03:00Z']);
  assert.ok(alertas.historico_cron_sem_limpeza[0].includes('60000'));
});

test('montarInventario avisa quando o cron nao pudo ser consultado', () => {
  const dado = dadoBase({ cron: { disponivel: false, jobs: [], horas_paradas_7d: [], historico: { linhas: 0, mais_de_7_dias: 0 } } });
  assert.ok(montarInventario(dado, {}).alertas.some((a) => a.tipo === 'cron_nao_consultado'));
});

test('montarInventario alerta fila com entrega travada e ignora status saudavel', () => {
  const dado = dadoBase({
    operacao: {
      filas: [
        { tabela: 'sicoob_approval_deliveries', linhas: 5, por_status: [{ status: 'failed', n: 2 }, { status: 'pending', n: 3 }] },
        { tabela: 'webhook_deliveries', linhas: 2, por_status: [{ status: 'sent', n: 2 }] },
        { tabela: 'notification_templates', linhas: 0, por_status: null },
      ],
    },
  });
  const alerta = montarInventario(dado, {}).alertas.find((a) => a.tipo === 'fila_com_falha');
  assert.deepEqual(alerta.detalhe, ['sicoob_approval_deliveries: 2 em failed']);
});

test('compararEdges separa publicada sem codigo e codigo sem deploy', () => {
  const sem = compararEdges(null, ['a', 'b']);
  assert.equal(sem.publicadas, null);
  assert.equal(sem.no_repo, 2);
  const com = compararEdges(
    [{ slug: 'a', version: 3, status: 'ACTIVE', verify_jwt: true, updated_at: '2026-11-01T10:20:30.000Z' },
      { slug: 'fantasma', version: 1, status: 'ACTIVE', verify_jwt: false, updated_at: null }],
    ['a', 'b'],
  );
  assert.deepEqual(com.no_repo_sem_deploy, ['b']);
  assert.deepEqual(com.publicadas_sem_codigo_no_repo, ['fantasma']);
  assert.equal(com.publicadas[0].atualizada_em, '2026-11-01T10:20Z');
  const alertas = montarInventario(dadoBase(), {}, com).alertas.map((a) => a.tipo);
  assert.ok(alertas.includes('edge_sem_deploy') && alertas.includes('edge_publicada_sem_codigo'));
});

test('edgesNoRepo lista as edge functions deste repo', () => {
  const edges = edgesNoRepo(RAIZ);
  assert.ok(edges.length > 50, `esperava >50 edge functions, veio ${edges.length}`);
  assert.ok(edges.every((e) => !e.startsWith('_')));
});

test('contarUsoNoCodigo conta .from e /rest/v1 fora de teste e ignora storage.from', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-uso-'));
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'supabase/functions/f'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src/a.ts'), "supabase.from('quotes'); supabase.storage.from('quotes'); fetch('/rest/v1/pedidos');");
  fs.writeFileSync(path.join(tmp, 'src/a.test.ts'), "supabase.from('quotes');");
  fs.writeFileSync(path.join(tmp, 'supabase/functions/f/index.ts'), "client.from('quotes');");
  const uso = contarUsoNoCodigo(tmp, ['quotes', 'pedidos', 'nunca_usada']);
  assert.deepEqual(uso.quotes, { src: 1, edges: 1 });
  assert.deepEqual(uso.pedidos, { src: 1, edges: 0 });
  assert.deepEqual(uso.nunca_usada, { src: 0, edges: 0 });
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('PARECE_CREDENCIAL pega Bearer, JWT e chave de servico', () => {
  assert.ok(PARECE_CREDENCIAL.test('Authorization: Bearer abcdefghijklmnopqrstuvwx'));
  assert.ok(PARECE_CREDENCIAL.test('eyJhbGciOiJIUzI1NiIsInR5cCI6.abc.def'));
  assert.ok(PARECE_CREDENCIAL.test('sb_secret_xyz'));
  assert.equal(PARECE_CREDENCIAL.test('select count(*) from public.quotes'), false);
});

test('--entrada grava inventario/estado/banco.json e recusa resposta de outro banco', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'inv-cli-'));
  // Repo temporario com o minimo que o script le: types.ts, migrations, uma edge e o proprio script.
  fs.mkdirSync(path.join(tmp, 'src/integrations/supabase'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'supabase/migrations'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'supabase/functions/minha-edge'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts/inventario'), { recursive: true });
  fs.mkdirSync(path.join(tmp, 'scripts/db'), { recursive: true });
  fs.cpSync(path.join(AQUI, 'gerar-banco.mjs'), path.join(tmp, 'scripts/inventario/gerar-banco.mjs'));
  fs.cpSync(path.join(AQUI, 'banco.sql'), path.join(tmp, 'scripts/inventario/banco.sql'));
  fs.cpSync(path.join(RAIZ, 'scripts/db/supabase-sql-client.mjs'), path.join(tmp, 'scripts/db/supabase-sql-client.mjs'));
  fs.writeFileSync(path.join(tmp, 'supabase/functions/minha-edge/index.ts'), 'export default 1;\n');
  fs.writeFileSync(path.join(tmp, 'supabase/migrations/20260101000000_x.sql'), 'select 1;\n');
  const tabelas = ['quotes', 'pedidos', 'webhook_deliveries'];
  fs.writeFileSync(
    path.join(tmp, 'src/integrations/supabase/types.ts'),
    `export type Database = {\n  public: {\n    Tables: {\n${tabelas.map((t) => `      ${t}: {\n        Row: { id: string }\n      }`).join('\n')}\n    }\n    Views: {\n    }\n  }\n}\n`,
  );
  const entrada = path.join(tmp, 'resposta.json');
  fs.writeFileSync(entrada, JSON.stringify({
    rows: [{
      inventario: dadoBase({
        tabelas: tabelas.map((nome) => ({ nome, rls: nome !== 'pedidos', policies: 1, triggers: 0, linhas: 1, linhas_exatas: true, bytes: 8192, citada_no_banco: true })),
        operacao: { filas: [{ tabela: 'webhook_deliveries', linhas: 1, por_status: [{ status: 'failed', n: 1 }] }] },
      }),
    }],
  }));
  const functions = path.join(tmp, 'functions.json');
  fs.writeFileSync(functions, JSON.stringify([{ slug: 'minha-edge', version: 2, status: 'ACTIVE', verify_jwt: true, updated_at: '2026-11-01T00:00:00Z' }]));

  const saida = execFileSync(process.execPath, ['scripts/inventario/gerar-banco.mjs', '--entrada', entrada, '--functions', functions], { cwd: tmp, encoding: 'utf8' });
  assert.match(saida, /banco\.json: 3 tabelas/);
  const gravado = JSON.parse(fs.readFileSync(path.join(tmp, 'inventario/estado/banco.json'), 'utf8'));
  assert.equal(gravado.projeto, PROJETO_OFICIAL);
  assert.equal(gravado.origem.tabelas_em_types, 3);
  assert.equal(gravado.edge_functions.publicadas.length, 1);
  assert.deepEqual(gravado.edge_functions.no_repo_sem_deploy, []);
  const tipos = gravado.alertas.map((a) => a.tipo);
  assert.ok(tipos.includes('tabela_sem_rls') && tipos.includes('fila_com_falha'));
  // Chaves ordenadas: o diff entre semanas sai so no que mudou.
  assert.deepEqual(Object.keys(gravado), [...Object.keys(gravado)].sort());

  // Resposta de outro banco: exit 2 e nada regravado.
  fs.writeFileSync(entrada, JSON.stringify({ rows: [{ inventario: dadoBase() }] }));
  assert.throws(
    () => execFileSync(process.execPath, ['scripts/inventario/gerar-banco.mjs', '--entrada', entrada], { cwd: tmp, encoding: 'utf8', stdio: 'pipe' }),
    (erro) => erro.status === 2 && /nao parece ser do banco oficial/.test(String(erro.stderr)),
  );
  fs.rmSync(tmp, { recursive: true, force: true });
});
