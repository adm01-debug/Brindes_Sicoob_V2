import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, CheckCircle2, XCircle, RefreshCcw, Clock } from "lucide-react";
import { usePilotApprovals } from "@/hooks/usePilotApprovals";

interface OrderPilotWorkflowProps {
  orderId: string;
}

const statusConfig = {
  pending: { label: "Pendente", color: "bg-warning/20 text-warning", icon: Clock },
  approved: { label: "Aprovado", color: "bg-emerald-500/20 text-emerald-600", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "bg-destructive/20 text-destructive", icon: XCircle },
  revision: { label: "Ajuste Solicitado", color: "bg-blue-500/20 text-blue-600", icon: RefreshCcw },
};

export function OrderPilotWorkflow({ orderId }: OrderPilotWorkflowProps) {
  const { approvals, createApproval, updateStatus } = usePilotApprovals(orderId);
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  const latestApproval = approvals?.[0];

  const handleCreate = () => {
    if (!photoUrl) return;
    createApproval.mutate({
      order_id: orderId,
      status: 'pending',
      mockup_url: photoUrl,
      reviewer_notes: comment
    });
    setComment("");
    setPhotoUrl("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ImagePlus className="h-4 w-4 text-primary" /> Aprovação de Piloto / Mockup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestApproval ? (
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30">
              {latestApproval.mockup_url && (
                <img
                  src={latestApproval.mockup_url}
                  alt="Piloto"
                  className="w-24 h-24 object-cover rounded-md border"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={statusConfig[latestApproval.status].color}>
                    {statusConfig[latestApproval.status].label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(latestApproval.created_at).toLocaleDateString()}
                  </span>
                </div>
                {latestApproval.reviewer_notes && (
                  <p className="text-sm text-muted-foreground italic">"{latestApproval.reviewer_notes}"</p>
                )}
              </div>
            </div>

            {latestApproval.status === 'pending' && (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => updateStatus.mutate({ id: latestApproval.id, status: 'approved' })}
                >
                  Aprovar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: latestApproval.id, status: 'revision' })}
                >
                  Solicitar Ajuste
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => updateStatus.mutate({ id: latestApproval.id, status: 'rejected' })}
                >
                  Rejeitar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nenhum piloto enviado para este pedido.</p>
            <div className="space-y-2">
              <Textarea 
                placeholder="Comentários sobre o piloto..." 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="text-sm"
              />
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="URL da foto do piloto (mockup)" 
                  className="flex-1 text-sm border rounded px-3"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
                <Button size="sm" onClick={handleCreate} disabled={!photoUrl}>Enviar para Aprovação</Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
