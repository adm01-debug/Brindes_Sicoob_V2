
import { useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRBAC } from "@/hooks/useRBAC";
import { useDiscountApproval } from "@/hooks/useDiscountApproval";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  quoteId: string;
  status: string;
  realDiscountPercent?: number;
  maxDiscountPercent?: number;
  onActionComplete?: () => void;
}

export function QuoteManagerApprovalBanner({ quoteId, status, realDiscountPercent, maxDiscountPercent, onActionComplete }: Props) {
  const { isSupervisorOrAbove } = useRBAC();
  const { getApprovalStatus, respondToApproval } = useDiscountApproval();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const isPending = status === "pending_approval";
  const canApprove = isSupervisorOrAbove;

  if (!isPending) return null;

  const handleApprove = async () => {
    if (!canApprove) {
      toast.error("Você não possui alçada para responder esta solicitação.");
      return;
    }
    setIsProcessing(true);
    try {
      const request = await getApprovalStatus(quoteId);
      const ok = request ? await respondToApproval(request.id, true) : false;
      if (ok) {
        toast.success("Desconto aprovado! O orçamento agora pode ser enviado ao cliente.");
        onActionComplete?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!canApprove) {
      toast.error("Você não possui alçada para responder esta solicitação.");
      return;
    }
    if (!notes.trim()) {
      toast.error("Por favor, informe o motivo da reprovação");
      return;
    }

    setIsProcessing(true);
    try {
      const request = await getApprovalStatus(quoteId);
      const ok = request ? await respondToApproval(request.id, false, notes) : false;
      if (ok) {
        toast.success("Orçamento devolvido como rascunho para ajuste");
        setRejectDialogOpen(false);
        onActionComplete?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border animate-in fade-in slide-in-from-top-4 duration-500 shadow-lg mb-6",
      canApprove ? "bg-amber-50 border-amber-200" : "bg-muted/50 border-border"
    )}>
      <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 shrink-0 shadow-inner">
        <ShieldCheck className="h-6 w-6 text-amber-600" />
      </div>
      
      <div className="flex-1 text-center md:text-left">
        <h4 className="font-display font-bold text-amber-900 text-lg">Aprovação de Alçada Pendente</h4>
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mt-1">
          <p className="text-sm text-amber-800/80">
            Este orçamento possui um desconto de <span className="font-bold text-amber-900">{realDiscountPercent?.toFixed(1)}%</span>, 
            que excede o limite do vendedor (<span className="font-bold">{maxDiscountPercent}%</span>).
          </p>
          {!canApprove && (
            <Badge variant="outline" className="bg-white/50 border-amber-200 text-amber-700 gap-1 text-[10px]">
              <Info className="h-3 w-3" /> Aguardando Gestor
            </Badge>
          )}
        </div>
      </div>

      {canApprove && (
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-10 px-4 gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => { setNotes(""); setRejectDialogOpen(true); }}
            disabled={isProcessing || !canApprove}
          >
            <XCircle className="h-4 w-4" />
            Reprovar
          </Button>
          <Button 
            size="sm" 
            className="h-10 px-6 gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-md transition-all active:scale-95"
            onClick={handleApprove}
            disabled={isProcessing || !canApprove}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aprovar Desconto
          </Button>
        </div>
      )}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Reprovar Desconto
            </DialogTitle>
            <DialogDescription>
              Explique ao vendedor por que o desconto não foi autorizado e o que ele deve ajustar.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-reason" className="text-sm font-semibold mb-2 block">Motivo da Reprovação</Label>
            <Textarea
              id="reject-reason"
              placeholder="Ex: Margem muito baixa para este cliente, tente reduzir o desconto para no máximo 10%..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setRejectDialogOpen(false)} disabled={isProcessing}>Cancelar</Button>
            <Button 
              variant="destructive" 
              className="gap-2"
              onClick={handleReject}
              disabled={isProcessing || !notes.trim() || !canApprove}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
