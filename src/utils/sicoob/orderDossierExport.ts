import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ORDER_STATUS_CONFIG, type SicoobOrder, type SicoobOrderItem } from "@/types/sicoob/orders";
import type { OrderHistory } from "@/hooks/useSicoobOrderHistory";

interface ExportDossierOptions {
  orderData: SicoobOrder;
  orderItems: SicoobOrderItem[];
  orderHistory: OrderHistory[];
  orderTotal: number;
}

type AutoTableDocument = jsPDF & { lastAutoTable: { finalY: number } };

const lastTableY = (doc: jsPDF) => (doc as AutoTableDocument).lastAutoTable.finalY;
const currency = (value?: number | null) => Number(value || 0).toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function commercialBreakdown(order: SicoobOrder): string[][] {
  if (order.pricing_formula_version !== "brl-v1") return [];
  return [
    ["Produtos", currency(order.merchandise_amount)],
    ["Personalizações", currency(order.personalization_amount)],
    ["Ajuste comercial", currency(order.negotiation_markup_amount)],
    ["Desconto", `- ${currency(order.discount_amount)}`],
    ["Frete", currency(order.shipping_amount)],
  ];
}

export const exportOrderDossier = ({
  orderData,
  orderItems,
  orderHistory,
  orderTotal,
}: ExportDossierOptions) => {
  const doc = new jsPDF();
  const primaryColor = "#A2D45E";
  const darkColor = "#003641";

  // Header
  doc.setFillColor(darkColor);
  doc.rect(0, 0, 210, 40, "F");
  doc.setTextColor("#FFFFFF");
  doc.setFontSize(22);
  doc.text("DOSSIÊ DE CONFORMIDADE BPMN", 105, 20, { align: "center" });
  doc.setFontSize(10);
  doc.text(`CERTIFICADO DIGITAL SICOOB • ID: ${orderData.id}`, 105, 30, { align: "center" });

  // Order info
  doc.setTextColor(darkColor);
  doc.setFontSize(14);
  doc.text(`PEDIDO #${orderData.order_number}`, 14, 55);
  doc.setFontSize(10);
  doc.text(`Posto de Atendimento: ${orderData.pa?.nome || orderData.pa_id}`, 14, 62);
  doc.text(`Data de Emissão: ${new Date(orderData.created_at).toLocaleString("pt-BR")}`, 14, 67);
  doc.text(`Status Atual: ${ORDER_STATUS_CONFIG[orderData.status as keyof typeof ORDER_STATUS_CONFIG]?.label || orderData.status}`, 14, 72);

  // Items Table
  const tableData =
    orderItems?.map((item) => [
      item.product_name,
      item.quantity.toString(),
      currency(item.unit_price),
      currency(item.line_total_amount ?? (item.quantity * item.unit_price)),
    ]) || [];

  autoTable(doc, {
    startY: 85,
    head: [["Produto", "Qtd", "Vlr Unit", "Subtotal"]],
    body: tableData,
    headStyles: { fillColor: darkColor },
    foot: [["", "", "TOTAL", `R$ ${orderTotal.toLocaleString("pt-BR")}`]],
    footStyles: { fillColor: primaryColor, textColor: darkColor, fontStyle: "bold" },
  });

  const breakdown = commercialBreakdown(orderData);
  if (breakdown.length > 0) {
    const breakdownY = lastTableY(doc) + 7;
    autoTable(doc, {
      startY: breakdownY,
      theme: "plain",
      body: breakdown,
      columnStyles: { 1: { halign: "right" } },
    });
  }

  // Audit Trail
  const currentY = lastTableY(doc) + 20;
  doc.setFontSize(14);
  doc.text("TRILHA DE AUDITORIA (LOGS)", 14, currentY);

  const logsData =
    orderHistory?.map((log) => [
      new Date(log.created_at).toLocaleString("pt-BR"),
      log.comment || "Alteração de status",
      log.previous_status || "---",
      log.new_status || "---",
    ]) || [];

  autoTable(doc, {
    startY: currentY + 5,
    head: [["Data/Hora", "Ação", "De", "Para"]],
    body: logsData,
    headStyles: { fillColor: darkColor },
  });

  // Seal
  const finalY = lastTableY(doc) + 30;
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(1);
  doc.rect(14, finalY, 182, 30);
  doc.setFontSize(12);
  doc.setTextColor(darkColor);
  doc.text("VERIFICADO POR PROMO GIFTS INTELLIGENCE", 105, finalY + 12, { align: "center" });
  doc.setFontSize(8);
  doc.text(
    "Este documento possui validade jurídica interna e comprova a integridade do fluxo de aprovações.",
    105,
    finalY + 20,
    { align: "center" }
  );
  doc.text("Meta 10/10 Excellence Compliance System", 105, finalY + 25, { align: "center" });

  doc.save(`Dossie-Sicoob-${orderData.order_number}.pdf`);
};
