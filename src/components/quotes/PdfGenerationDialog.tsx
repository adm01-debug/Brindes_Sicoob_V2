/**
 * PdfGenerationDialog — Modal com preview, progresso e ações pós-geração
 * 
 * Fluxo: Preview → Gerar com barra de progresso → Action sheet (Download, WhatsApp, Email, Copiar Link)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { Download, FileText, Eye, Loader2, Check, Send, Copy, Link2, MessageCircle, Mail, Printer, Settings2, Image as ImageIcon, DollarSign, ShieldCheck } from "lucide-react";
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
import { v4 as uuidv4 } from 'uuid';

type Stage = "preview" | "generating" | "ready";

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
  trigger?: React.ReactNode;
}

const PROGRESS_STEPS = [
  { label: "Montando layout", pct: 30 },
  { label: "Renderizando páginas", pct: 70 },
  { label: "Finalizando PDF", pct: 100 },
];

export function PdfGenerationDialog({
  proposalData,
  quoteId,
  quoteNumber,
  quoteStatus,
  clientPhone,
  approvalLink,
  onWhatsApp,
  onShareLink,
  onStatusUpdate,
  trigger,
}: PdfGenerationDialogProps) {
  const { profile } = useAuth();
  const { logPdfGenerated, logStatusChanged } = useQuoteHistory();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("preview");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfVersion, setPdfVersion] = useState(1);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    hidePrices: false,
    hidePhotos: false,
    hideTotals: false,
  });

  // Load preferences from profile
  useEffect(() => {
    if (profile?.preferences?.pdf_options) {
      setPdfOptions(profile.preferences.pdf_options);
    }
  }, [profile]);

  const savePreferences = async (options: typeof pdfOptions) => {
    if (!profile?.id) return;
    
    const newPreferences = {
      ...(profile.preferences || {}),
      pdf_options: options
    };

    try {
      await supabase
        .from("profiles")
        .update({ preferences: newPreferences })
        .eq("user_id", profile.user_id);
    } catch (err) {
      console.error("Failed to save PDF preferences:", err);
    }
  };

  const handleOptionChange = (key: keyof typeof pdfOptions, value: boolean) => {
    const next = { ...pdfOptions, [key]: value };
    setPdfOptions(next);
    savePreferences(next);
  };

  const idHash = useMemo(() => {
    if (!quoteId) return undefined;
    // Generate a simple short hash for verification
    return quoteId.slice(0, 8).toUpperCase();
  }, [quoteId]);

  const proposalDataWithMeta = useMemo(() => {
    if (!proposalData) return null;
    return {
      ...proposalData,
      quoteId,
      idHash,
      status: quoteStatus
    };
  }, [proposalData, quoteId, idHash, quoteStatus]);

  const blobUrlRef = useRef<string | null>(null);

  const isDraft = quoteStatus === "draft";

  const handleGenerate = useCallback(async () => {
    if (!proposalData) return;

    setStage("generating");
    setProgress(0);
    setProgressLabel(PROGRESS_STEPS[0].label);

    try {
      // Step 1: Montando layout
      setProgress(10);
      await new Promise((r) => setTimeout(r, 300));
      setProgress(PROGRESS_STEPS[0].pct);
      setProgressLabel(PROGRESS_STEPS[1].label);

      // Step 2: Renderizando
      await new Promise((r) => setTimeout(r, 200));
      setProgress(50);

      const blob = await generateProposalPDFv2(proposalDataWithMeta as any, pdfOptions);

      // Step 3: Finalizando
      setProgress(PROGRESS_STEPS[1].pct);
      setProgressLabel(PROGRESS_STEPS[2].label);
      await new Promise((r) => setTimeout(r, 300));
      setProgress(100);

      // Cleanup old blob URL
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }

      setPdfBlob(blob);
      blobUrlRef.current = URL.createObjectURL(blob);
      setStage("ready");
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
      setStage("preview");
    }
  }, [proposalData]);

  const handleDownload = () => {
    if (!pdfBlob) return;
    downloadPDF(pdfBlob, `proposta-${quoteNumber || "sem-numero"}-v${pdfVersion}.pdf`);
    setPdfVersion((v) => v + 1);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Proposta Comercial ${quoteNumber || ""}`);
    const body = encodeURIComponent(
      `Olá,\n\nSegue a proposta comercial ${quoteNumber || ""}.\n\nQualquer dúvida, estou à disposição!\n\nAtt.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const handlePrint = () => {
    if (!blobUrlRef.current) return;
    const win = window.open(blobUrlRef.current, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        win.print();
      });
    }
  };
  
  const handleApproveAndSave = async () => {
    if (!pdfBlob || !quoteId) return;
    
    setIsFinalizing(true);
    try {
      const fileName = `${quoteNumber || quoteId}_v${pdfVersion}_signed.pdf`;
      const filePath = `signed/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("proposals")
        .upload(filePath, pdfBlob, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from("proposals")
        .getPublicUrl(filePath);
        
      const { error: updateError } = await supabase
        .from("quotes")
        .update({ 
          status: "approved", 
          approved_pdf_url: publicUrl,
          updated_at: new Date().toISOString()
        } as any)
        .eq("id", quoteId);
        
      if (updateError) throw updateError;
      
      toast.success("Orçamento aprovado e PDF assinado salvo!");
      onStatusUpdate?.("approved", publicUrl);
      setOpen(false);
    } catch (error) {
      console.error("Error finalizing quote:", error);
      toast.error("Erro ao finalizar orçamento");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setStage("preview");
      setProgress(0);
      setPdfBlob(null);
    }
  };

  if (!proposalData) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <FileText className="h-4 w-4" />
            Gerar Proposta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-bold">
                Proposta Comercial {quoteNumber}
              </DialogTitle>
              {isDraft && (
                <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/30 text-xs">
                  Rascunho
                </Badge>
              )}
              {pdfVersion > 1 && (
                <Badge variant="outline" className="text-xs">
                  v{pdfVersion}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {stage === "preview" && (
            <div className="flex flex-col h-full">
              {/* Preview area — scrollable */}
              <div className="flex-1 overflow-auto bg-muted/30 p-4" style={{ maxHeight: "calc(90vh - 160px)" }}>
                <div className="mx-auto" style={{ maxWidth: "794px" }}>
                  <div className="relative bg-white rounded-lg shadow-lg overflow-hidden">
                    {/* Watermark for drafts */}
                    {isDraft && (
                      <div 
                        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
                        style={{ transform: "rotate(-35deg)" }}
                      >
                        <span 
                          className="text-[80px] font-black tracking-[0.3em] uppercase select-none"
                          style={{ 
                            color: "rgba(200, 0, 0, 0.08)",
                            letterSpacing: "0.3em",
                          }}
                        >
                          RASCUNHO
                        </span>
                      </div>
                    )}
                    <PropostaComercialTailwind data={proposalDataWithMeta as any} isDraft={isDraft} options={pdfOptions} />
                  </div>
                </div>
              </div>

              {/* Actions footer */}
               <div className="px-6 py-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="hide-prices" 
                      checked={pdfOptions.hidePrices} 
                      onCheckedChange={(v) => handleOptionChange("hidePrices", v)}
                    />
                    <Label htmlFor="hide-prices" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-muted-foreground" />
                      Ocultar Preços Unitários
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="hide-photos" 
                      checked={pdfOptions.hidePhotos} 
                      onCheckedChange={(v) => handleOptionChange("hidePhotos", v)}
                    />
                    <Label htmlFor="hide-photos" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <ImageIcon className="h-3 w-3 text-muted-foreground" />
                      Ocultar Fotos
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="hide-totals" 
                      checked={pdfOptions.hideTotals} 
                      onCheckedChange={(v) => handleOptionChange("hideTotals", v)}
                    />
                    <Label htmlFor="hide-totals" className="text-xs cursor-pointer flex items-center gap-1.5">
                      <Settings2 className="h-3 w-3 text-muted-foreground" />
                      Ocultar Totais
                    </Label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="lg" className="gap-2 px-8" onClick={handleGenerate}>
                    <FileText className="h-4 w-4" />
                    Gerar PDF
                  </Button>
                </div>
              </div>
            </div>
          )}

          {stage === "generating" && (
            <div className="flex flex-col items-center justify-center py-20 px-6 gap-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="text-center space-y-2 w-full max-w-md">
                <p className="font-semibold text-lg">{progressLabel}...</p>
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  {PROGRESS_STEPS.map((step, i) => (
                    <span 
                      key={i}
                      className={cn(
                        "transition-colors",
                        progress >= step.pct ? "text-primary font-medium" : ""
                      )}
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stage === "ready" && (
            <div className="flex flex-col items-center py-12 px-6 gap-8">
              {/* Success indicator */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Check className="h-8 w-8 text-primary" />
                </div>
                <p className="font-semibold text-lg">PDF pronto!</p>
                
              </div>

              {/* Action Grid */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg">
                <ActionButton
                  icon={<Download className="h-5 w-5" />}
                  label="Baixar"
                  onClick={handleDownload}
                  variant="default"
                />
                
                {quoteId && quoteStatus !== "approved" && (
                  <ActionButton
                    icon={isFinalizing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                    label={isFinalizing ? "Salvando..." : "Aprovar e Salvar Assinado"}
                    onClick={handleApproveAndSave}
                    variant="primary"
                    disabled={isFinalizing}
                  />
                )}
              </div>

              <Separator className="w-full max-w-lg" />

              {/* Secondary actions */}
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="gap-2" onClick={handlePrint}>
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleGenerate}>
                  <FileText className="h-4 w-4" />
                  Regenerar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
}: {
  icon: React.ReactNode;
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
