import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@/types/sicoob/orders";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  pending: { label: "Pendente", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  waiting_approval: { label: "Aguardando Aprovação", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  confirmed: { label: "Confirmado", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  logistic: { label: "Logística", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  rejected: { label: "Rejeitado", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  completed: { label: "Concluído", className: "bg-green-500/10 text-green-500 border-green-500/20" },
};

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const config = STATUS_CONFIG[status] || { label: status, className: "" };
  
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
};
