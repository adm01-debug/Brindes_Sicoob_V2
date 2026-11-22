// deno-lint-ignore-file no-import-prefix
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateScheduledReportHtml } from "../_shared/scheduled-report-data.ts";
import {
  calculateNextRun,
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
          const response = responses[table] ?? { data: [] };
          return Promise.resolve(response).then(resolve, reject);
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

  assertEquals(calls[0].filters.some(([column, value]) =>
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
