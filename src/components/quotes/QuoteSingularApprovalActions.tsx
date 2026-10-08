import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Edit3 } from "lucide-react";
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

function useApprovalActions({ quoteId, onActionComplete }: Pick<Props, "quoteId" | "onActionComplete">) {
  const { updateQuoteStatus } = useQuotes();
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [suggestedItems, setSuggestedItems] = useState("");
  const runStatus = async (nextStatus: "rejected_singular" | "approved_singular", message: string | undefined,
    successMessage: string, close?: () => void) => {
    setIsProcessing(true);
    try {
      const ok = await updateQuoteStatus(quoteId, nextStatus, message);
      if (ok) { toast.success(successMessage); close?.(); onActionComplete?.(); }
    } finally { setIsProcessing(false); }
  };
  const handleAdjust = async () => {
    if (!notes.trim()) return void toast.error("Por favor, informe quais ajustes são necessários");
    const fullNotes = suggestedItems.trim() ? `${notes}\n\nModificações sugeridas:\n${suggestedItems}` : notes;
    await runStatus("rejected_singular", fullNotes, "Solicitação de ajuste enviada ao PAC", () => setAdjustDialogOpen(false));
  };
  const handleApprove = () => runStatus("approved_singular", undefined, "Orçamento aprovado!");
  const handleReject = async () => {
    if (!notes.trim()) return void toast.error("Por favor, informe o motivo da rejeição");
    await runStatus("rejected_singular", notes, "Orçamento devolvido para o PAC", () => setRejectDialogOpen(false));
  };
  return { isProcessing, rejectDialogOpen, setRejectDialogOpen, adjustDialogOpen, setAdjustDialogOpen,
    notes, setNotes, suggestedItems, setSuggestedItems, handleAdjust, handleApprove, handleReject };
}

type ApprovalActions = ReturnType<typeof useApprovalActions>;

function ApprovalToolbar({ actions, quoteNumber }: { actions: ApprovalActions; quoteNumber?: string }) {
  const open = (dialog: "adjust" | "reject") => {
    actions.setNotes("");
    if (dialog === "adjust") actions.setAdjustDialogOpen(true);
    else actions.setRejectDialogOpen(true);
  };
  return <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
    <div className="flex-1 min-w-0"><h4 className="text-sm font-bold text-emerald-900">Aprovação Singular</h4>
      <p className="text-xs text-emerald-700 mt-0.5">O orçamento {quoteNumber} aguarda sua validação.</p></div>
    <div className="flex items-center gap-2 shrink-0"><Button variant="outline" size="sm"
      className="h-8 gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-100" onClick={() => open("adjust")} disabled={actions.isProcessing}>
      <Edit3 className="h-3.5 w-3.5" />Ajustar</Button>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        onClick={() => open("reject")} disabled={actions.isProcessing}><XCircle className="h-3.5 w-3.5" />Reprovar</Button>
      <Button size="sm" className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
        onClick={actions.handleApprove} disabled={actions.isProcessing}>
        {actions.isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Aprovar</Button>
    </div></div>;
}

function AdjustmentDialog({ actions }: { actions: ApprovalActions }) {
  return <Dialog open={actions.adjustDialogOpen} onOpenChange={actions.setAdjustDialogOpen}><DialogContent>
    <DialogHeader><DialogTitle>Solicitar Ajustes</DialogTitle><DialogDescription>
      Explique ao PAC quais modificações são necessárias (quantidades, itens, descontos, etc).
    </DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2">
      <Label htmlFor="adjust-notes">Instruções de Ajuste</Label><Textarea id="adjust-notes"
        placeholder="Ex: Reduzir a quantidade de canetas para 100 unidades..." value={actions.notes}
        onChange={(event) => actions.setNotes(event.target.value)} rows={3} />
    </div><div className="space-y-2"><Label htmlFor="suggested-items">Alterações sugeridas (Itens/Qtds)</Label>
      <Textarea id="suggested-items" placeholder="Ex: Item Caneta: 100un; Item Caderno: 50un..."
        value={actions.suggestedItems} onChange={(event) => actions.setSuggestedItems(event.target.value)} rows={3} className="bg-muted/30" />
    </div></div><DialogFooter><Button variant="outline" onClick={() => actions.setAdjustDialogOpen(false)}>Cancelar</Button>
      <Button className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white" onClick={actions.handleAdjust} disabled={actions.isProcessing}>
        {actions.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}Solicitar Ajustes</Button>
    </DialogFooter></DialogContent></Dialog>;
}

function RejectionDialog({ actions }: { actions: ApprovalActions }) {
  return <Dialog open={actions.rejectDialogOpen} onOpenChange={actions.setRejectDialogOpen}><DialogContent>
    <DialogHeader><DialogTitle>Rejeitar Solicitação</DialogTitle><DialogDescription>
      Informe o motivo da rejeição. O comprador do PAC receberá este feedback para ajuste.
    </DialogDescription></DialogHeader><div className="space-y-3 py-2"><Label htmlFor="reject-notes">Motivo / Instruções</Label>
      <Textarea id="reject-notes" placeholder="Ex: Quantidade excedente para este item, preço desalinhado, etc..."
        value={actions.notes} onChange={(event) => actions.setNotes(event.target.value)} rows={4} />
    </div><DialogFooter><Button variant="outline" onClick={() => actions.setRejectDialogOpen(false)}>Cancelar</Button>
      <Button variant="destructive" className="gap-1.5" onClick={actions.handleReject} disabled={actions.isProcessing}>
        {actions.isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}Confirmar Rejeição</Button>
    </DialogFooter></DialogContent></Dialog>;
}

export function QuoteSingularApprovalActions({ quoteId, status, quoteNumber, onActionComplete }: Props) {
  const { isGestorCompras, isDev } = useAuth();
  const actions = useApprovalActions({ quoteId, onActionComplete });
  if (!(isGestorCompras || isDev) || status !== "pending_singular_approval") return null;

  return <><ApprovalToolbar actions={actions} quoteNumber={quoteNumber} />
    <AdjustmentDialog actions={actions} /><RejectionDialog actions={actions} /></>;
}
