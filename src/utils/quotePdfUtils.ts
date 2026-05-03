import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Generate a PDF for an approved quote/order.
 */
export async function generateQuotePDF(quoteId: string) {
  try {
    const { data: quote, error } = await supabase
      .from("quotes")
      .select(`
        *,
        client:profiles!quotes_client_id_fkey(full_name, email),
        items:quote_items(
          quantity,
          unit_price,
          total_price,
          product:products(name, sku)
        )
      `)
      .eq("id", quoteId)
      .single();

    if (error || !quote) throw new Error("Erro ao buscar dados do orçamento");

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 50, 100);
    doc.text("ORDEM DE COMPRA", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Orçamento #${quote.quote_number}`, 14, 28);
    doc.text(`Data: ${format(new Date(quote.created_at), "dd/MM/yyyy HH:mm")}`, 14, 33);
    doc.text(`Status: APROVADO`, 14, 38);

    // Client Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("INFORMAÇÕES DO CLIENTE (PAC)", 14, 50);
    doc.setFontSize(10);
    doc.text(`Nome: ${quote.client_name || quote.client?.full_name || "N/A"}`, 14, 57);
    doc.text(`Empresa: ${quote.client_company || "N/A"}`, 14, 62);
    doc.text(`E-mail: ${quote.client_email || quote.client?.email || "N/A"}`, 14, 67);

    // Items Table
    const tableData = quote.items.map((item: any) => [
      item.product?.sku || "-",
      item.product?.name || "Produto não identificado",
      item.quantity,
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.unit_price),
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.total_price)
    ]);

    (doc as any).autoTable({
      startY: 75,
      head: [["SKU", "Produto", "Qtd", "Unitário", "Total"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 50, 100] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 80;

    // Totals
    doc.setFontSize(11);
    const subtotalText = `Subtotal: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(quote.subtotal)}`;
    const discountText = `Desconto: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(quote.discount_amount || 0)}`;
    const totalText = `TOTAL GERAL: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(quote.total)}`;
    
    doc.text(subtotalText, pageWidth - 15, finalY + 10, { align: "right" });
    doc.text(discountText, pageWidth - 15, finalY + 17, { align: "right" });
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(totalText, pageWidth - 15, finalY + 27, { align: "right" });

    // Footer / Terms
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    const footerText = "Este documento é um registro oficial gerado após aprovação interna.";
    doc.text(footerText, pageWidth / 2, 285, { align: "center" });

    return doc.output("blob");
  } catch (err) {
    console.error("PDF Generation error:", err);
    throw err;
  }
}
