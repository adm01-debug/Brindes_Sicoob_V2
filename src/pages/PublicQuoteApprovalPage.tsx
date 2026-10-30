/**
 * PublicQuoteApprovalPage — Refactored orchestrator.
 * Logic in usePublicQuoteApproval, status screens in PublicQuoteStatusScreens.
 */
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  CheckCircle,
  XCircle,
  User,
  Phone,
  Mail,
  Loader2,
  CreditCard,
  Calendar,
  Clock,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  usePublicQuoteApproval,
  calcPersonalizationTotal,
} from './public-approval/usePublicQuoteApproval';
import { PublicQuoteItemsList, PublicQuoteTotals } from './public-approval/PublicQuoteItems';
import {
  LoadingScreen,
  ExpiredScreen,
  AlreadyRespondedScreen,
  ErrorScreen,
  SubmittedScreen,
} from './public-approval/PublicQuoteStatusScreens';

type ApprovalState = ReturnType<typeof usePublicQuoteApproval>;
type ApprovalData = NonNullable<ApprovalState['data']>;
type ApprovalQuote = ApprovalData['quote'];

function calculateTotals(quote: ApprovalQuote) {
  const items = quote.items || [];
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unit_price + calcPersonalizationTotal(item),
    0,
  );
  const discountAmount = quote.discount_percent
    ? subtotal * (quote.discount_percent / 100)
    : quote.discount_amount || 0;
  const hasShippingCost = quote.shipping_type === 'fob' || quote.shipping_type === 'fob_pre';
  const shippingCost = hasShippingCost ? quote.shipping_cost || 0 : 0;
  return {
    discountAmount,
    shippingCost,
    subtotal,
    total: subtotal - discountAmount + shippingCost,
  };
}

function QuoteHeader({ quote }: { quote: ApprovalQuote }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Proposta Comercial</h1>
            <p className="mt-1 text-muted-foreground">#{quote.quote_number}</p>
          </div>
          {quote.valid_until && (
            <Badge variant="outline" className="gap-1.5">
              <Clock className="h-3 w-3" />
              Válido até {format(new Date(quote.valid_until), 'dd/MM/yyyy', { locale: ptBR })}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

function SellerCard({ seller }: { seller: ApprovalData['seller'] }) {
  if (!seller) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={seller.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {(seller.full_name || 'V').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{seller.full_name || 'Vendedor'}</p>
            <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {seller.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {seller.email}
                </span>
              )}
              {seller.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {seller.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientCard({ quote }: { quote: ApprovalQuote }) {
  if (!quote.client_name && !quote.client_company) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <User className="h-4 w-4 text-primary" />
          Destinatário
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {quote.client_name && <p className="font-medium">{quote.client_name}</p>}
        {quote.client_company && <p className="text-muted-foreground">{quote.client_company}</p>}
      </CardContent>
    </Card>
  );
}

function QuoteTerms({ quote }: { quote: ApprovalQuote }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {quote.payment_terms && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
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
            <div className="mb-1 flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Prazo de Entrega
            </div>
            <p className="text-sm text-muted-foreground">
              {quote.delivery_time.startsWith('date:')
                ? `Entrega até ${format(new Date(quote.delivery_time.replace('date:', '')), 'dd/MM/yyyy')}`
                : quote.delivery_time}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QuoteNotes({ notes }: { notes: string | null }) {
  if (!notes) return null;
  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-1 text-sm font-medium">Observações</p>
        <p className="whitespace-pre-line text-sm text-muted-foreground">{notes}</p>
      </CardContent>
    </Card>
  );
}

function SignatureFields({ state }: { state: ApprovalState }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="signer-name" className="text-xs font-medium">
            Nome completo <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signer-name"
            placeholder="Seu nome completo"
            value={state.signerName}
            onChange={(event) => state.setSignerName(event.target.value)}
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
            onChange={(event) => state.setSignerDocument(event.target.value)}
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
        onChange={(event) => state.setResponseNotes(event.target.value)}
        className="min-h-[80px] resize-none bg-background"
      />
    </>
  );
}

function ResponseButtons({ state }: { state: ApprovalState }) {
  const actionIcon = state.isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null;
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        onClick={() => state.handleResponse('approved')}
        disabled={state.isSubmitting}
        className="h-12 flex-1 bg-success text-base text-success-foreground hover:bg-success/90"
      >
        {actionIcon ?? <CheckCircle className="mr-2 h-5 w-5" />}Aprovar e Assinar
      </Button>
      <Button
        onClick={() => state.handleResponse('rejected')}
        disabled={state.isSubmitting}
        variant="destructive"
        className="h-12 flex-1 text-base"
      >
        {actionIcon ?? <XCircle className="mr-2 h-5 w-5" />}Recusar Proposta
      </Button>
    </div>
  );
}

function ResponseCard({ state }: { state: ApprovalState }) {
  return (
    <Card className="border-2 border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Responder e assinar proposta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignatureFields state={state} />
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
          Ao clicar em <strong>Aprovar</strong>, você assina eletronicamente esta proposta. Serão
          registrados seu nome, documento, IP, navegador, data/hora e um hash de integridade — com
          validade jurídica conforme MP 2.200-2/2001.
        </p>
        {state.signatureError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{state.signatureError}</span>
          </div>
        )}
        <ResponseButtons state={state} />
      </CardContent>
    </Card>
  );
}

function QuoteApproval({ state, data }: { state: ApprovalState; data: ApprovalData }) {
  const { quote, seller } = data;
  const items = quote.items || [];
  const totals = calculateTotals(quote);
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Proposta #{quote.quote_number} | Sicoob</title>
        <meta
          name="description"
          content={`Proposta comercial #${quote.quote_number} para aprovação`}
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <QuoteHeader quote={quote} />
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <SellerCard seller={seller} />
        <ClientCard quote={quote} />
        <PublicQuoteItemsList items={items} />
        <PublicQuoteTotals
          subtotal={totals.subtotal}
          discountAmount={totals.discountAmount}
          discountPercent={quote.discount_percent}
          shippingCost={totals.shippingCost}
          shippingType={quote.shipping_type}
          total={totals.total}
        />
        <QuoteTerms quote={quote} />
        <QuoteNotes notes={quote.notes ?? null} />
        <ResponseCard state={state} />
      </div>
      <div className="mt-8 border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>Proposta gerada automaticamente • Sicoob</p>
      </div>
    </div>
  );
}

export default function PublicQuoteApprovalPage() {
  const { token } = useParams<{ token: string }>();
  const state = usePublicQuoteApproval(token);

  if (state.isLoading) return <LoadingScreen />;
  if (state.isExpired) return <ExpiredScreen />;
  if (state.alreadyResponded) return <AlreadyRespondedScreen data={state.alreadyResponded} />;
  if (state.error || !state.data) return <ErrorScreen error={state.error} />;
  if (state.submitted)
    return <SubmittedScreen response={state.submitted} receipt={state.signatureReceipt} />;

  return <QuoteApproval state={state} data={state.data} />;
}
