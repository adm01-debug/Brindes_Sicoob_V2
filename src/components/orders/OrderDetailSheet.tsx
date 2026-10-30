import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useOrderDetail } from "@/hooks/orders/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { LogisticsPanel } from "./LogisticsPanel";
import { FinancialPanel } from "./FinancialPanel";
import { OrderAuditTimeline } from "./OrderAuditTimeline";
import { OrderComments } from "./OrderComments";
import { Loader2, Package, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/utils/quote-calculations";
import { useNavigate } from "react-router-dom";

interface OrderDetailSheetProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type OrderDetailData = NonNullable<ReturnType<typeof useOrderDetail>["data"]>;

function OrderSheetHeader({ orderId, data, onAudit }: { orderId: string; data: OrderDetailData | null | undefined; onAudit: () => void }) {
  return (
    <SheetHeader className="p-6 pb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-4 w-4 text-primary" /></div>
          <SheetTitle className="flex items-center gap-2">
            Pedido #{data?.order?.order_number || orderId.slice(0, 8)}
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Ver Auditoria Completa" onClick={onAudit}><ExternalLink className="h-3 w-3" /></Button>
          </SheetTitle>
        </div>
        {data?.order?.status && <Badge>{data.order.status}</Badge>}
      </div>
      <SheetDescription>Detalhes completos e histórico da solicitação.</SheetDescription>
    </SheetHeader>
  );
}

function OrderDetails({ data, orderId }: { data: OrderDetailData; orderId: string }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4"><FinancialPanel order={data.order} /><LogisticsPanel order={data.order} /></div>
        <div className="space-y-4"><OrderAuditTimeline orderId={orderId} /></div>
      </div>
      <div className="space-y-4">
        <h3 className="font-bold text-sm">Itens do Pedido</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="p-2 text-left">Produto</th><th className="p-2 text-center">Qtd</th><th className="p-2 text-right">Unit</th><th className="p-2 text-right">Total</th></tr></thead>
            <tbody className="divide-y">
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td className="p-2 font-medium">{item.product_name || "Produto"}</td>
                  <td className="p-2 text-center">{item.quantity}</td>
                  <td className="p-2 text-right">{formatCurrency(item.unit_price ?? 0)}</td>
                  <td className="p-2 text-right font-bold">{formatCurrency((item.unit_price ?? 0) * (item.quantity ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-4"><h3 className="font-bold text-sm">Comentários e Chat</h3><OrderComments orderId={orderId} /></div>
    </>
  );
}

function OrderSheetBody({ data, orderId, isLoading }: { data: OrderDetailData | null | undefined; orderId: string; isLoading: boolean }) {
  if (isLoading) return <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  if (!data?.order) return <p className="text-center text-muted-foreground py-20">Pedido não encontrado.</p>;
  return <OrderDetails data={data} orderId={orderId} />;
}

export function OrderDetailSheet({ orderId, isOpen, onClose }: OrderDetailSheetProps) {
  const navigate = useNavigate();
  const { data, isLoading } = useOrderDetail(orderId || undefined);

  if (!orderId) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-xl w-[95vw] p-0 flex flex-col">
        <OrderSheetHeader orderId={orderId} data={data} onAudit={() => navigate(`/pedidos/${orderId}/auditoria`)} />

        <Separator />

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <OrderSheetBody data={data} orderId={orderId} isLoading={isLoading} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
