/**
 * PublicQuoteApprovalPage — Refactored orchestrator.
 * Logic in usePublicQuoteApproval, status screens in PublicQuoteStatusScreens.
 */
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CheckCircle, XCircle, User, Phone, Mail, Loader2,
  CreditCard, Calendar, Clock, ShieldCheck, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePublicQuoteApproval, calcPersonalizationTotal } from "./public-approval/usePublicQuoteApproval";
import { PublicQuoteItemsList, PublicQuoteTotals } from "./public-approval/PublicQuoteItems";
import {
  LoadingScreen, ExpiredScreen, AlreadyRespondedScreen,
  ErrorScreen, SubmittedScreen,
} from "./public-approval/PublicQuoteStatusScreens";

export default function PublicQuoteApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const state = usePublicQuoteApproval(token);

  if (state.isLoading) return <LoadingScreen />;
  if (state.isExpired) return <ExpiredScreen />;
  if (state.alreadyResponded) return <AlreadyRespondedScreen data={state.alreadyResponded} />;
  if (state.error || !state.data) return <ErrorScreen error={state.error} />;
  if (state.submitted) return <SubmittedScreen response={state.submitted} receipt={state.signatureReceipt} />;

  const { quote, seller } = state.data;
  const items = quote.items || [];

  const subtotal = items.reduce((sum: number, item: any) =>
    sum + item.quantity * item.unit_price + calcPersonalizationTotal(item), 0);

  const discountAmount = quote.discount_percent
    ? subtotal * (quote.discount_percent / 100)
    : quote.discount_amount || 0;

  const shippingCost =
    quote.shipping_type === "fob" || quote.shipping_type === "fob_pre"
      ? quote.shipping_cost || 0
      : 0;

  const total = subtotal - discountAmount + shippingCost;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Proposta #{quote.quote_number} | Sicoob</title>
        <meta name="description" content={`Proposta comercial #${quote.quote_number} para aprovação`} />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Proposta Comercial</h1>
              <p className="text-muted-foreground mt-1">#{quote.quote_number}</p>
            </div>
            {quote.valid_until && (
              <Badge variant="outline" className="gap-1.5">
                <Clock className="h-3 w-3" />
                Válido até {format(new Date(quote.valid_until), "dd/MM/yyyy", { locale: ptBR })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Seller Info */}
        {seller && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={seller.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(seller.full_name || "V").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{seller.full_name || "Vendedor"}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                    {seller.email && (
                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {seller.email}</span>
                    )}
                    {seller.phone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {seller.phone}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Info */}
        {(quote.client_name || quote.client_company) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Destinatário
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {quote.client_name && <p className="font-medium">{quote.client_name}</p>}
              {quote.client_company && <p className="text-muted-foreground">{quote.client_company}</p>}
            </CardContent>
          </Card>
        )}

        <PublicQuoteItemsList items={items} />
        <PublicQuoteTotals
          subtotal={subtotal}
          discountAmount={discountAmount}
          discountPercent={quote.discount_percent}
          shippingCost={shippingCost}
          shippingType={quote.shipping_type}
          total={total}
        />

        {/* Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quote.payment_terms && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Condições de Pagamento
                </div>
                <p className="text-sm text-muted-foreground">{quote.payment_terms}</p>
              </CardContent>
            </Card>
          )}
          {quote.delivery_time && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  Prazo de Entrega
                </div>
                <p className="text-sm text-muted-foreground">
                  {quote.delivery_time.startsWith("date:")
                    ? `Entrega até ${format(new Date(quote.delivery_time.replace("date:", "")), "dd/MM/yyyy")}`
                    : quote.delivery_time}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {quote.notes && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-1">Observações</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Response Section with Electronic Signature */}
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Responder e assinar proposta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* E-signature fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="signer-name" className="text-xs font-medium">
                  Nome completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="signer-name"
                  placeholder="Seu nome completo"
                  value={state.signerName}
                  onChange={(e) => state.setSignerName(e.target.value)}
                  className="bg-background"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signer-doc" className="text-xs font-medium">
                  CPF ou CNPJ <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="signer-doc"
                  placeholder="000.000.000-00"
                  value={state.signerDocument}
                  onChange={(e) => state.setSignerDocument(e.target.value)}
                  className="bg-background"
                  inputMode="numeric"
                />
              </div>
            </div>

            <Label htmlFor="response-notes" className="sr-only">
              Observações ou comentários
            </Label>
            <Textarea
              id="response-notes"
              placeholder="Observações ou comentários (opcional)..."
              value={state.responseNotes}
              onChange={(e) => state.setResponseNotes(e.target.value)}
              className="min-h-[80px] resize-none bg-background"
            />

            <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
              Ao clicar em <strong>Aprovar</strong>, você assina eletronicamente esta proposta. Serão registrados seu nome, documento, IP, navegador, data/hora e um hash de integridade — com validade jurídica conforme MP 2.200-2/2001.
            </p>

            {state.signatureError && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{state.signatureError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => state.handleResponse("approved")}
                disabled={state.isSubmitting}
                className="flex-1 h-12 text-base bg-success hover:bg-success/90 text-success-foreground"
              >
                {state.isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                Aprovar e Assinar
              </Button>
              <Button
                onClick={() => state.handleResponse("rejected")}
                disabled={state.isSubmitting}
                variant="destructive"
                className="flex-1 h-12 text-base"
              >
                {state.isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
                Recusar Proposta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="border-t border-border mt-8 py-6 text-center text-xs text-muted-foreground">
        <p>Proposta gerada automaticamente • Sicoob</p>
      </div>
    </div>
  );
}
