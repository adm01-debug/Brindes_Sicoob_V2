// deno-lint-ignore-file no-import-prefix
import { assertEquals, assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateScheduledReportHtml } from "../_shared/scheduled-report-data.ts";
import {
  calculateNextRun,
  getAnchorDay,
  getPeriodStart,
  isScheduledReportType,
} from "./report-types.ts";

const NOW = new Date("2026-11-22T12:00:00.000Z");

function fakeSupabase(responses: Record<string, { data?: unknown[]; error?: unknown }>) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]>; select?: string }> = [];
  const client = {
    from(table: string) {
      const call = { table, filters: [] as Array<[string, unknown]>, select: undefined as string | undefined };
      calls.push(call);
      const builder: any = {
        select(columns: string) {
          call.select = columns;
          return builder;
        },
        eq(column: string, value: unknown) {
          call.filters.push([column, value]);
          return builder;
        },
        gte(column: string, value: unknown) {
          call.filters.push([`gte:${column}`, value]);
          return builder;
        },
        lt(column: string, value: unknown) {
          call.filters.push([`lt:${column}`, value]);
          return builder;
        },
        in(column: string, value: unknown) {
          call.filters.push([`in:${column}`, value]);
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          const response: any = responses[table]
            ?? (table === "user_roles" ? { data: [{ role: "vendedor" }] } : { data: [] });
          // O fake precisa honrar `.in()`: sem isso o filtro de status aprovado
          // não teria efeito e o teste passaria por acidente.
          let data = response?.data;
          if (Array.isArray(data)) {
            for (const [column, value] of call.filters) {
              if (!column.startsWith("in:") || !Array.isArray(value)) continue;
              const field = column.slice(3);
              data = data.filter((row: any) => value.includes(row?.[field]));
            }
          }
          return Promise.resolve({ ...response, data }).then(resolve, reject);
        },
      };
      return builder;
    },
  };
  return { client, calls };
}

Deno.test("todo tipo aceito pelo CHECK do banco tem gerador", () => {
  for (const type of ["sales", "quotes", "clients", "products", "orders"]) {
    assertEquals(isScheduledReportType(type), true);
  }
  assertEquals(isScheduledReportType("unknown"), false);
});

Deno.test("próxima execução fica ancorada em 8h e avança o período", () => {
  const daily = calculateNextRun("daily", NOW);
  assertEquals(daily.toISOString(), "2026-11-23T08:00:00.000Z");

  const weekly = calculateNextRun("weekly", NOW);
  assertEquals(weekly.toISOString(), "2026-11-29T08:00:00.000Z");

  const monthly = calculateNextRun("monthly", NOW);
  assertEquals(monthly.toISOString(), "2026-12-22T08:00:00.000Z");
});

Deno.test("janela do período segue a frequência", () => {
  assertEquals(getPeriodStart("daily", NOW), "2026-11-21T12:00:00.000Z");
  assertEquals(getPeriodStart("weekly", NOW), "2026-11-15T12:00:00.000Z");
  assertEquals(getPeriodStart("monthly", NOW), "2026-10-23T12:00:00.000Z");
});

Deno.test("relatório de orçamentos filtra pelo dono do agendamento", async () => {
  const { client, calls } = fakeSupabase({
    quotes: {
      data: [{
        quote_number: "ORC-1",
        client_name: "ACME",
        client_company: null,
        status: "approved",
        total: 250.5,
        created_at: "2026-11-20T10:00:00.000Z",
      }],
    },
  });

  const html = await generateScheduledReportHtml(client as any, {
    id: "r1",
    user_id: "vendedor-1",
    report_type: "quotes",
    frequency: "weekly",
    report_name: "Semanal",
    email_to: "gestor@exemplo.com",
  }, NOW);

  const quotesCall = calls.find((c) => c.table === "quotes")!;
  assertEquals(quotesCall.filters.some(([column, value]) =>
    column === "seller_id" && value === "vendedor-1"
  ), true);
  assertEquals(html.includes("ORC-1"), true);
  assertEquals(html.includes("R$&nbsp;250,50") || html.includes("250,50"), true);
});

