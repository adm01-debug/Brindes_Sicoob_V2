/**
 * Gerador puro do Dossiê BI em PDF.
 * Recebe dados já resolvidos e produz um Blob PDF de 4 páginas máx.
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/format";
import type { ClientBI } from "@/hooks/bi/useClientBI";
import type { ClientVsIndustryResult, MetricComparison } from "@/hooks/bi/useClientVsIndustry";
import type { ClientAffinityResult } from "@/hooks/bi/useClientAffinity";
import type { IndustryTrendsResult } from "@/hooks/bi/useIndustryTrends";
import type { SeasonalityResult } from "@/hooks/bi/useClientSeasonality";
import type { IndustryRecommendation } from "@/lib/bi/industryRecommendations";
import type { CategorySection } from "@/lib/bi/executive-summary";
import { getAutoTableFinalY } from "@/lib/pdf/auto-table";

export interface DossierClient {
  name: string;
  cnpj?: string | null;
  ramo?: string | null;
  cidade?: string | null;
  estado?: string | null;
}

export interface DossierData {
  client: DossierClient;
  sellerName: string;
  clientBI: ClientBI;
  vsIndustry: ClientVsIndustryResult;
  affinity: ClientAffinityResult;
  industryTrends: IndustryTrendsResult;
  seasonality?: SeasonalityResult;
  empiricalRec: IndustryRecommendation;
  categorySection?: CategorySection;
}

const PRIMARY: [number, number, number] = [124, 58, 237]; // violet-600
const MUTED: [number, number, number] = [120, 120, 130];
const TEXT: [number, number, number] = [25, 25, 35];

function formatDateBR(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function classificationLabel(c: MetricComparison["classification"]): string {
  switch (c) {
    case "above": return "Acima da média";
    case "below": return "Abaixo da média";
    case "on_par": return "Na média";
    default: return "Sem dados";
  }
}

function metricValue(m: MetricComparison, which: "client" | "industry"): string {
  const v = which === "client" ? m.clientValue : m.industryAvg;
  if (m.format === "currency") return formatCurrency(v);
  return v.toFixed(v < 10 ? 1 : 0);
}

function addFooter(doc: jsPDF, generatedAt: string) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Confidencial · uso interno comercial · gerado em ${generatedAt}`,
      14,
      h - 8,
    );
    doc.text(`Página ${i} de ${pageCount}`, w - 14, h - 8, { align: "right" });
  }
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.text(title, 14, y);
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.6);
  doc.line(14, y + 1.5, 50, y + 1.5);
  return y + 8;
}

function addCategoryPage(doc: jsPDF, width: number, category: CategorySection | undefined): void {
  if (!category?.hasData) return;
  doc.addPage();
  let y = addSectionTitle(doc, "Mapa de Categorias", 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    category.isMock
      ? "Comparativo cliente × setor por categoria (dados parciais — amostra simulada)."
      : "Comparativo cliente × setor por categoria de produto (últimos 90 dias).",
    14,
    y,
  );
  y += 5;
  if (category.rows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Categoria", "Cliente %", "Setor %", "Tendência (90d)"]],
      body: category.rows.map(row => {
        const arrow = row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : row.trend === "stable" ? "→" : "—";
        const delta = row.deltaPct === null || row.deltaPct === undefined
          ? "—"
          : `${row.deltaPct > 0 ? "+" : ""}${Math.round(row.deltaPct)}%`;
        return [row.label, `${row.clientSharePct.toFixed(1)}%`, `${row.industrySharePct.toFixed(1)}%`, `${arrow} ${delta}`];
      }),
      theme: "grid",
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
      columnStyles: { 1: { halign: "right", cellWidth: 28 }, 2: { halign: "right", cellWidth: 28 }, 3: { halign: "center", cellWidth: 38, fontStyle: "bold" } },
    });
    y = getAutoTableFinalY(doc, y) + 8;
  }
  if (category.gaps.length > 0) {
    const boxHeight = 14 + category.gaps.length * 6;
    doc.setFillColor(254, 243, 226);
    doc.roundedRect(14, y, width - 28, boxHeight, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(180, 83, 9);
    doc.text("OPORTUNIDADES GAP — categorias fortes no setor que o cliente não compra", 18, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT);
    category.gaps.forEach((gap, index) => doc.text(`•  ${gap.label} — ${gap.reason}`, 18, y + 13 + index * 6));
    y += boxHeight + 6;
  }
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, y, width - 28, 22, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY);
  doc.text("INSIGHT DE CATEGORIA", 18, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(doc.splitTextToSize(category.insight, width - 36), 18, y + 12);
}

function seasonalityDescription(seasonality: SeasonalityResult): string {
  const suffix = seasonality.monthsCovered === 1 ? "" : "es";
  return seasonality.isMock
    ? `Padrão simulado (histórico real insuficiente — ${seasonality.monthsCovered} mês${suffix} cobertos).`
    : `Janela de ${seasonality.windowMonths} meses · ${seasonality.monthsCovered} mês${suffix} com dados.`;
}

function addSeasonalityPage(doc: jsPDF, width: number, seasonality: SeasonalityResult | undefined): void {
  if (!seasonality) return;
  doc.addPage();
  let y = addSectionTitle(doc, "Sazonalidade Cliente × Setor", 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(seasonalityDescription(seasonality), 14, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [["Mês", "Cliente (pedidos)", "Cliente (% ano)", "Setor (méd/empresa)", "Setor (% ano)"]],
    body: seasonality.client.map((client, index) => {
      const industry = seasonality.industry[index];
      return [
        client.monthLabel,
        client.quotesCount > 0 ? String(client.quotesCount) : "—",
        client.sharePercent > 0 ? `${client.sharePercent.toFixed(1)}%` : "—",
        industry && industry.avgQuotesPerCompany > 0 ? industry.avgQuotesPerCompany.toFixed(1) : "—",
        industry && industry.sharePercent > 0 ? `${industry.sharePercent.toFixed(1)}%` : "—",
      ];
    }),
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "center" }, 2: { halign: "right" }, 3: { halign: "center" }, 4: { halign: "right" } },
  });
  y = getAutoTableFinalY(doc, y) + 6;
  if (seasonality.topClientMonths.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text("Top 3 meses do cliente:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(seasonality.topClientMonths.map(item => `${item.monthLabel} (${item.quotesCount})`).join("  ·  "), 55, y);
    y += 5;
  }
  if (seasonality.nextPeakMonth) {
    const month = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][seasonality.nextPeakMonth - 1];
    const timing = seasonality.daysToNextPeak === 0 ? " (estamos no mês de pico)" : ` em ${seasonality.daysToNextPeak} dia(s)`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text("Próximo pico:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(`${month}${timing}`, 40, y);
    y += 6;
  }
  if (seasonality.insight) {
    doc.setFillColor(245, 243, 255);
    doc.roundedRect(14, y, width - 28, 22, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PRIMARY);
    doc.text("INSIGHT DE TIMING", 18, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    doc.text(doc.splitTextToSize(seasonality.insight, width - 36), 18, y + 12);
  }
}

function addCover(doc: jsPDF, width: number, data: DossierData, generatedAt: string): void {
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, width, 55, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text("BRINDES SICOOB", 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Inteligência Comercial · Business Analytic", 14, 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Dossiê Comercial", 14, 42);
  doc.setTextColor(...TEXT);
  doc.setFontSize(18);
  doc.text(data.client.name, 14, 75);
  const meta: string[] = [];
  if (data.client.ramo) meta.push(`Ramo: ${data.client.ramo}`);
  if (data.client.cnpj) meta.push(`CNPJ: ${data.client.cnpj}`);
  if (data.client.cidade) meta.push(`Localidade: ${data.client.cidade}${data.client.estado ? `/${data.client.estado}` : ""}`);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  let y = 84;
  for (const line of meta) {
    doc.text(line, 14, y);
    y += 5.5;
  }
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y + 6, width - 28, 26, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text("Emitido em", 18, y + 14);
  doc.text("Vendedor responsável", 18, y + 23);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.text(generatedAt, 60, y + 14);
  doc.text(data.sellerName || "—", 60, y + 23);
}

function addBenchmarkPage(doc: jsPDF, width: number, comparison: ClientVsIndustryResult): void {
  doc.addPage();
  const y = addSectionTitle(doc, "Cliente × Setor", 22);
  if (!comparison.hasEnoughSample || comparison.metrics.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Amostra do ramo ainda insuficiente para benchmark (mínimo 3 empresas).", 14, y + 5);
    return;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Benchmark contra ${comparison.sampleSize} empresa(s) do mesmo ramo · últimos ${comparison.daysWindow} dias`, 14, y);
  autoTable(doc, {
    startY: y + 5,
    head: [["Métrica", "Cliente", "Média do setor", "Δ %", "Classificação"]],
    body: comparison.metrics.map(metric => [
      metric.label,
      metricValue(metric, "client"),
      metricValue(metric, "industry"),
      `${metric.deltaPercent > 0 ? "+" : ""}${Math.round(metric.deltaPercent)}%`,
      classificationLabel(metric.classification),
    ]),
    theme: "grid",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" } },
  });
  if (!comparison.insight) return;
  const finalY = getAutoTableFinalY(doc, 0) + 8;
  doc.setFillColor(245, 243, 255);
  doc.roundedRect(14, finalY, width - 28, 18, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...PRIMARY);
  doc.text("INSIGHT", 18, finalY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(doc.splitTextToSize(comparison.insight, width - 36), 18, finalY + 12);
}

export function generateBIDossierPDF(data: DossierData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const generatedAt = new Date().toLocaleString("pt-BR");

  addCover(doc, W, data, generatedAt);

  // ============ PÁGINA 2 — Visão 360° ============
  doc.addPage();
  let y = 22;
  y = addSectionTitle(doc, "Visão 360° do Cliente", y);

  const bi = data.clientBI;
  const kpiBoxes: Array<[string, string]> = [
    ["LTV Total", formatCurrency(bi.ltv)],
    ["Ticket médio", formatCurrency(bi.avgTicket)],
    ["Pedidos", String(bi.ordersCount)],
    ["Última compra", formatDateBR(bi.lastOrderDate)],
  ];
  const boxW = (W - 28 - 9) / 4;
  kpiBoxes.forEach(([label, value], i) => {
    const x = 14 + i * (boxW + 3);
    doc.setFillColor(248, 248, 252);
    doc.roundedRect(x, y, boxW, 22, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 3, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...TEXT);
    doc.text(value, x + 3, y + 15);
  });
  y += 30;

  if (bi.recentOrders.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text("Pedidos recentes", 14, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      head: [["Nº", "Data", "Itens", "Total", "Resumo"]],
      body: bi.recentOrders.slice(0, 5).map((o) => [
        o.id,
        formatDateBR(o.date),
        String(o.itemsCount),
        formatCurrency(o.total),
        o.productPreview,
      ]),
      theme: "striped",
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 28, halign: "right" },
      },
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Sem histórico de pedidos registrado.", 14, y + 5);
  }

  addBenchmarkPage(doc, W, data.vsIndustry);

  // ============ PÁGINA 4 — Recomendações ============
  doc.addPage();
  y = 22;
  y = addSectionTitle(doc, "Recomendações Comerciais", y);

  // Top afinidade
  const topAffinity = data.affinity.topProducts.slice(0, 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(
    `Afinidade do cliente${data.affinity.isMock ? " (simulado)" : " (histórico real)"}`,
    14,
    y,
  );
  y += 3;

  if (topAffinity.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Produto", "Categoria proxy", "Vezes", "Receita"]],
      body: topAffinity.map((p) => [
        p.product_name,
        "—",
        String(p.occurrences),
        formatCurrency(Number(p.total_revenue) || 0),
      ]),
      theme: "striped",
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        2: { halign: "center", cellWidth: 16 },
        3: { halign: "right", cellWidth: 28 },
      },
    });
    y = getAutoTableFinalY(doc, y) + 6;
  } else if (data.affinity.categories.length > 0) {
    const rows = data.affinity.categories.flatMap((c) =>
      c.suggestions.slice(0, 2).map((s) => [s.name, c.category, s.reason]),
    ).slice(0, 5);
    autoTable(doc, {
      startY: y,
      head: [["Sugestão", "Categoria", "Motivo"]],
      body: rows,
      theme: "striped",
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
    y = getAutoTableFinalY(doc, y) + 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Sem dados de afinidade.", 14, y + 5);
    y += 10;
  }

  // Tendências do setor
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(
    `Tendência do setor${data.industryTrends.isMock ? " (simulado)" : " (90 dias)"}`,
    14,
    y,
  );
  y += 3;

  const trendRows = data.industryTrends.trends.slice(0, 5).map((t) => [
    t.productName,
    t.category,
    String(t.unitsSold),
    formatCurrency(t.avgPrice),
  ]);
  if (trendRows.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Produto", "Categoria", "Unidades", "Preço médio"]],
      body: trendRows,
      theme: "striped",
      headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
      columnStyles: {
        2: { halign: "center", cellWidth: 22 },
        3: { halign: "right", cellWidth: 30 },
      },
    });
    y = getAutoTableFinalY(doc, y) + 6;
  }

  // Sugestão do especialista
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(`Sugestão do especialista — ${data.empiricalRec.ramo}`, 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [["Produto", "Categoria", "Faixa", "Por quê"]],
    body: data.empiricalRec.suggestedProducts.slice(0, 5).map((p) => [
      p.name,
      p.category,
      `${formatCurrency(p.priceFrom)} – ${formatCurrency(p.priceTo)}`,
      p.reason,
    ]),
    theme: "striped",
    headStyles: { fillColor: PRIMARY, textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
    columnStyles: {
      2: { cellWidth: 36 },
    },
  });

  addCategoryPage(doc, W, data.categorySection);
  addSeasonalityPage(doc, W, data.seasonality);

  addFooter(doc, generatedAt);

  return doc.output("blob");
}

export function buildDossierFileName(clientName: string): string {
  const slug = clientName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  return `dossie-bi-${slug || "cliente"}-${date}.pdf`;
}
