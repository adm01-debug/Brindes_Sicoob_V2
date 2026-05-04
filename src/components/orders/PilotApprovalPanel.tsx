import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, CheckCircle, XCircle, Clock, Loader2, Upload, MessageSquare } from "lucide-react";
import { type OrderRow } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePilotApprovals } from "@/hooks/usePilotApprovals";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface PilotApprovalPanelProps {
  order: OrderRow;
}

export function PilotApprovalPanel({ order }: PilotApprovalPanelProps) {
  const { user, isVendedor, isGestorCompras, isGerentePa } = useAuth();
  const { approvals, isLoading, createApproval, updateStatus } = usePilotApprovals(order.id);
  const [isUploading, setIsUploading] = useState(false);
  const [notes, setNotes] = useState("");

  const latestApproval = approvals[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${order.id}/${Math.random()}.${fileExt}`;
      const filePath = `pilots/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('personalization')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('personalization')
        .getPublicUrl(filePath);

      await createApproval.mutateAsync({
        mockup_url: publicUrl,
        status: 'pending'
      });
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAction = async (status: 'approved' | 'rejected' | 'revision') => {
    if (!latestApproval) return;
    try {
      await updateStatus.mutateAsync({
        id: latestApproval.id,
        status,
        notes
      });
      setNotes("");
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  if (isLoading) return <Card className="animate-pulse h-48 bg-muted" />;

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" /> 
          Aprovação de Piloto
          {latestApproval && (
            <Badge variant={
              latestApproval.status === 'approved' ? 'success' : 
              latestApproval.status === 'rejected' ? 'destructive' : 
              latestApproval.status === 'revision' ? 'warning' : 'outline'
            } className="ml-auto text-[10px] h-5 uppercase">
              {latestApproval.status === 'approved' ? 'Aprovado' : 
               latestApproval.status === 'rejected' ? 'Reprovado' : 
               latestApproval.status === 'revision' ? 'Revisão' : 'Pendente'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {latestApproval ? (
          <div className="space-y-4">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center relative overflow-hidden group border border-border/50">
              <img 
                src={latestApproval.mockup_url || ""} 
                alt="Foto do Piloto" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Button size="sm" variant="secondary" asChild>
                  <a href={latestApproval.mockup_url || ""} target="_blank" rel="noreferrer">Ver Foto Original</a>
                </Button>
              </div>
            </div>

            {latestApproval.reviewer_notes && (
              <div className="bg-muted/50 p-2 rounded text-[11px] border border-border/40 italic">
                <span className="font-bold block mb-1">Feedback ({latestApproval.reviewer_name}):</span>
                {latestApproval.reviewer_notes}
              </div>
            )}

            {latestApproval.status === 'pending' && (isGestorCompras || isGerentePa) && (
              <div className="space-y-3">
                <Textarea 
                  placeholder="Observações para aprovação/reprovação..." 
                  className="text-xs min-h-[60px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    onClick={() => handleAction('rejected')}
                    disabled={updateStatus.isPending}
                  >
                    <XCircle className="h-3 w-3" /> Reprovar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] gap-1 hover:bg-warning/10 hover:text-warning hover:border-warning/30"
                    onClick={() => handleAction('revision')}
                    disabled={updateStatus.isPending}
                  >
                    <MessageSquare className="h-3 w-3" /> Revisão
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-8 text-[10px] gap-1 bg-sicoob-green hover:bg-sicoob-green-dark"
                    onClick={() => handleAction('approved')}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle className="h-3 w-3" /> Aprovar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-border/60 rounded-lg bg-muted/20">
            <Camera className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground text-center px-4">
              Nenhuma foto de piloto enviada para este pedido.
            </p>
          </div>
        )}

        {isVendedor && (!latestApproval || latestApproval.status === 'rejected' || latestApproval.status === 'revision') && (
          <div className="pt-2 border-t border-border/40">
            <label className="block w-full cursor-pointer">
              <div className={cn(
                "flex flex-col items-center justify-center py-4 border-2 border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors",
                isUploading && "opacity-50 pointer-events-none"
              )}>
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-primary mb-1" />
                    <span className="text-[10px] font-bold text-primary uppercase">Enviar Novo Piloto</span>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
