// Testes do gate de PR do inventario: node --test scripts/inventario/mudou-conteudo.unit.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { PADRAO, mudou, semCarimbos } from './mudou-conteudo.mjs';

const ler = (mapa) => (f) => (f in mapa ? JSON.stringify(mapa[f]) : null);
const banco = (extra = {}) => ({
  medido_em: '2026-11-08T00:00:00Z',
  tabelas: [{ nome: 'quotes', rls: true, policies: 1, linhas: 10, bytes: 8192 }],
  cron: { jobs: [{ nome: 'j', ativo: true, execucoes_7d: 10, falhas_7d: 1, taxa_falha_7d_pct: 10 }], historico: { linhas: 100, bytes: 999, mais_de_7_dias: 10 } },
  operacao: { filas: [{ tabela: 'webhook_deliveries', linhas: 5, bytes: 8192, por_status: [{ status: 'failed', n: 2 }] }] },
  alertas: [{ tipo: 'cron_falhando', detalhe: ['j (10% em 7d)'] }, { tipo: 'fila_com_falha', detalhe: ['webhook_deliveries: 2 em failed'] }],
  ...extra,
});

test('PADRAO cobre os tres arquivos do inventario', () => {
  assert.deepEqual(PADRAO, ['inventario/estado/banco.json', 'inventario/estado/rotas.json', 'inventario/estado/edges.json']);
});

test('carimbo de data sozinho nao conta como mudanca', () => {
  const antes = banco();
  const depois = banco({ medido_em: '2026-11-15T00:00:00Z' });
  assert.equal(semCarimbos(JSON.stringify(antes)), semCarimbos(JSON.stringify(depois)));
});

test('telemetria do cron e contagem de fila nao contam como mudanca', () => {
  const antes = JSON.stringify(banco());
  const d = banco();
  d.cron.jobs[0].execucoes_7d = 99;
  d.cron.jobs[0].taxa_falha_7d_pct = 12.5;
  d.cron.historico.linhas = 50000;
  d.cron.historico.mais_de_7_dias = 4000;
  d.operacao.filas[0].linhas = 77;
  d.operacao.filas[0].por_status = [{ status: 'failed', n: 40 }];
  d.alertas = [{ tipo: 'cron_falhando', detalhe: ['j (12.5% em 7d)'] }, { tipo: 'fila_com_falha', detalhe: ['webhook_deliveries: 40 em failed'] }];
  assert.equal(semCarimbos(antes), semCarimbos(JSON.stringify(d)));
});

test('linhas de uma tabela continuam sendo comparadas', () => {
  const d = banco();
  d.tabelas[0].linhas = 11;
  assert.notEqual(semCarimbos(JSON.stringify(banco())), semCarimbos(JSON.stringify(d)));
});

test('mudanca estrutural conta: RLS, tabela nova, fila nova e status novo', () => {
  const casos = [
    (d) => { d.tabelas[0].rls = false; },
    (d) => { d.tabelas.push({ nome: 'nova', rls: true, policies: 0, linhas: 0, bytes: 0 }); },
    (d) => { d.operacao.filas.push({ tabela: 'outra_fila', linhas: 0, bytes: 0, por_status: null }); },
    (d) => { d.operacao.filas[0].por_status = [{ status: 'dead_letter', n: 1 }]; },
    (d) => { d.alertas.push({ tipo: 'tabela_sem_rls', detalhe: ['x'] }); },
    (d) => { d.alertas[0].detalhe = ['outro_job (10% em 7d)']; },
  ];
  for (const aplicar of casos) {
    const d = banco();
    aplicar(d);
    assert.notEqual(semCarimbos(JSON.stringify(banco())), semCarimbos(JSON.stringify(d)), aplicar.toString());
  }
});

test('mudou() considera arquivo novo, apagado e texto que nao e JSON', () => {
  const arquivos = ['a.json'];
  assert.equal(mudou(arquivos, () => null, ler({ 'a.json': banco() })), true);
  assert.equal(mudou(arquivos, ler({ 'a.json': banco() }), () => null), true);
  assert.equal(mudou(arquivos, ler({ 'a.json': banco() }), ler({ 'a.json': banco() })), false);
  assert.equal(mudou(arquivos, () => 'nao e json', () => 'nao e json'), false);
  assert.equal(mudou(arquivos, () => 'nao e json', () => 'outro texto'), true);
});
