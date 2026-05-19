import { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useOrders } from "@/hooks/orders/useOrders";

interface Props {
  orderId: string;
  variant?: "default" | "outline" | "ghost" | "link";
  className?: string;
  showLabel?: boolean;
}

/**
 * OneClickReorder — Permite ao PAC Buyer duplicar um pedido anterior rapidamente.
 */
export function OneClickReorder({ orderId, variant = "outline", className, showLabel = true }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { duplicateOrder } = useOrders();

  const handleReorder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      const newOrder = await duplicateOrder(orderId);
      if (newOrder?.id) {
        toast.success("Pedido duplicado com sucesso!", {
          description: "Você foi redirecionado para o novo rascunho."
        });
        navigate(`/pedidos/${newOrder.id}/editar`);
      }
    } catch (error) {
      toast.error("Erro ao processar recompra");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      onClick={handleReorder}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <RotateCcw className="h-4 w-4 mr-2" />
      )}
      {showLabel && "Comprar novamente"}
    </Button>
  );
}
