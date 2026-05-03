import { useState } from "react";
import { CheckCircle2, XCircle, MessageSquare, Loader2, Edit3 } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useQuotes } from "@/hooks/useQuotes";
import { toast } from "sonner";

interface Props {
  quoteId: string;
  status: string;
  quoteNumber?: string;
  onActionComplete?: () => void;
}

export function QuoteSingularApprovalActions({ quoteId, status, quoteNumber, onActionComplete }: Props) {
  const { isGestorCompras, isDev } = useAuth();
  const { updateQuoteStatus, logQuoteHistory } = useQuotes();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");

  // Only Singular Buyers (Gestor de Compras) can approve/reject PAC solicitations
  const canApprove = isGestorCompras || isDev;
  const isPending = status === "pending_singular_approval";

  if (!canApprove || !isPending) return null;

  const handleAdjust = async () => {
    if (!notes.trim()) {
      toast.error("Por favor, informe quais ajustes são necessários");
      return;
    }

    setIsProcessing(true);
    try {
      // For adjustments, we might use 'rejected_singular' with specific notes or a new status if needed.
      // Reusing rejected_singular as it sends it back to the PAC for editing.
      const ok = await updateQuoteStatus(quoteId, "rejected_singular", `Ajustes solicitados: ${notes}`);
      if (ok) {
        toast.success("Solicitação de ajuste enviada ao PAC");
        setAdjustDialogOpen(false);
        onActionComplete?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const ok = await updateQuoteStatus(quoteId, "approved_singular");
      if (ok) {
        await logQuoteHistory(quoteId, "singular_approved", "Solicitação aprovada pelo comprador da Singular");
        toast.success("Orçamento aprovado!");
        onActionComplete?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await updateQuoteStatus(quoteId, "rejected_singular", notes);
      if (ok) {
        toast.success("Orçamento devolvido para o PAC");
        setRejectDialogOpen(false);
        onActionComplete?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-emerald-900">Aprovação Singular</h4>
        <p className="text-xs text-emerald-700 mt-0.5">Este orçamento foi solicitado por um PAC e aguarda sua validação.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => setRejectDialogOpen(true)}
          disabled={isProcessing}
        >
          <XCircle className="h-3.5 w-3.5" />
          Rejeitar
        </Button>
        <Button 
          size="sm" 
          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleApprove}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Aprovar Solicitação
        </Button>
      </div>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O comprador do PAC receberá este feedback para ajuste.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="reject-notes">Motivo / Instruções</Label>
            <Textarea
              id="reject-notes"
              placeholder="Ex: Quantidade excedente para este item, preço desalinhado, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive" 
              className="gap-1.5"
              onClick={handleReject}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