Deno.test("agendamento sem dono é rejeitado antes de consultar", async () => {
  const { client } = fakeSupabase({});
  let error: unknown;
  try {
    await generateScheduledReportHtml(client as any, {
      id: "r1",
      user_id: "",
      report_type: "quotes",
      frequency: "weekly",
      report_name: "Semanal",
      email_to: "gestor@exemplo.com",
    }, NOW);
  } catch (err) {
    error = err;
  }
  assertThrows(() => {
    if (!error) throw new Error("sem erro");
    throw error;
  }, Error, "scheduled_report_owner_missing");
});

Deno.test("erro da consulta sobe em vez de enviar relatório vazio", async () => {
  const { client } = fakeSupabase({ orders: { data: [], error: new Error("boom") } });
  let error: unknown;
  try {
    await generateScheduledReportHtml(client as any, {
      id: "r1",
      user_id: "vendedor-1",
      report_type: "orders",
      frequency: "weekly",
      report_name: "Pedidos",
      email_to: "gestor@exemplo.com",
    }, NOW);
  } catch (err) {
    error = err;
  }
  assertEquals((error as Error)?.message, "boom");
});

Deno.test("HTML do relatório escapa nome de cliente", async () => {
  const { client } = fakeSupabase({
    orders: {
      data: [{
        order_number: "PED-1",
        client_name: "<script>alert(1)</script>",
        status: "paid",
        total: 10,
        created_at: "2026-11-20T10:00:00.000Z",
      }],
    },
  });

  const html = await generateScheduledReportHtml(client as any, {
    id: "r1",
    user_id: "vendedor-1",
    report_type: "orders",
    frequency: "weekly",
    report_name: "Pedidos",
    email_to: "gestor@exemplo.com",
  }, NOW);

  assertEquals(html.includes("<script>"), false);
  assertEquals(html.includes("&lt;script&gt;"), true);
});

Deno.test("janela fecha onde o ciclo anterior fechou", () => {
  const previous = new Date("2026-10-22T12:00:00.000Z");
  assertEquals(getPeriodStart("monthly", NOW, previous), previous.toISOString());
  // Sem ciclo anterior cai nos dias nominais da frequência.
  assertEquals(getPeriodStart("monthly", NOW), "2026-10-23T12:00:00.000Z");
  // Ciclo no futuro (relógio adiantado) é ignorado.
  assertEquals(
    getPeriodStart("daily", NOW, new Date("2027-01-01T00:00:00.000Z")),
    "2026-11-21T12:00:00.000Z",
  );
});

Deno.test("mensal em 31/01 cai no fim de fevereiro, não em março", () => {
  const jan31 = new Date("2026-01-31T12:00:00.000Z");
  assertEquals(calculateNextRun("monthly", jan31).toISOString(), "2026-02-28T08:00:00.000Z");

  const leap = new Date("2028-01-31T12:00:00.000Z");
  assertEquals(calculateNextRun("monthly", leap).toISOString(), "2028-02-29T08:00:00.000Z");

  const mar31 = new Date("2026-03-31T12:00:00.000Z");
  assertEquals(calculateNextRun("monthly", mar31).toISOString(), "2026-04-30T08:00:00.000Z");
});

function report(type: string, extra: Record<string, unknown> = {}) {
  return {
    id: "r1",
    user_id: "vendedor-1",
    report_type: type,
    frequency: "weekly",
    report_name: "Semanal",
    email_to: "gestor@exemplo.com",
    ...extra,
  };
}

