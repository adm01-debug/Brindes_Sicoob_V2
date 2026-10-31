import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type OrderItem, type OrderRow } from "@/types/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, FULFILLMENT_LABELS, FULFILLMENT_COLORS } from "@/constants/orders";
import { exportToPDF } from "@/utils/orderExportUtils";

interface OrderDetailHeaderProps {
  order: OrderRow;
  items: OrderItem[];
}

function exportOrderItems(order: OrderRow, items: OrderItem[]) {
  const rows = items.map((item) => ({
    ...item,
    total: (item.quantity ?? 0) * (item.unit_price ?? 0),
  }));
  exportToPDF(rows, `pedido_${order.order_number}`);
}

export function OrderDetailHeader({ order, items }: OrderDetailHeaderProps) {
  const navigate = useNavigate();
  
  const scColor = ORDER_STATUS_COLORS[order.status] || "";
  const scLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const fcColor = FULFILLMENT_COLORS[order.fulfillment_status] || "";
  const fcLabel = FULFILLMENT_LABELS[order.fulfillment_status] || order.fulfillment_status;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate("/pedidos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Pedido #{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            Criado em {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={scColor}>{scLabel}</Badge>
        <Badge variant="outline" className={fcColor}>{fcLabel}</Badge>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => exportOrderItems(order, items)}>
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>
    </div>
  );
}
