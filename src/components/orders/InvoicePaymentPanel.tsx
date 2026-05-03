import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, CreditCard, CheckCircle2 } from "lucide-react";
import { type OrderRow } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";

interface InvoicePaymentPanelProps {
  order: OrderRow;
}

export function InvoicePaymentPanel({ order }: InvoicePaymentPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> NF + Pagamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Nota Fiscal</span>
          </div>
          {(order as any).invoice_number ? (
            <Badge variant="success">{(order as any).invoice_number}</Badge>
          ) : (
            <span className="text-xs text-muted-foreground italic">Pendente</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Pagamento</span>
          </div>
          <Badge variant="outline">{(order as any).payment_status || 'Aguardando'}</Badge>
        </div>

        <div className="p-3 rounded-lg bg-success/5 border border-success/20 flex items-center gap-3">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <p className="text-[11px] text-success-foreground">
            Liberação financeira concluída para produção.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
