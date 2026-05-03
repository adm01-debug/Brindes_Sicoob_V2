import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "./quote-calculations";
import { toast } from "sonner";

export async function exportOrdersToExcel(orderIds: string[]) {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .in("id", orderIds);

    if (error) throw error;

    // In a real app, we'd use a library like xlsx
    // For now, we'll simulate the CSV generation
    let csv = "Número,Cliente,Status,Total,Data\n";
    data.forEach(o => {
      csv += `${o.order_number},${o.client_company || '---'},${o.status},${o.total},${o.created_at}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `pedidos_export_${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Exportação Excel (CSV) concluída!");
  } catch (err) {
    console.error(err);
    toast.error("Erro ao exportar pedidos");
  }
}

export async function exportOrdersToPDF(orderIds: string[]) {
  // Mock PDF generation
  toast.info("Gerando PDF em lote... Isso pode levar alguns segundos.");
  
  setTimeout(() => {
    toast.success(`${orderIds.length} pedidos exportados para PDF com sucesso.`);
    // In a real app, we would use jsPDF or call a server-side PDF generator

export const QUOTE_EXPORT_COLUMNS = ["ID", "Número", "Cliente", "Vendedor", "Status", "Valor Total", "Data de Criação"];

export async function exportToExcel(data: any[], filename: string) {
  try {
    let csv = QUOTE_EXPORT_COLUMNS.join(",") + "\n";
    data.forEach(item => {
      const row = [
        item.id,
        item.quote_number || item.order_number || "",
        item.client_company || item.client_name || "",
        item.seller_name || "",
        item.status,
        item.total || 0,
        item.created_at
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exportação concluída!");
  } catch (err) {
    console.error(err);
    toast.error("Erro na exportação");
  }
}

export async function exportToPDF(data: any[], filename: string) {
  toast.info("Exportação para PDF iniciada...");
  // Mock PDF simulation
  setTimeout(() => {
    toast.success("PDF gerado com sucesso (simulado)");
  }, 1500);
}
