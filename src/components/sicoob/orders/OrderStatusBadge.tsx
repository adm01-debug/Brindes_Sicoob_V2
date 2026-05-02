import React from "react";
import { Badge } from "@/components/ui/badge";
import { OrderStatus, ORDER_STATUS_CONFIG } from "@/types/sicoob/orders";

interface OrderStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: OrderStatus;
}

export const OrderStatusBadge = React.forwardRef<HTMLDivElement, OrderStatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const config = ORDER_STATUS_CONFIG[status] || { label: status, className: "" };
    
    return (
      <Badge 
        ref={ref}
        variant="secondary" 
        className={`${config.className} ${className || ""}`}
        {...props}
      >
        {config.label}
      </Badge>
    );
  }
);

OrderStatusBadge.displayName = "OrderStatusBadge";
