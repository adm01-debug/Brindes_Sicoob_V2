import { getPeriodLabel, getPeriodStart } from "../send-scheduled-reports/report-types.ts";

type SupabaseLike = {
  from: (table: string) => any;
};

export interface ScheduledReportRow {
  id: string;
  user_id: string;
  report_type: string;
  frequency: string;
  report_name: string;
  email_to: string;
  filters?: Record<string, unknown> | null;
}

const ROW_LIMIT = 100;

function escapeHtml(value: unknown): string {
  return String(value ?? "—").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function money(value: unknown): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(Number(value ?? 0));
}

function table(headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
    .join("");
  return `<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%">`
    + `<tr>${head}</tr>${body}</table>`;
}

/**
 * Gera o HTML de um agendamento. Sempre filtra por `seller_id` do dono do
 * agendamento: a função roda com service_role, então a RLS não protege aqui e
 * sem o filtro o gestor receberia dados de outros vendedores.
 */
export async function generateScheduledReportHtml(
  supabase: SupabaseLike,
  report: ScheduledReportRow,
  reference: Date = new Date(),
): Promise<string> {
  if (typeof report.user_id !== "string" || report.user_id.trim() === "") {
    throw new Error("scheduled_report_owner_missing");
  }

  const since = getPeriodStart(report.frequency, reference);
  const sellerId = report.user_id;
  const header = `<h2>${escapeHtml(report.report_name)}</h2>`
    + `<p>Período ${escapeHtml(getPeriodLabel(report.frequency))} desde `
    + `${escapeHtml(new Date(since).toLocaleDateString("pt-BR"))} — gerado em `
    + `${escapeHtml(reference.toLocaleDateString("pt-BR"))}</p>`;

  if (report.report_type === "products") {
    return header + await productsSection(supabase, sellerId, since);
  }
  if (report.report_type === "clients") {
    return header + await clientsSection(supabase, sellerId, since);
  }
  if (report.report_type === "orders") {
    return header + await ordersSection(supabase, sellerId, since);
  }
  return header + await quotesSection(supabase, sellerId, since);
}

async function quotesSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("quotes")
    .select("quote_number, client_name, client_company, status, total, created_at")
    .eq("seller_id", sellerId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (error) throw error;

  const rows = data ?? [];
  const approved = rows.filter((q: any) => q.status === "approved");
  const total = rows.reduce((sum: number, q: any) => sum + Number(q.total ?? 0), 0);
  const bodies = rows.map((q: any) => [
    escapeHtml(q.quote_number),
    escapeHtml(q.client_company || q.client_name),
    escapeHtml(q.status),
    escapeHtml(money(q.total)),
    escapeHtml(new Date(q.created_at).toLocaleDateString("pt-BR")),
  ]);

  return `<p><strong>Orçamentos no período:</strong> ${rows.length}</p>`
    + `<p><strong>Aprovados:</strong> ${approved.length}</p>`
    + `<p><strong>Valor total:</strong> ${escapeHtml(money(total))}</p>`
    + table(["Nº", "Cliente", "Status", "Total", "Data"], bodies);
}

async function ordersSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("orders")
    .select("order_number, client_name, status, total, created_at")
    .eq("seller_id", sellerId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (error) throw error;

  const rows = data ?? [];
  const total = rows.reduce((sum: number, o: any) => sum + Number(o.total ?? 0), 0);
  const bodies = rows.map((o: any) => [
    escapeHtml(o.order_number),
    escapeHtml(o.client_name),
    escapeHtml(o.status),
    escapeHtml(money(o.total)),
    escapeHtml(new Date(o.created_at).toLocaleDateString("pt-BR")),
  ]);

  return `<p><strong>Pedidos no período:</strong> ${rows.length}</p>`
    + `<p><strong>Valor total:</strong> ${escapeHtml(money(total))}</p>`
    + table(["Nº", "Cliente", "Status", "Total", "Data"], bodies);
}

/**
 * Não existe tabela `clients`: o cliente é o par nome/empresa gravado no
 * orçamento e no pedido. O relatório consolida as duas origens por nome.
 */
async function clientsSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
): Promise<string> {
  const [quotesRes, ordersRes] = await Promise.all([
    supabase.from("quotes").select("client_name, client_company, total")
      .eq("seller_id", sellerId).gte("created_at", since).limit(500),
    supabase.from("orders").select("client_name, total")
      .eq("seller_id", sellerId).gte("created_at", since).limit(500),
  ]);
  if (quotesRes.error) throw quotesRes.error;
  if (ordersRes.error) throw ordersRes.error;

  const consolidated = new Map<string, { quotes: number; orders: number; total: number }>();
  const touch = (name: unknown) => {
    const key = String(name ?? "").trim();
    if (!key) return null;
    if (!consolidated.has(key)) consolidated.set(key, { quotes: 0, orders: 0, total: 0 });
    return consolidated.get(key)!;
  };

  for (const q of quotesRes.data ?? []) {
    const entry = touch(q.client_company || q.client_name);
    if (entry) {
      entry.quotes += 1;
      entry.total += Number(q.total ?? 0);
    }
  }
  for (const o of ordersRes.data ?? []) {
    const entry = touch(o.client_name);
    if (entry) {
      entry.orders += 1;
      entry.total += Number(o.total ?? 0);
    }
  }

  const bodies = [...consolidated.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, ROW_LIMIT)
    .map(([name, entry]) => [
      escapeHtml(name),
      String(entry.quotes),
      String(entry.orders),
      escapeHtml(money(entry.total)),
    ]);

  return `<p><strong>Clientes no período:</strong> ${consolidated.size}</p>`
    + table(["Cliente", "Orçamentos", "Pedidos", "Valor"], bodies);
}

/** Consolida os itens dos orçamentos do dono por produto. */
async function productsSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
): Promise<string> {
  const { data: quotes, error: quotesError } = await supabase
    .from("quotes")
    .select("id")
    .eq("seller_id", sellerId)
    .gte("created_at", since)
    .limit(500);
  if (quotesError) throw quotesError;

  const ids = (quotes ?? []).map((q: any) => q.id);
  if (ids.length === 0) {
    return "<p><strong>Produtos no período:</strong> 0</p>"
      + table(["Produto", "SKU", "Quantidade", "Valor"], []);
  }

  const { data: items, error: itemsError } = await supabase
    .from("quote_items")
    .select("product_name, product_sku, quantity, subtotal")
    .in("quote_id", ids)
    .limit(2000);
  if (itemsError) throw itemsError;

  const consolidated = new Map<string, { sku: string; quantity: number; total: number }>();
  for (const item of items ?? []) {
    const key = String(item.product_name ?? item.product_sku ?? "").trim();
    if (!key) continue;
    const entry = consolidated.get(key) ?? {
      sku: String(item.product_sku ?? "—"),
      quantity: 0,
      total: 0,
    };
    entry.quantity += Number(item.quantity ?? 0);
    entry.total += Number(item.subtotal ?? 0);
    consolidated.set(key, entry);
  }

  const bodies = [...consolidated.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, ROW_LIMIT)
    .map(([name, entry]) => [
      escapeHtml(name),
      escapeHtml(entry.sku),
      String(entry.quantity),
      escapeHtml(money(entry.total)),
    ]);

  return `<p><strong>Produtos no período:</strong> ${consolidated.size}</p>`
    + table(["Produto", "SKU", "Quantidade", "Valor"], bodies);
}
