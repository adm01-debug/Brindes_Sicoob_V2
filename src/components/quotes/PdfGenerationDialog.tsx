/**
 * PdfGenerationDialog — Modal com preview, progresso e ações pós-geração
 * 
 * Fluxo: Preview → Gerar com barra de progresso → Action sheet (Download, WhatsApp, Email, Copiar Link)
 */

import { type ReactNode, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Download, FileText, Loader2, Check, Printer, Settings2, Image as ImageIcon, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { type ProposalTemplateData } from "@/components/pdf/ProposalHtmlTemplate";
import { PropostaComercialTailwind } from "@/components/pdf/PropostaComercialTailwind";
import { generateProposalPDFv2, downloadPDF } from "@/utils/proposalPdfReactGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuoteHistory } from "@/hooks/useQuoteHistory";

import { approveQuoteWithPdfAtomically } from "@/services/quoteStatusTransition";
import type { Json } from "@/integrations/supabase/types";

type Stage = "preview" | "generating" | "ready";

interface PdfOptions {
  hidePrices: boolean;
  hidePhotos: boolean;
  hideTotals: boolean;
}

function isPdfOptions(value: unknown): value is PdfOptions {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.hidePrices === "boolean"
    && typeof candidate.hidePhotos === "boolean"
    && typeof candidate.hideTotals === "boolean";
}

interface PdfGenerationDialogProps {
  proposalData: ProposalTemplateData | null;
  quoteId?: string;
  quoteNumber?: string;
  quoteStatus?: string;
  clientPhone?: string;
  approvalLink?: string | null;
  onWhatsApp?: () => void;
  onShareLink?: () => void;
  onStatusUpdate?: (newStatus: string, pdfUrl: string) => void;
  trigger?: ReactNode;
}

const PROGRESS_STEPS = [
  { label: "Montando layout", pct: 30 },
  { label: "Renderizando páginas", pct: 70 },
  { label: "Finalizando PDF", pct: 100 },
] as const;

type PdfLogger = ReturnType<typeof useQuoteHistory>["logPdfGenerated"];

function usePdfPreferences(profile: ReturnType<typeof useAuth>["profile"]) {
  const [options, setOptions] = useState<PdfOptions>({ hidePrices: false, hidePhotos: false, hideTotals: false });
  useEffect(() => {
    if (isPdfOptions(profile?.preferences?.pdf_options)) setOptions(profile.preferences.pdf_options);
  }, [profile]);
  const changeOption = (key: keyof PdfOptions, value: boolean) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    if (!profile?.id) return;
    const optionsJson: Record<string, Json> = {
      hidePrices: next.hidePrices,
      hidePhotos: next.hidePhotos,
      hideTotals: next.hideTotals,
    };
    const currentPreferences = (profile.preferences ?? {}) as Record<string, Json | undefined>;
    void supabase.from("profiles").update({ preferences: { ...currentPreferences, pdf_options: optionsJson } })
      .eq("user_id", profile.user_id).then(({ error }) => {
        if (error) console.error("Failed to save PDF preferences:", error);
      });
  };
  return { options, changeOption };
}

async function createPdf(data: ProposalTemplateData, options: PdfOptions,
  update: (progress: number, label?: string) => void) {
  update(10, PROGRESS_STEPS[0].label);
  await new Promise((resolve) => setTimeout(resolve, 300));
  update(PROGRESS_STEPS[0].pct, PROGRESS_STEPS[1].label);
  await new Promise((resolve) => setTimeout(resolve, 200));
  update(50);
  const blob = await generateProposalPDFv2(data, options);
  update(PROGRESS_STEPS[1].pct, PROGRESS_STEPS[2].label);
  await new Promise((resolve) => setTimeout(resolve, 300));
  update(100);
  return blob;
}

function usePdfDocument(data: ProposalTemplateData | null, options: PdfOptions, quoteId: string | undefined, logger: PdfLogger) {
  const [stage, setStage] = useState<Stage>("preview");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [version, setVersion] = useState(1);
  const blobUrlRef = useRef<string | null>(null);
  const generate = useCallback(async () => {
    if (!data) return;
    setStage("generating"); setProgress(0);
    try {
      const generated = await createPdf(data, options, (value, label) => {
        setProgress(value); if (label) setProgressLabel(label);
      });
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      setBlob(generated); blobUrlRef.current = URL.createObjectURL(generated); setStage("ready");
      if (quoteId) void logger(quoteId, {
        hidePrices: options.hidePrices,
        hidePhotos: options.hidePhotos,
        hideTotals: options.hideTotals,
      });
      toast.success("PDF gerado com sucesso!");
    } catch (error) { console.error("Error generating PDF:", error); toast.error("Erro ao gerar PDF"); setStage("preview"); }
  }, [data, options, quoteId, logger]);
  const reset = () => { setStage("preview"); setProgress(0); setBlob(null); };
  const print = () => {
    if (!blobUrlRef.current) return;
    const target = window.open(blobUrlRef.current, "_blank");
    target?.addEventListener("load", () => target.print());
  };
  return { stage, progress, progressLabel, blob, version, setVersion, generate, reset, print };
}

