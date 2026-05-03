/**
 * QuoteDetailPage — detalhe completo de um orçamento (itens, histórico, comentários, versões).
 * Inclui banner read-only quando convertido em pedido + badge de pedido vinculado.
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuoteHistoryTimeline } from "@/components/quotes/QuoteHistoryTimeline";
import { QuoteCommentsThread } from "@/components/quotes/QuoteCommentsThread";
import { QuoteVersionsList } from "@/components/quotes/QuoteVersionsList";
import { QuoteOrderBadge } from "@/components/quotes/QuoteOrderBadge";
import { QuoteConvertToOrder } from "@/components/quotes/QuoteConvertToOrder";
import { QuoteSingularApprovalActions } from "@/components/quotes/QuoteSingularApprovalActions";
import { QUOTE_STATUS_CONFIG } from "@/lib/quote-status-config";
import { PageSEO } from "@/components/seo/PageSEO";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: quote, isLoading, refetch } = useQuery({
    queryKey: ["quote", id],
    enabled: !!id,
    queryFn: async () => {
      // rls-allow: lookup por id; RLS valida ownership
      const { data, error } = await supabase.from("quotes").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-96 m-6" />;
  if (!quote) return <p className="p-6 text-center text-muted-foreground">Orçamento não encontrado.</p>;

  const isConverted = quote.status === "converted";

  return (
    <TooltipProvider>
      <div className="container mx-auto max-w-5xl p-6 space-y-6">
        <PageSEO title={`Orçamento ${quote.quote_number}`} description="Detalhes do orçamento" />

        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-semibold">Orçamento {quote.quote_number}</h1>
              <QuoteOrderBadge quoteId={quote.id} />
            </div>
            <p className="text-sm text-muted-foreground">
              {quote.client_name || quote.client_company || "Sem cliente"} · R$ {Number(quote.total ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={QUOTE_STATUS_CONFIG[quote.status]?.badgeVariant || "outline"} className={QUOTE_STATUS_CONFIG[quote.status]?.badgeClassName}>
              {QUOTE_STATUS_CONFIG[quote.status]?.label || quote.status}
            </Badge>
            <QuoteConvertToOrder quoteId={quote.id} status={quote.status} onConverted={() => refetch()} />
          </div>
        </header>

        <QuoteSingularApprovalActions quoteId={quote.id} status={quote.status} onActionComplete={() => refetch()} />

        {isConverted && (
          <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3">
            <Lock className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-success">Orçamento convertido em pedido</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Este orçamento está em modo somente leitura. Para alterações, edite o pedido vinculado.
              </p>
            </div>
          </div>
        )}

        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="comments">Comentários</TabsTrigger>
            <TabsTrigger value="versions">Versões</TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="mt-4">
            <Card><CardHeader><CardTitle className="text-base">Linha do tempo</CardTitle></CardHeader><CardContent><QuoteHistoryTimeline quoteId={quote.id} /></CardContent></Card>
          </TabsContent>
          <TabsContent value="comments" className="mt-4">
            <Card><CardContent className="pt-6"><QuoteCommentsThread quoteId={quote.id} /></CardContent></Card>
          </TabsContent>
          <TabsContent value="versions" className="mt-4">
            <Card><CardHeader><CardTitle className="text-base">Versões</CardTitle></CardHeader><CardContent><QuoteVersionsList quoteId={quote.id} parentQuoteId={quote.parent_quote_id} /></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
