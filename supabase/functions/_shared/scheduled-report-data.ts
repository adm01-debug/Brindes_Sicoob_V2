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
/**
 * Teto de linhas consultadas por tabela. Os totais do cabeçalho precisam cobrir
 * o período inteiro: com um limite baixo eles somavam só a amostra mais recente
 * e o gestor recebia um total menor que o real sem nenhum aviso.
 */
const SCAN_LIMIT = 5000;

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
  previousRun: Date | null = null,
): Promise<string> {
  if (typeof report.user_id !== "string" || report.user_id.trim() === "") {
    throw new Error("scheduled_report_owner_missing");
  }

  const since = getPeriodStart(report.frequency, reference, previousRun);
  const until = reference.toISOString();
  const sellerId = report.user_id;
  const header = `<h2>${escapeHtml(report.report_name)}</h2>`
    + `<p>Período ${escapeHtml(getPeriodLabel(report.frequency))} desde `
    + `${escapeHtml(new Date(since).toLocaleDateString("pt-BR"))} — gerado em `
    + `${escapeHtml(reference.toLocaleDateString("pt-BR"))}</p>`;

  if (report.report_type === "products") {
    return header + await productsSection(supabase, sellerId, since, until);
  }
  if (report.report_type === "clients") {
    return header + await clientsSection(supabase, sellerId, since, until);
  }
  if (report.report_type === "orders") {
    return header + await ordersSection(supabase, sellerId, since, until);
  }
  if (report.report_type === "sales") {
    return header + await salesSection(supabase, sellerId, since, until);
  }
  return header + await quotesSection(supabase, sellerId, since, until);
}

/** Status que o resto do sistema já trata como aprovado (QuotesListPage). */
const APPROVED_QUOTE_STATUSES = ["approved", "approved_singular"];

async function quotesSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
  until: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("quotes")
    .select("quote_number, client_name, client_company, status, total, created_at")
    .eq("seller_id", sellerId)
    .gte("created_at", since)
    .lt("created_at", until)
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);
  if (error) throw error;

  const rows = data ?? [];
  const approved = rows.filter((q: any) => APPROVED_QUOTE_STATUSES.includes(q.status));
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
    + table(["Nº", "Cliente", "Status", "Total", "Data"], bodies.slice(0, ROW_LIMIT))
    + (bodies.length > ROW_LIMIT
      ? `<p>Exibindo os ${ROW_LIMIT} mais recentes de ${bodies.length}.</p>`
      : "");
}

