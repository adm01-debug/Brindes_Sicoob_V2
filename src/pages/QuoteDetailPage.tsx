/**
 * QuoteDetailPage — detalhe completo de um orçamento (itens, histórico, comentários, versões).
 * Inclui banner read-only quando convertido em pedido + badge de pedido vinculado.
 */
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuoteHistoryTimeline } from '@/components/quotes/QuoteHistoryTimeline';
import { QuoteApprovalNotes } from '@/components/quotes/QuoteApprovalNotes';
import { QuoteCommentsThread } from '@/components/quotes/QuoteCommentsThread';
import { QuoteVersionsList } from '@/components/quotes/QuoteVersionsList';
import { QuoteOrderBadge } from '@/components/quotes/QuoteOrderBadge';
import { QuoteConvertToOrder } from '@/components/quotes/QuoteConvertToOrder';
import { QuoteSingularApprovalActions } from '@/components/quotes/QuoteSingularApprovalActions';
import { QuoteManagerApprovalBanner } from '@/components/quotes/QuoteManagerApprovalBanner';
import { QUOTE_STATUS_CONFIG } from '@/lib/quote-status-config';
import { PageSEO } from '@/components/seo/PageSEO';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';

async function fetchQuote(id: string | undefined) {
  if (!id) return null;
  // rls-allow: lookup por id; RLS valida ownership
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

type QuoteDetail = NonNullable<Awaited<ReturnType<typeof fetchQuote>>>;

function QuoteDetailHeader({
  quote,
  onConverted,
}: {
  quote: QuoteDetail;
  onConverted: () => void;
}) {
  const status = QUOTE_STATUS_CONFIG[quote.status];
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold">Orçamento {quote.quote_number}</h1>
          <QuoteOrderBadge quoteId={quote.id} />
        </div>
        <p className="text-sm text-muted-foreground">
          {quote.client_name || quote.client_company || 'Sem cliente'} · R${' '}
          {Number(quote.total ?? 0).toFixed(2)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={status?.badgeVariant || 'outline'} className={status?.badgeClassName}>
          {status?.label || quote.status}
        </Badge>
        <QuoteConvertToOrder quoteId={quote.id} status={quote.status} onConverted={onConverted} />
      </div>
    </header>
  );
}

function ConvertedQuoteNotice({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-success" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-success">Orçamento convertido em pedido</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Este orçamento está em modo somente leitura. Para alterações, edite o pedido vinculado.
        </p>
      </div>
    </div>
  );
}

function QuoteDetailTabs({ quote }: { quote: QuoteDetail }) {
  return (
    <Tabs defaultValue="history">
      <TabsList>
        <TabsTrigger value="history">Histórico</TabsTrigger>
        <TabsTrigger value="comments">Comentários</TabsTrigger>
        <TabsTrigger value="versions">Versões</TabsTrigger>
      </TabsList>
      <TabsContent value="history" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linha do tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteHistoryTimeline quoteId={quote.id} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="comments" className="mt-4">
        <Card>
          <CardContent className="pt-6">
            <QuoteCommentsThread quoteId={quote.id} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="versions" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Versões</CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteVersionsList quoteId={quote.id} parentQuoteId={quote.parent_quote_id} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function QuoteDetails({ quote, onRefresh }: { quote: QuoteDetail; onRefresh: () => void }) {
  return (
    <TooltipProvider>
      <div className="container mx-auto max-w-5xl space-y-6 p-6">
        <PageSEO title={`Orçamento ${quote.quote_number}`} description="Detalhes do orçamento" />
        <QuoteDetailHeader quote={quote} onConverted={onRefresh} />
        <QuoteApprovalNotes notes={quote.rejection_notes} status={quote.status} />
        <QuoteSingularApprovalActions
          quoteId={quote.id}
          status={quote.status}
          quoteNumber={quote.quote_number}
          onActionComplete={onRefresh}
        />
        <QuoteManagerApprovalBanner
          quoteId={quote.id}
          status={quote.status}
          realDiscountPercent={quote.real_discount_percent ?? undefined}
          maxDiscountPercent={10}
          onActionComplete={onRefresh}
        />
        <ConvertedQuoteNotice visible={quote.status === 'converted'} />
        <QuoteDetailTabs quote={quote} />
      </div>
    </TooltipProvider>
  );
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: quote,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['quote', id],
    enabled: !!id,
    queryFn: () => fetchQuote(id),
  });

  if (isLoading) return <Skeleton className="m-6 h-96" />;
  if (!quote)
    return <p className="p-6 text-center text-muted-foreground">Orçamento não encontrado.</p>;

  return <QuoteDetails quote={quote} onRefresh={() => refetch()} />;
}
