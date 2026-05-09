import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CreateTemplateInput, QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import { Package, User, Calendar, FileText, Info } from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuoteTemplatePreviewProps {
  data: CreateTemplateInput;
}

export function QuoteTemplatePreview({ data }: QuoteTemplatePreviewProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateTotal = () => {
    const itemsTotal = (data.items_data || []).reduce((sum, item) => {
      const itemBase = item.quantity * item.unitPrice;
      const personalizationCost = item.personalizations?.reduce((pSum, p) => {
        return pSum + (p.unitCost || 0) * item.quantity + (p.setupCost || 0);
      }, 0) || 0;
      return sum + itemBase + personalizationCost;
    }, 0);

    const discountValue = data.discount_percent && data.discount_percent > 0
      ? itemsTotal * (data.discount_percent / 100)
      : data.discount_amount || 0;

    return {
      subtotal: itemsTotal,
      total: itemsTotal - discountValue,
      discount: discountValue
    };
  };

  const { subtotal, total, discount } = calculateTotal();

  // Mock data for dynamic variables
  const mockVars = {
    CLIENT_NAME: "Empresa Exemplo Ltda",
    SELLER_NAME: "Vendedor Teste",
    QUOTE_NUMBER: "2026-001",
    EXPIRATION_DATE: format(addDays(new Date(), data.validity_days || 30), "dd/MM/yyyy"),
    SUBTOTAL: formatCurrency(subtotal),
    TOTAL: formatCurrency(total)
  };

  const replaceVars = (text: string | undefined | null) => {
    if (!text) return "";
    let processed = text;
    Object.entries(mockVars).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, "g");
      processed = processed.replace(regex, value);
    });
    return processed;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Live Preview (Como o cliente verá)
        </h4>
        <Badge variant="outline" className="text-[10px] font-normal">
          Simulação
        </Badge>
      </div>

      <Card className="border-dashed bg-muted/30">
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-1">{data.name || "Título do Orçamento"}</CardTitle>
              <div className="text-sm text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Para: {mockVars.CLIENT_NAME}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Validade: {mockVars.EXPIRATION_DATE}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-muted-foreground">ORÇ #{mockVars.QUOTE_NUMBER}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Items */}
          <div className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Itens da Proposta</h5>
            <div className="space-y-2">
              {(data.items_data || []).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} un x {formatCurrency(item.unitPrice)}</p>
                    </div>
                  </div>
                  <span className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description / Notes */}
          {(data.description || data.notes) && (
            <div className="space-y-2 p-3 bg-background rounded-md border text-sm">
              {data.description && <p className="mb-2">{replaceVars(data.description)}</p>}
              {data.notes && <div className="text-muted-foreground whitespace-pre-wrap">{replaceVars(data.notes)}</div>}
            </div>
          )}

          {/* Totals */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Terms */}
          {(data.payment_terms || data.delivery_time) && (
            <div className="text-[11px] text-muted-foreground border-t pt-4 grid grid-cols-2 gap-4">
              {data.payment_terms && (
                <div>
                  <span className="font-semibold block uppercase">Pagamento</span>
                  {replaceVars(data.payment_terms)}
                </div>
              )}
              {data.delivery_time && (
                <div>
                  <span className="font-semibold block uppercase">Entrega</span>
                  {replaceVars(data.delivery_time)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="p-3 bg-primary/5 rounded-md border border-primary/20 flex gap-3 items-start">
        <Info className="h-4 w-4 text-primary mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-primary">Dica: Use variáveis dinâmicas!</p>
          <p>Você pode usar marcadores que serão preenchidos automaticamente: 
            <code className="bg-primary/10 px-1 rounded mx-1">{"{{CLIENT_NAME}}"}</code>, 
            <code className="bg-primary/10 px-1 rounded mx-1">{"{{EXPIRATION_DATE}}"}</code>, 
            <code className="bg-primary/10 px-1 rounded mx-1">{"{{TOTAL}}"}</code>
          </p>
        </div>
      </div>
    </div>
  );
}