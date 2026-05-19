import { Package, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useConvertQuoteToOrder } from "@/hooks/orders/useOrders";
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
  const { currentOrg } = useOrganization();
  const navigate = useNavigate();
  const { mutate: convert, isPending: isConverting } = useConvertQuoteToOrder();

  if (status !== "approved" && status !== "approved_singular") return null;

  const handleConvert = () => {
    convert({
      quoteId,
      organizationId: currentOrg?.id || null,
    }, {
      onSuccess: (order) => {
        navigate(`/pedidos/${order.id}`);
        onConverted?.();
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isConverting}>
          <Package className="h-4 w-4" />
          {isConverting ? "Convertendo..." : "Converter em Pedido"}
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