async function ordersSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
  until: string,
): Promise<string> {
  const [legacyRes, sicoobRes] = await Promise.all([
    supabase.from("orders").select("order_number, client_name, status, total, created_at")
      .eq("seller_id", sellerId).gte("created_at", since).lt("created_at", until)
      .order("created_at", { ascending: false }).limit(SCAN_LIMIT),
    supabase.from("sicoob_orders")
      .select("id, status, total_amount, created_at, source_quote_snapshot")
      .eq("created_by", sellerId).gte("created_at", since).lt("created_at", until)
      .order("created_at", { ascending: false }).limit(SCAN_LIMIT),
  ]);
  if (legacyRes.error) throw legacyRes.error;
  if (sicoobRes.error) throw sicoobRes.error;

  // Os dois fluxos coexistem: `orders` guarda os pedidos genéricos e
  // `sicoob_orders` os convertidos de orçamento. Contar só um deles omitia
  // vendas que o gestor via na tela.
  const rows = [
    ...(legacyRes.data ?? []).map((o: any) => ({
      number: o.order_number,
      client: o.client_name,
      status: o.status,
      total: Number(o.total ?? 0),
      createdAt: o.created_at,
    })),
    ...(sicoobRes.data ?? []).map((o: any) => ({
      number: `SICOOB-${String(o.id).slice(0, 8)}`,
      client: o.source_quote_snapshot?.client_company
        || o.source_quote_snapshot?.client_name,
      status: o.status,
      total: Number(o.total_amount ?? 0),
      createdAt: o.created_at,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = rows.reduce((sum, o) => sum + o.total, 0);
  const bodies = rows.map((o) => [
    escapeHtml(o.number),
    escapeHtml(o.client),
    escapeHtml(o.status),
    escapeHtml(money(o.total)),
    escapeHtml(new Date(o.createdAt).toLocaleDateString("pt-BR")),
  ]);

  return `<p><strong>Pedidos no período:</strong> ${rows.length}</p>`
    + `<p><strong>Valor total:</strong> ${escapeHtml(money(total))}</p>`
    + table(["Nº", "Cliente", "Status", "Total", "Data"], bodies.slice(0, ROW_LIMIT))
    + (bodies.length > ROW_LIMIT
      ? `<p>Exibindo os ${ROW_LIMIT} mais recentes de ${bodies.length}.</p>`
      : "");
}

/**
 * Não existe tabela `clients`: o cliente é o par nome/empresa gravado no
 * orçamento e no pedido. O relatório consolida as duas origens pela mesma
 * chave — empresa quando houver, senão o contato —, senão o mesmo cliente
 * entrava duas vezes (uma como "Alfa", outra como "Ana").
 */
async function clientsSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
  until: string,
): Promise<string> {
  const [quotesRes, ordersRes, sicoobRes] = await Promise.all([
    supabase.from("quotes").select("client_name, client_company, total")
      .eq("seller_id", sellerId).gte("created_at", since).lt("created_at", until)
      .limit(SCAN_LIMIT),
    supabase.from("orders").select("client_name, client_company, total")
      .eq("seller_id", sellerId).gte("created_at", since).lt("created_at", until)
      .limit(SCAN_LIMIT),
    supabase.from("sicoob_orders").select("total_amount, source_quote_snapshot")
      .eq("created_by", sellerId).gte("created_at", since).lt("created_at", until)
      .limit(SCAN_LIMIT),
  ]);
  if (quotesRes.error) throw quotesRes.error;
  if (ordersRes.error) throw ordersRes.error;
  if (sicoobRes.error) throw sicoobRes.error;

  const consolidated = new Map<string, { quotes: number; orders: number; total: number }>();
  const touch = (company: unknown, contact: unknown) => {
    const key = String(company ?? "").trim() || String(contact ?? "").trim();
    if (!key) return null;
    if (!consolidated.has(key)) consolidated.set(key, { quotes: 0, orders: 0, total: 0 });
    return consolidated.get(key)!;
  };

  for (const q of quotesRes.data ?? []) {
    const entry = touch(q.client_company, q.client_name);
    if (entry) {
      entry.quotes += 1;
      entry.total += Number(q.total ?? 0);
    }
  }
  for (const o of ordersRes.data ?? []) {
    const entry = touch(o.client_company, o.client_name);
    if (entry) {
      entry.orders += 1;
      entry.total += Number(o.total ?? 0);
    }
  }
  for (const o of sicoobRes.data ?? []) {
    const entry = touch(
      o.source_quote_snapshot?.client_company,
      o.source_quote_snapshot?.client_name,
    );
    if (entry) {
      entry.orders += 1;
      entry.total += Number(o.total_amount ?? 0);
    }
  }

  const ordered = [...consolidated.entries()].sort((a, b) => b[1].total - a[1].total);
  const bodies = ordered
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
  until: string,
): Promise<string> {
  const { data: quotes, error: quotesError } = await supabase
    .from("quotes")
    .select("id")
    .eq("seller_id", sellerId)
    .gte("created_at", since)
    .lt("created_at", until)
    .limit(SCAN_LIMIT);
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

  // Nome e SKU entram na chave: o mesmo produto pode ter variantes com o mesmo
  // nome e SKUs diferentes, e agrupar só pelo nome somava as variantes numa
  // linha exibindo o primeiro SKU.
  const consolidated = new Map<string, { name: string; sku: string; quantity: number; total: number }>();
  for (const item of items ?? []) {
    const name = String(item.product_name ?? "").trim();
    const sku = String(item.product_sku ?? "").trim();
    const key = `${name}\u0000${sku}`;
    if (!name && !sku) continue;
    const entry = consolidated.get(key) ?? {
      name: name || "—",
      sku: sku || "—",
      quantity: 0,
      total: 0,
    };
    entry.quantity += Number(item.quantity ?? 0);
    entry.total += Number(item.subtotal ?? 0);
    consolidated.set(key, entry);
  }

  const bodies = [...consolidated.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, ROW_LIMIT)
    .map((entry) => [
      escapeHtml(entry.name),
      escapeHtml(entry.sku),
      String(entry.quantity),
      escapeHtml(money(entry.total)),
    ]);

  return `<p><strong>Produtos no período:</strong> ${consolidated.size}</p>`
    + table(["Produto", "SKU", "Quantidade", "Valor"], bodies);
}

/**
 * "Vendas" não é "Orçamentos": o gestor espera o que virou pedido. Somar todas
 * as propostas do período — inclusive rejeitadas — devolvia o relatório errado
 * para quem agendava Vendas.
 */
async function salesSection(
  supabase: SupabaseLike,
  sellerId: string,
  since: string,
  until: string,
): Promise<string> {
  const ordersHtml = await ordersSection(supabase, sellerId, since, until);

  const { data, error } = await supabase
    .from("quotes")
    .select("quote_number, client_name, client_company, total, created_at")
    .eq("seller_id", sellerId)
    .gte("created_at", since)
    .lt("created_at", until)
    .in("status", APPROVED_QUOTE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(SCAN_LIMIT);
  if (error) throw error;

  const rows = data ?? [];
  const approvedTotal = rows.reduce((sum: number, q: any) => sum + Number(q.total ?? 0), 0);
  const bodies = rows.map((q: any) => [
    escapeHtml(q.quote_number),
    escapeHtml(q.client_company || q.client_name),
    escapeHtml(money(q.total)),
    escapeHtml(new Date(q.created_at).toLocaleDateString("pt-BR")),
  ]);

  return "<h3>Pedidos faturados no período</h3>"
    + ordersHtml
    + "<h3>Propostas aprovadas no período</h3>"
    + `<p><strong>Aprovadas:</strong> ${rows.length} — `
    + `<strong>valor:</strong> ${escapeHtml(money(approvedTotal))}</p>`
    + table(["Nº", "Cliente", "Total", "Data"], bodies.slice(0, ROW_LIMIT))
    + (bodies.length > ROW_LIMIT
      ? `<p>Exibindo as ${ROW_LIMIT} mais recentes de ${bodies.length}.</p>`
      : "");
}
