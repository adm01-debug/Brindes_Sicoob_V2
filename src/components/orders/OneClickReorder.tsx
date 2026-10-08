import { type MouseEvent, useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { sicoobOrderService } from "@/services/sicoob/orderService";

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

  const handleReorder = async (e: MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    try {
      const newQuoteId = await sicoobOrderService.reorderOrder(orderId);
      if (newQuoteId) {
        toast.success("Orçamento de recompra criado", {
          description: "Preço e estoque foram revalidados antes de abrir o rascunho."
        });
        navigate(`/orcamentos/${newQuoteId}/editar`);
      }
    } catch (error) {
      toast.error("Não foi possível criar a recompra", {
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
      });
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