Deno.test("vendas fatura pela nota emitida e não dobra PDF com XML", async () => {
  const { client, calls } = fakeSupabase({
    sicoob_order_invoices: {
      data: [
        { order_id: "o1", invoice_number: "NF-1", file_type: "pdf", amount: 100, issued_at: "2026-11-20" },
        { order_id: "o1", invoice_number: "NF-1", file_type: "xml", amount: 100, issued_at: "2026-11-20" },
        { order_id: "o2", invoice_number: "NF-2", file_type: "pdf", amount: 50, issued_at: "2026-11-19" },
      ],
    },
    quotes: { data: [] },
  });

  const html = await generateScheduledReportHtml(client as any, report("sales"), NOW);

  const invoicesCall = calls.find((c) => c.table === "sicoob_order_invoices")!;
  assertEquals(invoicesCall.filters.some(([col, value]) =>
    col === "sicoob_orders.created_by" && value === "vendedor-1"
  ), true, "faturamento sem filtro de vendedor vazaria nota de outro vendedor");
  assertEquals(html.includes("Notas emitidas:</strong> 2"), true);
  assertEquals(html.includes("150,00"), true);
  // Sem a deduplicação o PDF e o XML da NF-1 entram os dois e o total vira 250.
  assertEquals(html.includes("250,00"), false);
});

Deno.test("vendas conta aprovação pela data do evento, não da criação", async () => {
  const { client, calls } = fakeSupabase({
    sicoob_order_invoices: { data: [] },
    quotes: {
      data: [
        { quote_number: "ORC-1", client_name: "ACME", client_company: null, total: 300, approved_at: "2026-11-20T10:00:00.000Z", created_at: "2026-10-01T10:00:00.000Z" },
      ],
    },
  });

  const html = await generateScheduledReportHtml(client as any, report("sales"), NOW);

  const quotesCall = calls.find((c) => c.table === "quotes")!;
  assertEquals(quotesCall.filters.some(([col]) => col === "gte:approved_at"), true);
  assertEquals(quotesCall.filters.some(([col]) => col === "gte:created_at"), false);
  assertEquals(html.includes("ORC-1"), true);
  assertEquals(html.includes("300,00"), true);
});

Deno.test("pedidos consolidam as duas origens sem perder sicoob_orders", async () => {
  const { client } = fakeSupabase({
    orders: {
      data: [{ order_number: "PED-1", client_name: "Ana", client_company: "Alfa", status: "paid", total: 10, created_at: "2026-11-20T10:00:00.000Z" }],
    },
    sicoob_orders: {
      data: [{
        id: "11111111-2222-3333-4444-555555555555",
        status: "pending",
        total_amount: 25.5,
        created_at: "2026-11-21T10:00:00.000Z",
        source_quote_snapshot: { client_name: "Bruno", client_company: "Beta" },
      }],
    },
  });

  const html = await generateScheduledReportHtml(client as any, report("orders"), NOW);

  assertEquals(html.includes("PED-1"), true);
  assertEquals(html.includes("SICOOB-11111111"), true);
  assertEquals(html.includes("Beta"), true);
  assertEquals(html.includes("Pedidos no período:</strong> 2"), true);
  assertEquals(html.includes("35,50"), true);
});

Deno.test("clientes não duplicam empresa e contato do mesmo cliente", async () => {
  const { client } = fakeSupabase({
    quotes: {
      data: [{ client_name: "Ana", client_company: "Alfa", total: 10 }],
    },
    orders: {
      data: [{ client_name: "Ana", client_company: "Alfa", total: 20 }],
    },
    sicoob_orders: {
      data: [{ total_amount: 30, source_quote_snapshot: { client_name: "Ana", client_company: "Alfa" } }],
    },
  });

  const html = await generateScheduledReportHtml(client as any, report("clients"), NOW);

  assertEquals(html.includes("Clientes no período:</strong> 1"), true);
  assertEquals(html.includes("60,00"), true);
});

Deno.test("produtos separam variantes com SKUs diferentes", async () => {
  const { client } = fakeSupabase({
    quotes: { data: [{ id: "q1" }] },
    quote_items: {
      data: [
        { quote_id: "q1", product_name: "Caneca", product_sku: "CAN-A", quantity: 2, subtotal: 20 },
        { quote_id: "q1", product_name: "Caneca", product_sku: "CAN-B", quantity: 3, subtotal: 45 },
      ],
    },
  });

  const html = await generateScheduledReportHtml(client as any, report("products"), NOW);

  assertEquals(html.includes("Produtos no período:</strong> 2"), true);
  assertEquals(html.includes("CAN-A") && html.includes("CAN-B"), true);
});

