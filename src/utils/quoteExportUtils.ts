import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToExcel, exportToPDF } from "./orderExportUtils";

export async function exportQuotesToExcel(quoteIds: string[]) {
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .in("id", quoteIds);

    if (error) throw error;
    
    await exportToExcel(data, `orcamentos_export_${new Date().getTime()}`);
  } catch (err) {
    console.error(err);
    toast.error("Erro ao exportar orçamentos");
  }
}

export async function exportQuotesToPDF(quoteIds: string[]) {
  try {
    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .in("id", quoteIds);

    if (error) throw error;
    
    await exportToPDF(data, `orcamentos_pdf_${new Date().getTime()}`);
  } catch (err) {
    console.error(err);
    toast.error("Erro ao exportar PDF");
  }
}
