import { describe, expect, it } from 'vitest';
import { generateScheduledReportHtml } from '../../supabase/functions/_shared/scheduled-report-data';

const SELLER = '11111111-1111-1111-1111-111111111111';
const REFERENCIA = new Date('2026-03-10T12:00:00.000Z');

type Linha = Record<string, unknown>;

/**
 * O anexo de nota tem `amount` opcional (a tela aceita o campo em branco) e o
 * PDF e o XML da mesma nota entram como linhas distintas. O duplo filtro do
 * cliente falso separa a consulta do faturamento (por `issued_at`) da consulta
 * de ajustes (por `created_at`), como no worker real.
 */
function clienteFalso(invoices: Linha[], lateInvoices: Linha[]) {
  const builder = (tabela: string) => {
    // A mesma tabela e consultada duas vezes (faturamento por `issued_at` e
    // ajustes por `created_at`), entao cada `from()` novo zera a coluna.
    let coluna = '';
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      // Vence o primeiro `gte` da consulta: a lista devolvida e a das notas
      // do periodo (emissao) ou a das notas registradas (registro).
      gte: (col: string) => {
        if (!coluna) coluna = col;
        return chain;
      },
      lt: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      then: (resolve: (valor: unknown) => unknown) => {
        let data: unknown = [];
        if (tabela === 'user_roles') data = [{ role: 'vendedor' }];
        else if (coluna === 'issued_at') data = invoices;
        else if (coluna === 'created_at') data = lateInvoices;
        return Promise.resolve({ data, error: null }).then(resolve);
      },
    };
    return chain;
  };
  return { from: builder };
}

async function relatorio(invoices: Linha[], lateInvoices: Linha[]) {
  return generateScheduledReportHtml(
    clienteFalso(invoices, lateInvoices) as never,
    {
      id: 'rel-1',
      user_id: SELLER,
      report_type: 'sales',
      frequency: 'monthly',
      report_name: 'Vendas do mes',
      email_to: 'vendedor@test',
    },
    REFERENCIA,
  );
}

const notaCom = (amount: number | null, created_at: string) => ({
  order_id: 'ped-1',
  invoice_number: '12345',
  amount,
  issued_at: '2020-01-05',
  created_at,
});

