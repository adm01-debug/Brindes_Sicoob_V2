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
import { useQuotes } from "@/hooks/quotes/useQuotes";
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
  const [suggestedItems, setSuggestedItems] = useState("");

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
      // Create a composite message if suggested items are provided
      const fullNotes = suggestedItems.trim() 
        ? `${notes}\n\nModificações sugeridas:\n${suggestedItems}`
        : notes;

      const ok = await updateQuoteStatus(quoteId, "rejected_singular", fullNotes);
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
        <p className="text-xs text-emerald-700 mt-0.5">O orçamento {quoteNumber} aguarda sua validação.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100"
          onClick={() => { setNotes(""); setAdjustDialogOpen(true); }}
          disabled={isProcessing}
        >
          <Edit3 className="h-3.5 w-3.5" />
          Ajustar
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
          onClick={() => { setNotes(""); setRejectDialogOpen(true); }}
          disabled={isProcessing}
        >
          <XCircle className="h-3.5 w-3.5" />
          Reprovar
        </Button>
        <Button 
          size="sm" 
          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          onClick={handleApprove}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Aprovar
        </Button>
      </div>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Ajustes</DialogTitle>
            <DialogDescription>
              Explique ao PAC quais modificações são necessárias (quantidades, itens, descontos, etc).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="adjust-notes">Instruções de Ajuste</Label>
              <Textarea
                id="adjust-notes"
                placeholder="Ex: Reduzir a quantidade de canetas para 100 unidades..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suggested-items">Alterações sugeridas (Itens/Qtds)</Label>
              <Textarea
                id="suggested-items"
                placeholder="Ex: Item Caneta: 100un; Item Caderno: 50un..."
                value={suggestedItems}
                onChange={(e) => setSuggestedItems(e.target.value)}
                rows={3}
                className="bg-muted/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button 
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleAdjust}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
              Solicitar Ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
