import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderRow } from "@/types/orders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, FULFILLMENT_LABELS, FULFILLMENT_COLORS } from "@/constants/orders";
import { exportToPDF } from "@/utils/orderExportUtils";

interface OrderDetailHeaderProps {
  order: OrderRow;
  items: any[];
}

export function OrderDetailHeader({ order, items }: OrderDetailHeaderProps) {
  const navigate = useNavigate();
  
  const scColor = ORDER_STATUS_COLORS[order.status] || "";
  const scLabel = ORDER_STATUS_LABELS[order.status] || order.status;
  const fcColor = FULFILLMENT_COLORS[order.fulfillment_status] || "";
  const fcLabel = FULFILLMENT_LABELS[order.fulfillment_status] || order.fulfillment_status;

  const handleExport = () => {
    const data = {
      items: items.map(it => ({
        ...it,
        total: (it.quantity || 0) * (it.unit_price || 0)
      })),
      filename: `pedido_${order.order_number}`,
      columns: [
        { header: "Produto", key: "product_name" },
        { header: "SKU", key: "product_sku" },
        { header: "Qtd", key: "quantity" },
        { header: "Preço", key: "unit_price" },
        { header: "Subtotal", key: "total" },
      ]
    };
    exportToPDF(data as any);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => navigate("/pedidos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
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
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>
    </div>
  );
}
