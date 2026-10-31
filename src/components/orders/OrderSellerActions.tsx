import { Button } from "@/components/ui/button";
import { useUpdateOrder, type OrderRow } from "@/hooks";
import { Play, Package, Truck, CheckCircle, Flag } from "lucide-react";
import { toast } from "sonner";

interface OrderSellerActionsProps {
  order: OrderRow;
}

const ACTIONS: Partial<Record<OrderRow["status"], { next: OrderRow["status"]; label: string; text: string; icon: typeof Play; variant?: "secondary" | "default" | "outline"; className?: string }>> = {
  enviado_vendedor: { next: "em_producao", label: "Produção", text: "Iniciar Produção", icon: Play },
  em_producao: { next: "em_separacao", label: "Separação", text: "Iniciar Separação", icon: Package, variant: "secondary" },
  em_separacao: { next: "em_transporte", label: "Transporte", text: "Despachar Pedido", icon: Truck },
  em_transporte: { next: "entregue", label: "Entregue", text: "Confirmar Entrega", icon: CheckCircle, variant: "outline", className: "border-green-200 text-green-700 hover:bg-green-50" },
  entregue: { next: "concluido", label: "Concluído", text: "Concluir Pedido", icon: Flag, className: "bg-green-600 hover:bg-green-700" },
};

export function OrderSellerActions({ order }: OrderSellerActionsProps) {
  const update = useUpdateOrder(order.id, order.status);

  const handleStatusChange = (nextStatus: OrderRow["status"], label: string) => {
    update.mutate({ status: nextStatus }, {
      onSuccess: () => {
        toast.success(`Pedido em ${label}`);
      }
    });
  };

  const currentStatus = order.status;
  const action = ACTIONS[currentStatus];
  const ActionIcon = action?.icon;

  return (
    <div className="flex flex-wrap gap-2 items-center bg-muted/30 p-3 rounded-lg border border-muted">
      <span className="text-xs font-semibold mr-2 text-muted-foreground uppercase">Ações do Vendedor:</span>
      
      {action && ActionIcon && <Button size="sm" variant={action.variant} className={action.className}
        onClick={() => handleStatusChange(action.next, action.label)} disabled={update.isPending}>
        <ActionIcon className="h-4 w-4 mr-2" /> {action.text}
      </Button>}

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
