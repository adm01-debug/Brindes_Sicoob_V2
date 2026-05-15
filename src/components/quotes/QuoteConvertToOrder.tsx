import { useState } from "react";
import { Package, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { OrderService } from "@/services/OrderService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface QuoteConvertToOrderProps {
  quoteId: string;
  status: string;
  onConverted?: () => void;
}

export function QuoteConvertToOrder({ quoteId, status, onConverted }: QuoteConvertToOrderProps) {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const [isConverting, setIsConverting] = useState(false);

  if (status !== "approved" && status !== "approved_singular") return null;

  const handleConvert = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsConverting(true);
    try {
      const order = await OrderService.convertQuoteToOrder({
        quoteId,
        sellerId: user.id,
        organizationId: currentOrg?.id || null,
      });

      toast.success(
        `Pedido #${order.order_number} criado com sucesso!`,
        {
          description: `Total: ${order.total?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
          action: {
            label: "Ver Pedido",
            onClick: () => navigate(`/pedidos/${order.id}`),
          },
        }
      );

      onConverted?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao converter orçamento em pedido");
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isConverting}>
          {isConverting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          Converter em Pedido
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Converter Orçamento em Pedido?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação criará um novo pedido com base nos dados deste orçamento aprovado.
            Os itens, valores e informações do cliente serão copiados automaticamente.
            O status do orçamento será atualizado para "Convertido".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConvert}
            className="bg-primary hover:bg-primary/90"
            disabled={isConverting}
          >
            {isConverting ? "Convertendo..." : "Confirmar Conversão"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
