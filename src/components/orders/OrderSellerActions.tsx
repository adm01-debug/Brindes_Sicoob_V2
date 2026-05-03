import { Button } from "@/components/ui/button";
import { useUpdateOrder, type OrderRow, ORDER_STATUS_LABELS } from "@/hooks";
import { Play, Package, Truck, CheckCircle, Flag } from "lucide-react";
import { toast } from "sonner";

interface OrderSellerActionsProps {
  order: OrderRow;
}

export function OrderSellerActions({ order }: OrderSellerActionsProps) {
  const update = useUpdateOrder(order.id, order.status);

  const handleStatusChange = (nextStatus: string, label: string) => {
    update.mutate({ status: nextStatus }, {
      onSuccess: () => {
        toast.success(`Pedido em ${label}`);
      }
    });
  };

  const currentStatus = order.status;

  return (
    <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-3 rounded-lg border border-muted">
      <span className="text-xs font-semibold mr-2 text-muted-foreground uppercase">Ações do Vendedor:</span>
      
      {currentStatus === "enviado_vendedor" && (
        <Button size="sm" onClick={() => handleStatusChange("em_producao", "Produção")} disabled={update.isPending}>
          <Play className="h-4 w-4 mr-2" /> Iniciar Produção
        </Button>
      )}

      {currentStatus === "em_producao" && (
        <Button size="sm" variant="secondary" onClick={() => handleStatusChange("em_separacao", "Separação")} disabled={update.isPending}>
          <Package className="h-4 w-4 mr-2" /> Iniciar Separação
        </Button>
      )}

      {currentStatus === "em_separacao" && (
        <Button size="sm" variant="default" onClick={() => handleStatusChange("em_transporte", "Transporte")} disabled={update.isPending}>
          <Truck className="h-4 w-4 mr-2" /> Despachar Pedido
        </Button>
      )}

      {currentStatus === "em_transporte" && (
        <Button size="sm" variant="outline" onClick={() => handleStatusChange("entregue", "Entregue")} disabled={update.isPending} className="border-green-200 text-green-700 hover:bg-green-50">
          <CheckCircle className="h-4 w-4 mr-2" /> Confirmar Entrega
        </Button>
      )}

      {currentStatus === "entregue" && (
        <Button size="sm" variant="default" onClick={() => handleStatusChange("concluido", "Concluído")} disabled={update.isPending} className="bg-green-600 hover:bg-green-700">
          <Flag className="h-4 w-4 mr-2" /> Concluir Pedido
        </Button>
      )}

      {["concluido", "cancelado"].includes(currentStatus) && (
        <span className="text-sm italic text-muted-foreground">
          {currentStatus === "concluido" ? "Pedido finalizado com sucesso." : "Pedido cancelado."}
        </span>
      )}
      
      {!["enviado_vendedor", "em_producao", "em_separacao", "em_transporte", "entregue", "concluido", "cancelado"].includes(currentStatus) && (
        <span className="text-sm italic text-muted-foreground">
          Aguardando aprovação ou envio ao vendedor.
        </span>
      )}
    </div>
  );
}