function usePdfFinalization({ blob, quoteId, quoteNumber, version, onStatusUpdate, close }: {
  blob: Blob | null; quoteId?: string; quoteNumber?: string; version: number;
  onStatusUpdate?: (status: string, url: string) => void; close: () => void;
}) {
  const [finalizing, setFinalizing] = useState(false);
  const finalize = async () => {
    if (!blob || !quoteId) return;
    setFinalizing(true);
    try {
      const filePath = `quotes/${quoteId}/${quoteNumber || quoteId}_v${version}_signed.pdf`;
      const { error } = await supabase.storage.from("proposals").upload(filePath, blob, { upsert: true });
      if (error) throw error;
      await approveQuoteWithPdfAtomically(quoteId, filePath);
      toast.success("Orçamento aprovado e PDF assinado salvo!"); onStatusUpdate?.("approved", filePath); close();
    } catch (error) { console.error("Error finalizing quote:", error); toast.error("Erro ao finalizar orçamento"); }
    finally { setFinalizing(false); }
  };
  return { finalizing, finalize };
}

function PdfHeader({ quoteNumber, draft, version }: { quoteNumber?: string; draft: boolean; version: number }) {
  return <DialogHeader className="px-6 pt-6 pb-4 border-b border-border"><div className="flex items-center justify-between">
    <div className="flex items-center gap-3"><DialogTitle className="text-lg font-bold">Proposta Comercial {quoteNumber}</DialogTitle>
      {draft && <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30 text-xs">Rascunho</Badge>}
      {version > 1 && <Badge variant="outline" className="text-xs">v{version}</Badge>}
    </div></div></DialogHeader>;
}

function OptionToggle({ id, checked, label, icon, onChange }: {
  id: string; checked: boolean; label: string; icon: ReactNode; onChange: (value: boolean) => void;
}) {
  return <div className="flex items-center space-x-2"><Switch id={id} checked={checked} onCheckedChange={onChange} />
    <Label htmlFor={id} className="text-xs cursor-pointer flex items-center gap-1.5">{icon}{label}</Label></div>;
}

function PreviewStage({ data, draft, preferences, generate }: {
  data: ProposalTemplateData; draft: boolean; preferences: ReturnType<typeof usePdfPreferences>; generate: () => void;
}) {
  const { options, changeOption } = preferences;
  return <div className="flex flex-col h-full"><div className="flex-1 overflow-auto bg-muted/30 p-4" style={{ maxHeight: 'calc(90vh - 160px)' }}>
    <div className="mx-auto" style={{ maxWidth: '794px' }}><div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
      {draft && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10" style={{ transform: 'rotate(-35deg)' }}>
        <span className="text-[80px] font-black tracking-[0.3em] uppercase select-none" style={{ color: 'rgba(200, 0, 0, 0.08)', letterSpacing: '0.3em' }}>RASCUNHO</span>
      </div>}<PropostaComercialTailwind data={data} isDraft={draft} options={options} />
    </div></div></div><div className="px-6 py-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-6"><OptionToggle id="hide-prices" checked={options.hidePrices}
        onChange={(value) => changeOption('hidePrices', value)} icon={<DollarSign className="h-3 w-3 text-muted-foreground" />} label="Ocultar Preços Unitários" />
        <OptionToggle id="hide-photos" checked={options.hidePhotos} onChange={(value) => changeOption('hidePhotos', value)}
          icon={<ImageIcon className="h-3 w-3 text-muted-foreground" />} label="Ocultar Fotos" />
        <OptionToggle id="hide-totals" checked={options.hideTotals} onChange={(value) => changeOption('hideTotals', value)}
          icon={<Settings2 className="h-3 w-3 text-muted-foreground" />} label="Ocultar Totais" />
      </div><Button size="lg" className="gap-2 px-8" onClick={generate}><FileText className="h-4 w-4" />Gerar PDF</Button>
    </div></div>;
}

function GeneratingStage({ progress, label }: { progress: number; label: string }) {
  return <div className="flex flex-col items-center justify-center py-20 px-6 gap-6"><div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
    <Loader2 className="h-8 w-8 text-primary animate-spin" /></div><div className="text-center space-y-2 w-full max-w-md">
    <p className="font-semibold text-lg">{label}...</p><Progress value={progress} className="h-2" />
    <div className="flex justify-between text-xs text-muted-foreground pt-1">{PROGRESS_STEPS.map((step) => <span key={step.label}
      className={cn('transition-colors', progress >= step.pct ? 'text-primary font-medium' : '')}>{step.label}</span>)}</div>
  </div></div>;
}

function ReadyStage({ document, finalizing, finalize, download, canFinalize }: {
  document: ReturnType<typeof usePdfDocument>; finalizing: boolean; finalize: () => void; download: () => void;
  canFinalize: boolean;
}) {
  return <div className="flex flex-col items-center py-12 px-6 gap-8"><div className="flex flex-col items-center gap-3">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"><Check className="h-8 w-8 text-primary" /></div>
    <p className="font-semibold text-lg">PDF pronto!</p></div><div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg">
    <ActionButton icon={<Download className="h-5 w-5" />} label="Baixar" onClick={download} variant="default" />
    {document.blob && canFinalize && <ActionButton icon={finalizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
      label={finalizing ? 'Salvando...' : 'Aprovar e Salvar Assinado'} onClick={finalize} variant="primary" disabled={finalizing} />}
  </div><Separator className="w-full max-w-lg" /><div className="flex gap-2">
    <Button variant="ghost" size="sm" className="gap-2" onClick={document.print}><Printer className="h-4 w-4" />Imprimir</Button>
    <Button variant="ghost" size="sm" className="gap-2" onClick={document.generate}><FileText className="h-4 w-4" />Regenerar</Button>
  </div></div>;
}

export function PdfGenerationDialog({ proposalData, quoteId, quoteNumber, quoteStatus, onStatusUpdate, trigger }: PdfGenerationDialogProps) {
  const { profile } = useAuth();
  const { logPdfGenerated } = useQuoteHistory();
  const [open, setOpen] = useState(false);
  const preferences = usePdfPreferences(profile);
  const idHash = useMemo(() => quoteId?.slice(0, 8).toUpperCase(), [quoteId]);
  const effectiveData = useMemo<ProposalTemplateData | null>(() => proposalData ? {
    ...proposalData,
    ...(quoteId ? { quoteId } : {}),
    ...(idHash ? { idHash } : {}),
    ...(quoteStatus ? { status: quoteStatus } : {}),
  } : null, [proposalData, quoteId, idHash, quoteStatus]);
  const document = usePdfDocument(effectiveData, preferences.options, quoteId, logPdfGenerated);
  const finalization = usePdfFinalization({ blob: document.blob, quoteId, quoteNumber,
    version: document.version, onStatusUpdate, close: () => setOpen(false) });
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) document.reset();
  };
  const download = () => {
    if (!document.blob) return;
    downloadPDF(document.blob, `proposta-${quoteNumber || "sem-numero"}-v${document.version}.pdf`);
    document.setVersion((version) => version + 1);
  };
  if (!proposalData || !effectiveData) return null;
  const stage = document.stage === "preview"
    ? <PreviewStage data={effectiveData} draft={quoteStatus === "draft"} preferences={preferences} generate={document.generate} />
    : document.stage === "generating"
      ? <GeneratingStage progress={document.progress} label={document.progressLabel} />
      : <ReadyStage document={document} finalizing={finalization.finalizing} finalize={finalization.finalize}
        download={download} canFinalize={Boolean(quoteId && quoteStatus !== "approved")} />;
  return <Dialog open={open} onOpenChange={handleOpenChange}>
    <DialogTrigger asChild>{trigger || <Button className="gap-2"><FileText className="h-4 w-4" />Gerar Proposta</Button>}</DialogTrigger>
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
      <PdfHeader quoteNumber={quoteNumber} draft={quoteStatus === "draft"} version={document.version} />
      <div className="flex-1 overflow-hidden">{stage}</div>
    </DialogContent>
  </Dialog>;
}
function ActionButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "primary" | "whatsapp";
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200",
        "hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none",
        variant === "primary" && "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
        variant === "whatsapp" && "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20",
        variant === "default" && "bg-card border-border text-foreground hover:bg-accent",
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
