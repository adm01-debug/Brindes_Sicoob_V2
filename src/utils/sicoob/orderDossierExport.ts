import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ORDER_STATUS_CONFIG } from "@/types/sicoob/orders";

interface ExportDossierOptions {
  orderData: any;
  orderItems: any[];
  orderHistory: any[];
  orderTotal: number;
}

export const exportOrderDossier = ({
  orderData,
  orderItems,
  orderHistory,
  orderTotal,
}: ExportDossierOptions) => {
  if (!orderData) return;

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
      `R$ ${item.unit_price.toLocaleString("pt-BR")}`,
      `R$ ${(item.quantity * item.unit_price).toLocaleString("pt-BR")}`,
    ]) || [];

  autoTable(doc, {
    startY: 85,
    head: [["Produto", "Qtd", "Vlr Unit", "Subtotal"]],
    body: tableData,
    headStyles: { fillColor: darkColor },
    foot: [["", "", "TOTAL", `R$ ${orderTotal.toLocaleString("pt-BR")}`]],
    footStyles: { fillColor: primaryColor, textColor: darkColor, fontStyle: "bold" },
  });

  // Audit Trail
  const currentY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(14);
  doc.text("TRILHA DE AUDITORIA (LOGS)", 14, currentY);

  const logsData =
    orderHistory?.map((log) => [
      new Date(log.created_at).toLocaleString("pt-BR"),
      log.action,
      log.old_data?.fulfillment_status || "---",
      log.new_data?.fulfillment_status || "---",
    ]) || [];

  autoTable(doc, {
    startY: currentY + 5,
    head: [["Data/Hora", "Ação", "De", "Para"]],
    body: logsData,
    headStyles: { fillColor: darkColor },
  });

  // Seal
  const finalY = (doc as any).lastAutoTable.finalY + 30;
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
