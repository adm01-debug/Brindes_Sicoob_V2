import { Badge } from "@/components/ui/badge";
import { OrderStatus, ORDER_STATUS_CONFIG } from "@/types/sicoob/orders";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export const OrderStatusBadge = ({ status }: OrderStatusBadgeProps) => {
  const config = ORDER_STATUS_CONFIG[status] || { label: status, className: "" };
  
  return (
    <Badge variant="secondary" className={config.className}>
      {config.label}
    </Badge>
  );
};