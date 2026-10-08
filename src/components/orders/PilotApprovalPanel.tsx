import { type ChangeEvent, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, XCircle, Loader2, Upload, MessageSquare } from "lucide-react";
import { type OrderRow } from "@/hooks/orders/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePilotApprovals, type PilotApproval } from "@/hooks/usePilotApprovals";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { OrderService } from "@/services/OrderService";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PilotApprovalPanelProps {
  order: OrderRow;
}

const PILOT_STATUS = {
  approved: { variant: 'success' as const, label: 'Aprovado' },
  rejected: { variant: 'destructive' as const, label: 'Reprovado' },
  revision: { variant: 'warning' as const, label: 'Revisão' },
  pending: { variant: 'outline' as const, label: 'Pendente' },
};

function PilotHeader({ approval }: { approval?: PilotApproval }) {
  const status = approval ? PILOT_STATUS[approval.status] : undefined;
  return <CardHeader className="pb-3 bg-muted/30"><CardTitle className="text-sm font-bold flex items-center gap-2"><Camera className="h-4 w-4 text-primary" />Aprovação de Piloto{status && <Badge variant={status.variant} className="ml-auto text-[10px] h-5 uppercase">{status.label}</Badge>}</CardTitle></CardHeader>;
}

function ReviewActions({ notes, pending, onNotesChange, onAction }: { notes: string; pending: boolean; onNotesChange: (value: string) => void; onAction: (status: 'approved' | 'rejected' | 'revision') => void }) {
  return <div className="space-y-3"><Textarea placeholder="Observações para aprovação/reprovação..." className="text-xs min-h-[60px]" value={notes} onChange={event => onNotesChange(event.target.value)} /><div className="grid grid-cols-3 gap-2"><Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => onAction('rejected')} disabled={pending}><XCircle className="h-3 w-3" /> Reprovar</Button><Button variant="outline" size="sm" className="h-8 text-[10px] gap-1 hover:bg-warning/10 hover:text-warning hover:border-warning/30" onClick={() => onAction('revision')} disabled={pending}><MessageSquare className="h-3 w-3" /> Revisão</Button><Button variant="default" size="sm" className="h-8 text-[10px] gap-1 bg-sicoob-green hover:bg-sicoob-green-dark" onClick={() => onAction('approved')} disabled={pending}><CheckCircle className="h-3 w-3" /> Aprovar</Button></div></div>;
}

function ApprovalContent({ approval, canReview, notes, pending, onNotesChange, onAction }: { approval?: PilotApproval; canReview: boolean; notes: string; pending: boolean; onNotesChange: (value: string) => void; onAction: (status: 'approved' | 'rejected' | 'revision') => void }) {
  if (!approval) return <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border/60 rounded-lg bg-muted/20"><Camera className="h-10 w-10 text-muted-foreground/30 mb-2" /><p className="text-xs text-muted-foreground text-center px-4">Nenhuma foto de piloto enviada para este pedido.</p></div>;
  return <div className="space-y-4"><div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden group border border-border/50"><img src={approval.mockup_url || ""} alt="Foto do Piloto" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Button size="sm" variant="secondary" asChild><a href={approval.mockup_url || ""} target="_blank" rel="noreferrer">Ver Foto Original</a></Button></div></div>{approval.reviewer_notes && <div className="bg-muted/50 p-2 rounded text-[11px] border border-border/40 italic"><span className="font-bold block mb-1">Feedback ({approval.reviewer_name}):</span>{approval.reviewer_notes}</div>}{approval.status === 'pending' && canReview && <ReviewActions notes={notes} pending={pending} onNotesChange={onNotesChange} onAction={onAction} />}</div>;
}

function PilotUpload({ visible, uploading, onUpload }: { visible: boolean; uploading: boolean; onUpload: (event: ChangeEvent<HTMLInputElement>) => void }) {
  if (!visible) return null;
  return <div className="pt-2 border-t border-border/40"><label className="block w-full cursor-pointer"><div className={cn("flex flex-col items-center justify-center py-4 border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors", uploading && "opacity-50 pointer-events-none")}>{uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <><Upload className="h-6 w-6 text-primary mb-1" /><span className="text-[10px] font-bold text-primary uppercase">Enviar Novo Piloto</span></>}</div><input type="file" className="hidden" accept="image/*" onChange={onUpload} disabled={uploading} /></label></div>;
}

function mayUploadPilot(isSeller: boolean, approval?: PilotApproval): boolean {
  if (!isSeller) return false;
  if (!approval) return true;
  return approval.status === 'rejected' || approval.status === 'revision';
}

export function PilotApprovalPanel({ order }: PilotApprovalPanelProps) {
  const { user, isVendedor, isGestorCompras, isGerentePa } = useAuth();
  const { approvals, isLoading, createApproval, updateStatus } = usePilotApprovals(order.id);
  const [isUploading, setIsUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const latestApproval = approvals[0];
  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const publicUrl = await OrderService.uploadPilotPhoto(order.id, file);
      await createApproval.mutateAsync({ mockup_url: publicUrl, status: 'pending' });
    } catch (error: unknown) {
      toast.error("Erro ao enviar foto: " + (error instanceof Error ? error.message : "erro desconhecido"));
    } finally {
      setIsUploading(false);
    }
  };
  const handleAction = async (status: 'approved' | 'rejected' | 'revision') => {
    if (!latestApproval) return;
    try {
      await updateStatus.mutateAsync({ id: latestApproval.id, status, notes });
      setNotes("");
    } catch (error: unknown) {
      toast.error("Erro ao atualizar status: " + (error instanceof Error ? error.message : "erro desconhecido"));
    }
  };

  if (isLoading) return <Card className="animate-pulse h-48 bg-muted" />;
  const canReview = isGestorCompras || isGerentePa;
  const uploadVisible = mayUploadPilot(isVendedor, latestApproval);
  return (
    <Card className="border-border/40 overflow-hidden">
      <PilotHeader approval={latestApproval} />
      <CardContent className="p-4 space-y-4">
        <ApprovalContent approval={latestApproval} canReview={canReview} notes={notes} pending={updateStatus.isPending} onNotesChange={setNotes} onAction={status => { void handleAction(status); }} />
        <PilotUpload visible={uploadVisible} uploading={isUploading} onUpload={handleFileUpload} />
      </CardContent>
    </Card>
  );
}
