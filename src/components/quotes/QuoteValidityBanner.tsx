import { differenceInDays, differenceInHours, parseISO, isValid } from "date-fns";
import { AlertTriangle, Clock, CheckCircle2, Download, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";

interface QuoteValidityBannerProps {
  validUntil?: string;
  status: string;
  pdfUrl?: string;
  onDownloadPdf?: () => void;
}

const APPROVED_STATUSES = new Set(["approved", "approved_singular", "converted"]);
const REJECTED_STATUSES = new Set(["rejected", "rejected_singular"]);

function daySuffix(days: number) {
  return days === 1 ? "" : "s";
}

function ApprovedBanner({ onDownloadPdf }: { onDownloadPdf?: () => void }) {
  return <div className="flex flex-col sm:flex-row items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700">
    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="text-sm font-bold">Solicitação Aprovada</span></div>
    <div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1.5 hover:bg-emerald-500/20 text-emerald-700" onClick={onDownloadPdf}>
      <Download className="h-3.5 w-3.5" />PDF da Ordem</Button></div>
  </div>;
}

function ValidityMessage({ kind, value }: { kind: "expired" | "urgent" | "warning" | "valid"; value?: number }) {
  if (kind === "expired") return <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive shadow-sm animate-in fade-in slide-in-from-top-1">
    <AlertTriangle className="h-4 w-4 shrink-0" /><span className="text-sm font-bold uppercase tracking-tight">Proposta Expirada</span></div>;
  if (kind === "urgent") return <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 shadow-sm animate-pulse">
    <Timer className="h-4 w-4 shrink-0" /><span className="text-sm font-bold">URGENTE: Expira em {value}h</span></div>;
  if (kind === "warning") return <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 shadow-sm">
    <Clock className="h-4 w-4 shrink-0" /><span className="text-sm font-semibold">Expira em {value} dia{daySuffix(value ?? 0)}</span></div>;
  return <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary/5 border border-primary/20 text-primary dark:text-primary">
    <CheckCircle2 className="h-4 w-4 shrink-0" /><span className="text-sm font-medium">Válido por mais {value} dia{daySuffix(value ?? 0)}</span></div>;
}

export function QuoteValidityBanner({ validUntil, status, onDownloadPdf }: QuoteValidityBannerProps) {
  const isApproved = APPROVED_STATUSES.has(status);
  
  if (isApproved) {
    return <ApprovedBanner onDownloadPdf={onDownloadPdf} />;
  }

  if (!validUntil || REJECTED_STATUSES.has(status)) return null;

  const expiryDate = parseISO(validUntil);
  if (!isValid(expiryDate)) return null;

  const now = new Date();
  const daysLeft = differenceInDays(expiryDate, now);
  const hoursLeft = differenceInHours(expiryDate, now);

  if (status === "expired" || hoursLeft < 0) {
    return <ValidityMessage kind="expired" />;
  }

  if (hoursLeft <= 24) {
    return <ValidityMessage kind="urgent" value={hoursLeft} />;
  }

  if (daysLeft <= 3) {
    return <ValidityMessage kind="warning" value={daysLeft} />;
  }

  return <ValidityMessage kind="valid" value={daysLeft} />;
}
