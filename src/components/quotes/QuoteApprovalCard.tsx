/**
 * QuoteApprovalCard — card de visualização pública do orçamento para o cliente aprovar/recusar.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { PublicQuoteApproval } from "@/hooks/useQuoteApprovalToken";

interface QuoteApprovalCardProps {
  quoteNumber: string;
  clientName?: string | null;
  total: number;
  validUntil?: string | null;
  status: string;
  onApprove?: () => void;
  onReject?: () => void;
  isResponded?: boolean;
  items?: PublicQuoteApproval["items"];
  paymentTerms?: string | null;
  deliveryTime?: string | null;
  shippingCost?: number | null;
  notes?: string | null;
}

const PUBLIC_STATUS_LABELS: Record<string, string> = {
  active: "Aguardando resposta",
  responded: "Respondido",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
  revoked: "Revogado",
  pending: "Pendente",
  sent: "Enviado",
  viewed: "Visualizado",
  revision: "Em revisão",
};

function QuoteItems({ items }: { items?: PublicQuoteApproval["items"] }) {
  if (!items?.length) return null;
  return (
    <div className="space-y-2" aria-label="Itens do orçamento">
      <p className="text-sm font-semibold">Itens</p>
      {items.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border p-3 text-sm">
          <div>
            <p className="font-medium">{item.product_name}</p>
            <p className="text-xs text-muted-foreground">
              {[item.product_sku, item.color_name, item.size_code].filter(Boolean).join(" · ")}
            </p>
            <p className="text-xs text-muted-foreground">{item.quantity} × R$ {Number(item.unit_price).toFixed(2)}</p>
            {!!item.personalizations?.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                Personalização: {item.personalizations.map((personalization) =>
                  personalization.notes || `${personalization.colors_count ?? 1} cor(es), ${personalization.positions_count ?? 1} posição(ões)`
                ).join("; ")}
              </p>
            )}
          </div>
          <span className="font-semibold whitespace-nowrap">R$ {Number(item.subtotal).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

function CommercialTerms({ paymentTerms, deliveryTime, shippingCost, notes }: Pick<QuoteApprovalCardProps, "paymentTerms" | "deliveryTime" | "shippingCost" | "notes">) {
  if (!paymentTerms && !deliveryTime && !(Number(shippingCost) > 0) && !notes) return null;
  return (
    <div className="grid gap-2 rounded-lg border p-4 text-sm">
      {paymentTerms && <p><span className="font-medium">Pagamento:</span> {paymentTerms}</p>}
      {deliveryTime && <p><span className="font-medium">Prazo:</span> {deliveryTime}</p>}
      {Number(shippingCost) > 0 && <p><span className="font-medium">Frete:</span> R$ {Number(shippingCost).toFixed(2)}</p>}
      {notes && <p><span className="font-medium">Observações:</span> {notes}</p>}
    </div>
  );
}

export function QuoteApprovalCard(props: QuoteApprovalCardProps) {
  const { quoteNumber, clientName, total, validUntil, status, onApprove, onReject, isResponded,
    items, paymentTerms, deliveryTime, shippingCost, notes } = props;
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Orçamento {quoteNumber}</CardTitle>
            {clientName && <p className="text-sm text-muted-foreground mt-1">Para: {clientName}</p>}
          </div>
          <Badge variant={status === "approved" ? "default" : status === "rejected" ? "destructive" : "secondary"}>
            {PUBLIC_STATUS_LABELS[status] ?? "Status indisponível"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Valor total</p>
          <p className="text-3xl font-semibold text-primary">R$ {total.toFixed(2)}</p>
        </div>
        <QuoteItems items={items} />
        <CommercialTerms paymentTerms={paymentTerms} deliveryTime={deliveryTime} shippingCost={shippingCost} notes={notes} />
        {validUntil && (
          <p className="text-sm text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> Válido até {new Date(validUntil).toLocaleDateString("pt-BR")}
          </p>
        )}
        {!isResponded && (onApprove || onReject) && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="outline" onClick={onReject} className="border-destructive/50 text-destructive hover:bg-destructive/10">
              <XCircle className="h-4 w-4 mr-2" /> Recusar
            </Button>
            <Button onClick={onApprove}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
