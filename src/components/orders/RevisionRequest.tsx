import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useUpdateOrder } from "@/hooks/useOrders";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface RevisionRequestProps {
  orderId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function RevisionRequest({ orderId, isOpen, onClose }: RevisionRequestProps) {
  const [reason, setReason] = useState("");
  const updateOrder = useUpdateOrder(orderId, "enviado_gestor");

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error("Por favor, informe o motivo da revisão.");
      return;
    }

    updateOrder.mutate({ 
      status: "rascunho",
      internal_notes: `Solicitação de Revisão: ${reason}`
    } as any, {
      onSuccess: () => {
        toast.success("Solicitação de revisão enviada.");
        onClose();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" /> Solicitar Revisão
          </DialogTitle>
          <DialogDescription>
            O pedido voltará para o status "Rascunho" para que o Gerente PA realize os ajustes necessários.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea 
            placeholder="Descreva o que precisa ser ajustado..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[120px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={updateOrder.isPending}>
            Enviar para Revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
