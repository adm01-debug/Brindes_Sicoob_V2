/**
 * ExportDossierButton — botão de exportação do Dossiê BI em PDF.
 */
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBIDossierExport } from "@/hooks/bi/useBIDossierExport";

interface Props {
  clientId: string;
}

export function ExportDossierButton({ clientId }: Props) {
  const { isReady, isError, errorMessage, isExporting, exportPDF, retry } = useBIDossierExport(clientId);

  const handleClick = async () => {
    try {
      await exportPDF();
      toast.success("Dossiê exportado", {
        description: "PDF gerado com sucesso.",
      });
    } catch (err) {
      console.error("[ExportDossierButton] erro ao gerar PDF", err);
      toast.error("Falha ao gerar dossiê", {
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={handleClick}
        disabled={!isReady || isExporting}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            Exportar Dossiê PDF
          </>
        )}
      </Button>
      {isError && errorMessage && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-destructive" role="alert">
          <span>{errorMessage}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => void retry()}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
