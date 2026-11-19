/**
 * ExportDossierButton — botão de exportação do Dossiê BI em PDF.
 *
 * Quando uma fonte cai, o hook já sabe qual é e como tentar de novo. Antes isso
 * morria aqui: o botão só lia `isReady` e ficava cinza, sem dizer o motivo nem
 * oferecer saída — o vendedor não tinha o que fazer além de recarregar a página.
 */
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileDown, Loader2, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { useBIDossierExport } from "@/hooks/bi/useBIDossierExport";

interface Props {
  clientId: string;
}

export function ExportDossierButton({ clientId }: Props) {
  const { isReady, isError, errorMessage, failedSources, isExporting, exportPDF, retry } =
    useBIDossierExport(clientId);

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

  if (isError) {
    return (
      <div role="alert" className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage ?? `Fonte indisponível: ${failedSources.join(", ")}.`}</span>
        </p>
        <Button
          onClick={() => { void retry(); }}
          variant="outline"
          size="sm"
          className="gap-2 self-start"
        >
          <RotateCw className="h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
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
  );
}