Deno.test("cada tipo abre a sua própria seção", async () => {
  const empty = {
    orders: { data: [] },
    sicoob_orders: { data: [] },
    quotes: { data: [] },
    quote_items: { data: [] },
  };
  const expectations: Array<[string, string, string]> = [
    ["quotes", "Orçamentos no período", "Pedidos no período"],
    ["orders", "Pedidos no período", "Orçamentos no período"],
    ["clients", "Clientes no período", "Produtos no período"],
    ["products", "Produtos no período", "Clientes no período"],
    ["sales", "Propostas aprovadas", "Orçamentos no período"],
  ];
  for (const [type, must, mustNot] of expectations) {
    const { client } = fakeSupabase(empty);
    const html = await generateScheduledReportHtml(client as any, report(type), NOW);
    assertEquals(html.includes(must), true, `${type} sem "${must}"`);
    assertEquals(html.includes(mustNot), false, `${type} vazou "${mustNot}"`);
  }
});

Deno.test("total não é truncado quando passa do limite de exibição", async () => {
  const rows = Array.from({ length: 150 }, (_, i) => ({
    order_number: `PED-${i}`,
    client_name: "ACME",
    status: "paid",
    total: 10,
    created_at: "2026-11-20T10:00:00.000Z",
  }));
  const { client } = fakeSupabase({ orders: { data: rows }, sicoob_orders: { data: [] } });

  const html = await generateScheduledReportHtml(client as any, report("orders"), NOW);

  assertEquals(html.includes("Pedidos no período:</strong> 150"), true);
  assertEquals(html.includes("1.500,00"), true);
  assertEquals(html.includes("Exibindo os 100 mais recentes de 150"), true);
});

Deno.test("agendamento de usuário sem papel é barrado antes de gerar dados", async () => {
  const { client, calls } = fakeSupabase({
    user_roles: { data: [] },
    orders: { data: [{ order_number: "PED-1", status: "paid", total: 10, created_at: "2026-11-20T10:00:00.000Z" }] },
  });

  await assertRejects(
    () => generateScheduledReportHtml(client as any, report("orders"), NOW),
    Error,
    "scheduled_report_owner_without_access",
  );
  assertEquals(calls.some((c) => c.table === "orders"), false, "gerou dados para quem perdeu acesso");
});

Deno.test("pedidos usam o número oficial de sicoob_orders", async () => {
  const { client } = fakeSupabase({
    orders: { data: [] },
    sicoob_orders: {
      data: [{
        id: "9f1c2b3a-0000-0000-0000-000000000000",
        order_number: "SIC-2026-0042",
        status: "paid",
        total_amount: 80,
        created_at: "2026-11-20T10:00:00.000Z",
        source_quote_snapshot: { client_name: "ACME" },
      }],
    },
  });

  const html = await generateScheduledReportHtml(client as any, report("orders"), NOW);

  assertEquals(html.includes("SIC-2026-0042"), true);
  assertEquals(html.includes("SICOOB-9f1c2b3a"), false);
});

Deno.test("mensal mantém o dia-âncora depois de passar por fevereiro", () => {
  // Agendamento do dia 31: 28/02 é só o representante de fevereiro.
  const feb28 = new Date("2026-02-28T08:00:00.000Z");
  assertEquals(
    calculateNextRun("monthly", feb28, 31).toISOString(),
    "2026-03-31T08:00:00.000Z",
  );

  const feb28Leap = new Date("2028-02-29T08:00:00.000Z");
  assertEquals(
    calculateNextRun("monthly", feb28Leap, 31).toISOString(),
    "2028-03-31T08:00:00.000Z",
  );

  // Sem âncora o comportamento antigo é preservado para os chamadores legados.
  assertEquals(calculateNextRun("monthly", feb28).toISOString(), "2026-03-28T08:00:00.000Z");
  assertEquals(getAnchorDay("2026-01-31T08:00:00.000Z"), 31);
  assertEquals(getAnchorDay(null, "2026-01-15T08:00:00.000Z"), 15);
  assertEquals(getAnchorDay("lixo"), null);
});
