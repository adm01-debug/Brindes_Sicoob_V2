import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Clock, 
  Image as ImageIcon,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { useOrderPilotApprovals } from "@/hooks/orders/extensions";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface OrderPilotApprovalsTabProps {
  orderId: string;
}

export function OrderPilotApprovalsTab({ orderId }: OrderPilotApprovalsTabProps) {
  const { approvals, updateApprovalStatus, isLoading, error } = useOrderPilotApprovals(orderId);
  const [feedback, setFeedback] = useState("");

  const handleAction = (id: string, status: 'approved' | 'rejected' | 'revision') => {
    if (status !== 'approved' && !feedback.trim()) {
      toast.error("Por favor, forneça um feedback para rejeição ou revisão.");
      return;
    }

    updateApprovalStatus.mutate({ id, status, feedback }, {
      onSuccess: () => setFeedback(""),
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge variant="success">Aprovado</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejeitado</Badge>;
      case 'revision': return <Badge variant="warning">Revisão</Badge>;
      case 'pending': return <Badge variant="outline" className="animate-pulse">Aguardando</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando aprovações...</div>;
  if (error) return (
    <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-sm text-destructive">
      <AlertCircle className="h-5 w-5" /> Não foi possível carregar as versões de arte.
    </div>
  );

  return (
    <div className="space-y-6">
      {approvals?.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground">
          Nenhum piloto/mockup enviado para aprovação neste pedido.
        </div>
      ) : (
        approvals?.map((approval) => (
          <Card key={approval.id}>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  Arte / Piloto de Produção — versão {approval.version}
                </CardTitle>
                {getStatusBadge(approval.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="aspect-video bg-muted rounded-lg border flex items-center justify-center overflow-hidden">
                {approval.photo_url ? (
                  <img src={approval.photo_url} alt="Piloto" className="w-full h-full object-contain" />
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <ImageIcon className="h-12 w-12 mb-2 opacity-20" />
                    <span>Imagem não disponível</span>
                  </div>
                )}
              </div>

              {approval.status === 'pending' && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MessageSquare className="h-4 w-4" />
                      Feedback / Observações
                    </div>
                    <Textarea 
                      placeholder="Descreva observações para aprovação ou motivos da revisão/rejeição..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="success"
                      onClick={() => handleAction(approval.id, 'approved')}
                      disabled={updateApprovalStatus.isPending}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprovar Piloto
                    </Button>
                    <Button 
                      variant="warning"
                      onClick={() => handleAction(approval.id, 'revision')}
                      disabled={updateApprovalStatus.isPending}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Solicitar Revisão
                    </Button>
                    <Button 
                      variant="outline" 
                      className="text-destructive hover:bg-destructive/5"
                      onClick={() => handleAction(approval.id, 'rejected')}
                      disabled={updateApprovalStatus.isPending}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              )}

              {approval.feedback && (
                <div className="p-4 bg-muted rounded-lg text-sm italic">
                  <strong>Último Feedback:</strong> {approval.feedback}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