describe('faturamento por nota fiscal no relatorio agendado', () => {
  it('preserva o valor informado no anexo anterior quando o mais recente vem em branco', async () => {
    // PDF com valor de R$ 250 (mais antigo) e XML sem valor anexado depois: a
    // consulta de ajustes entrega o mais recente primeiro.
    const html = await relatorio(
      [],
      [notaCom(null, '2026-03-09T10:00:00.000Z'), notaCom(250, '2026-03-05T10:00:00.000Z')],
    );

    const ajustes = html.slice(html.indexOf('Ajustes de faturamento'));
    expect(ajustes).toContain('250,00');
    expect(ajustes).not.toContain('R$ 0,00');
    expect(ajustes).toContain('1 \u2014');
  });

  it('nao soma a mesma nota duas vezes quando os dois anexos trazem valor', async () => {
    const html = await relatorio(
      [],
      [notaCom(250, '2026-03-09T10:00:00.000Z'), notaCom(250, '2026-03-05T10:00:00.000Z')],
    );

    const ajustes = html.slice(html.indexOf('Ajustes de faturamento'));
    expect(ajustes).toContain('250,00');
    expect(ajustes).not.toContain('500,00');
    expect(ajustes).toContain('1 \u2014');
  });

  it('nao trata como ajuste a nota registrada no periodo, mesmo com as datas de emissao divergentes entre PDF e XML', async () => {
    // PDF emitido em 07/03 e XML emitido em 09/03 (mesma nota, datas
    // divergentes), ambos registrados em 09/03 — antes do fechamento do ciclo
    // (10/03): nada vira ajuste, porque a nota foi registrada dentro do
    // periodo em que foi emitida e esta no faturamento.
    const html = await relatorio(
      [],
      [
        { order_id: 'ped-2', invoice_number: '555', amount: 100, issued_at: '2026-03-07', created_at: '2026-03-09T10:00:00.000Z' },
        { order_id: 'ped-2', invoice_number: '555', amount: 100, issued_at: '2026-03-09', created_at: '2026-03-09T10:02:00.000Z' },
      ],
    );

    expect(html).not.toContain('Ajustes de faturamento');
  });

  it('conta como ajuste a nota registrada no periodo cuja emissao e anterior ao registro', async () => {
    const html = await relatorio(
      [],
      [
        { order_id: 'ped-3', invoice_number: '777', amount: 400, issued_at: '2026-01-20', created_at: '2026-03-04T10:00:00.000Z' },
        { order_id: 'ped-3', invoice_number: '777', amount: 400, issued_at: '2026-01-20', created_at: '2026-03-06T10:00:00.000Z' },
      ],
    );

    const ajustes = html.slice(html.indexOf('Ajustes de faturamento'));
    expect(ajustes).toContain('400,00');
    expect(ajustes).toContain('1 \u2014');
  });

  it('XML ja faturado no ciclo nao soma o valor de novo no ajuste', async () => {
    // A nota 12345 entrou no faturamento pelo XML (emitida em 09/03, dentro da
    // janela que comeca em 08/03). O PDF da MESMA nota foi emitido em 20/02 —
    // antes da janela — e chegou agora: a consulta de ajustes devolve as duas
    // linhas porque ambas foram registradas no periodo. O XML e o unico anexo
    // que comprova atraso, mas o valor dele ja esta no faturamento, entao o
    // ajuste nao pode repetir os 250,00.
    const html = await relatorio(
      [
        {
          order_id: 'ped-1',
          invoice_number: '12345',
          amount: 250,
          issued_at: '2026-03-09',
          sicoob_orders: { created_by: SELLER },
        },
      ],
      [
        { order_id: 'ped-1', invoice_number: '12345', amount: 250, issued_at: '2026-03-09', created_at: '2026-03-09T10:00:00.000Z' },
        { order_id: 'ped-1', invoice_number: '12345', amount: 250, issued_at: '2026-02-20', created_at: '2026-03-05T10:00:00.000Z' },
      ],
    );

    expect(html).not.toContain('Ajustes de faturamento');
  });

  it('ajuste herda o valor do anexo anterior quando o que comprova atraso vem em branco', async () => {
    // Dois anexos da mesma nota, ambos registrados no ciclo e nenhum no
    // faturamento: o antigo (emitido em 01/02) comprova o atraso mas veio sem
    // valor; o do periodo (09/03) tem o valor. O ajuste usa o valor do anexo
    // com valor em vez de sair em R$ 0,00. O anexo do periodo aparece PRIMEIRO
    // na consulta de registro (ordem do banco).
    const html = await relatorio(
      [],
      [
        { order_id: 'ped-5', invoice_number: '4321', amount: 300, issued_at: '2026-03-09', created_at: '2026-03-09T10:00:00.000Z' },
        { order_id: 'ped-5', invoice_number: '4321', amount: null, issued_at: '2026-02-01', created_at: '2026-03-04T10:00:00.000Z' },
      ],
    );

    const ajustes = html.slice(html.indexOf('Ajustes de faturamento'));
    expect(ajustes).toContain('4321');
    expect(ajustes).toContain('300,00');
    expect(ajustes).not.toContain('R$ 0,00');
  });

  it('ajuste herda o valor tambem quando o anexo em branco vem primeiro', async () => {
    // A consulta de registro nao garante ordem entre os anexos da nota; o
    // valor precisa ser herdado em qualquer ordem.
    const html = await relatorio(
      [],
      [
        { order_id: 'ped-5', invoice_number: '4321', amount: null, issued_at: '2026-02-01', created_at: '2026-03-04T10:00:00.000Z' },
        { order_id: 'ped-5', invoice_number: '4321', amount: 300, issued_at: '2026-03-09', created_at: '2026-03-09T10:00:00.000Z' },
      ],
    );

    const ajustes = html.slice(html.indexOf('Ajustes de faturamento'));
    expect(ajustes).toContain('4321');
    expect(ajustes).toContain('300,00');
  });

  it('nao soma em ajustes a nota cujo anexo do ciclo entrou no faturamento', async () => {
    // PDF emitido em 20/02 e XML da mesma nota emitido em 09/03, ambos
    // registrados no ciclo de 08/03. O faturamento ja reporta a nota; o anexo
    // antigo nao pode reabrir o valor no subtotal de ajustes.
    const html = await relatorio(
      [
        {
          order_id: 'ped-6',
          invoice_number: '555',
          amount: 250,
          issued_at: '2026-03-09',
          sicoob_orders: { created_by: SELLER },
        },
      ],
      [
        { order_id: 'ped-6', invoice_number: '555', amount: 250, issued_at: '2026-03-09', created_at: '2026-03-09T10:00:00.000Z' },
        { order_id: 'ped-6', invoice_number: '555', amount: 250, issued_at: '2026-02-20', created_at: '2026-03-05T10:00:00.000Z' },
      ],
    );

    expect(html).toContain('250,00');
    expect(html).not.toContain('Ajustes de faturamento');
  });

  it('anexo antigo sem data de emissao nao entra nos ajustes', async () => {
    // A coluna `issued_at` nasceu opcional; comparar string vazia com a janela
    // classificava a nota como emitida antes do periodo e inflava a contagem.
    const html = await relatorio(
      [],
      [
        { order_id: 'ped-4', invoice_number: '888', amount: 900, issued_at: null, created_at: '2026-03-05T10:00:00.000Z' },
      ],
    );

    expect(html).not.toContain('Ajustes de faturamento');
  });

  it('no faturamento do periodo, o anexo sem valor nao zera a nota', async () => {
    const html = await relatorio(
      [
        {
          order_id: 'ped-1',
          invoice_number: '999',
          amount: null,
          issued_at: '2026-03-06',
          sicoob_orders: { created_by: SELLER },
        },
        {
          order_id: 'ped-1',
          invoice_number: '999',
          amount: 250,
          issued_at: '2026-03-06',
          sicoob_orders: { created_by: SELLER },
        },
      ],
      [],
    );

    const faturamento = html.slice(
      0,
      html.indexOf('Propostas aprovadas no periodo') >= 0
        ? html.indexOf('Propostas aprovadas no periodo')
        : html.length,
    );
    expect(faturamento).toContain('250,00');
    expect(faturamento).toContain('1 \u2014');
  });
});
