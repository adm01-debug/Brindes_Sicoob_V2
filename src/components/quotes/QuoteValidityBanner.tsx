import { differenceInDays, differenceInHours, parseISO, isValid } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2, Download, FileText, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QuoteValidityBannerProps {
  validUntil?: string;
  status: string;
  pdfUrl?: string;
  onDownloadPdf?: () => void;
}

export function QuoteValidityBanner({ validUntil, status, pdfUrl, onDownloadPdf }: QuoteValidityBannerProps) {
  const isApproved = status === "approved" || status === "approved_singular" || status === "converted";
  
  if (isApproved) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="text-sm font-bold">Solicitação Aprovada</span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-[11px] gap-1.5 hover:bg-emerald-500/20 text-emerald-700"
            onClick={onDownloadPdf}
          >
            <Download className="h-3.5 w-3.5" />
            PDF da Ordem
          </Button>
        </div>
      </div>
    );
  }

  if (!validUntil || status === "rejected" || status === "rejected_singular") return null;

  const now = new Date();
  const daysLeft = differenceInDays(expiryDate, now);
  const hoursLeft = differenceInHours(expiryDate, now);

  if (status === "expired" || hoursLeft < 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive shadow-sm animate-in fade-in slide-in-from-top-1">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-sm font-bold uppercase tracking-tight">
          Proposta Expirada
        </span>
      </div>
    );
  }

  if (hoursLeft <= 24) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 shadow-sm animate-pulse">
        <Timer className="h-4 w-4 shrink-0" />
        <span className="text-sm font-bold">
          URGENTE: Expira em {hoursLeft}h
        </span>
      </div>
    );
  }

  if (daysLeft <= 3) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 shadow-sm">
        <Clock className="h-4 w-4 shrink-0" />
        <span className="text-sm font-semibold">
          Expira em {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 text-primary dark:text-primary">
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span className="text-sm font-medium">
        Válido por mais {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

