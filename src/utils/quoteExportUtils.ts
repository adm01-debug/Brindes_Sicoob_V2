import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { QuoteService } from "@/services/QuoteService";

// Uses a local helper to trigger the browser download (no external dependency).

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportQuotesAsZip(quoteIds: string[], userId: string) {
  const zip = new JSZip();
  const folder = zip.folder("orcamentos_assinados");

  if (!folder) throw new Error("Could not create ZIP folder");

  const { data: quotes, error } = await supabase
    // rls-allow: exportação por ids selecionados; RLS valida cada orçamento
    .from("quotes")
    .select("id, quote_number, approved_pdf_url")
    .in("id", quoteIds)
    .not("approved_pdf_url", "is", null);

  if (error) throw error;
  if (!quotes || quotes.length === 0) {
    throw new Error("Nenhum orçamento assinado encontrado na seleção.");
  }

  const fetchPromises = quotes.map(async (quote) => {
    try {
      const response = await fetch(quote.approved_pdf_url!);
      if (!response.ok) throw new Error(`Failed to fetch PDF for ${quote.quote_number}`);
      const blob = await response.blob();
      folder.file(`${quote.quote_number}_assinado.pdf`, blob);
      
      // Audit log
      await QuoteService.logHistory({
        quoteId: quote.id,
        userId: userId,
        action: "pdf_exported_bulk",
        description: "PDF assinado exportado em massa (ZIP)"
      });
    } catch (err) {
      console.error(err);
    }
  });

  await Promise.all(fetchPromises);
  
  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `orcamentos_assinados_${new Date().getTime()}.zip`);
}
