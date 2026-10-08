import { supabase } from "@/integrations/supabase/client";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { getAutoTableFinalY } from "@/lib/pdf/auto-table";

const CURRENCY_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function textOrNA(value: string | null): string {
  return value || "N/A";
}

function money(value: number | null): string {
  return CURRENCY_FORMATTER.format(value ?? 0);
}

function quoteDate(value: string | null): string {
  return value ? format(new Date(value), "dd/MM/yyyy HH:mm") : "N/A";
}

function itemTotal(item: { quantity: number; unit_price: number | null; subtotal: number | null }): number {
  return item.subtotal ?? item.quantity * (item.unit_price ?? 0);
}

/**
 * Generate a PDF for an approved quote/order.
 */
export async function generateQuotePDF(quoteId: string) {
  try {
    const [quoteResult, itemsResult] = await Promise.all([
      supabase
        // rls-allow: documento por id; RLS valida ownership e organização
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single(),
      supabase
        // rls-allow: itens pertencem ao orçamento cuja visibilidade é protegida por RLS
        .from("quote_items")
        .select("quantity, unit_price, subtotal, product_name, product_sku")
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true }),
    ]);

    const quote = quoteResult.data;
    if (quoteResult.error || !quote) throw new Error("Erro ao buscar dados do orçamento");
    if (itemsResult.error) throw itemsResult.error;
    const items = itemsResult.data || [];

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 50, 100);
    doc.text("ORDEM DE COMPRA", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Orçamento #${quote.quote_number}`, 14, 28);
    doc.text(`Data: ${quoteDate(quote.created_at)}`, 14, 33);
    doc.text(`Status: APROVADO`, 14, 38);

    // Client Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("INFORMAÇÕES DO CLIENTE (PAC)", 14, 50);
    doc.setFontSize(10);
    doc.text(`Nome: ${textOrNA(quote.client_name)}`, 14, 57);
    doc.text(`Empresa: ${textOrNA(quote.client_company)}`, 14, 62);
    doc.text(`E-mail: ${textOrNA(quote.client_email)}`, 14, 67);

    // Items Table
    const tableData = items.map((item) => [
      item.product_sku || "-",
      item.product_name || "Produto não identificado",
      item.quantity,
      money(item.unit_price),
      money(itemTotal(item)),
    ]);

    autoTable(doc, {
      startY: 75,
      head: [["SKU", "Produto", "Qtd", "Unitário", "Total"]],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 50, 100] }
    });

    const finalY = getAutoTableFinalY(doc, 80);

    // Totals
    doc.setFontSize(11);
    const subtotalText = `Subtotal: ${money(quote.subtotal)}`;
    const discountText = `Desconto: ${money(quote.discount_amount)}`;
    const totalText = `TOTAL GERAL: ${money(quote.total)}`;
    
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
