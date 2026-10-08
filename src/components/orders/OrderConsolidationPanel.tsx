import { useState } from "react";
import { Plus, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { QuoteService } from "@/services/QuoteService";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/quote-calculations";
import { cn } from "@/lib/utils";

interface Props {
  singularId: string | null;
}

type ConsolidationQuote = Awaited<ReturnType<typeof QuoteService.listToConsolidate>>[number];

async function fetchConsolidationQuotes(singularId: string | null) {
  if (!singularId) return [];
  return QuoteService.listToConsolidate(singularId);
}

function PendingQuotesList({ quotes, loading, selectedIds, onToggle }: { quotes: ConsolidationQuote[] | undefined; loading: boolean; selectedIds: string[]; onToggle: (id: string) => void }) {
  if (loading) return <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;
  if (!quotes?.length) return <div className="py-10 text-center text-muted-foreground text-sm">Nenhum orçamento aprovado pendente de consolidação.</div>;
  return (
    <>{quotes.map((quote) => <Card key={quote.id} className={cn("cursor-pointer transition-all border-border/60", selectedIds.includes(quote.id) ? "ring-2 ring-primary border-primary/50 bg-primary/5" : "hover:border-border")} onClick={() => onToggle(quote.id)}><CardContent className="p-3 flex items-center justify-between gap-4"><div className="min-w-0 flex-1"><p className="text-sm font-bold">#{quote.quote_number}</p><p className="text-xs text-muted-foreground truncate">{quote.client_company}</p></div><div className="text-right"><p className="text-sm font-bold">{formatCurrency(quote.total || 0)}</p><p className="text-[10px] text-muted-foreground">Pendente</p></div></CardContent></Card>)}</>
  );
}

function SelectedQuoteList({ ids, quotes, onRemove }: { ids: string[]; quotes: ConsolidationQuote[] | undefined; onRemove: (id: string) => void }) {
  if (ids.length === 0) return <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground"><Plus className="h-8 w-8 mb-2 opacity-20" /><p className="text-xs">Selecione orçamentos ao lado para iniciar a consolidação.</p></div>;
  return (
    <>{ids.map((id) => { const quote = quotes?.find((item) => item.id === id); return <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40 text-xs"><span className="font-medium">#{quote?.quote_number}</span><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(id)}><Trash2 className="h-3.5 w-3.5" /></Button></div>; })}</>
  );
}

function selectedSubtotal(quotes: ConsolidationQuote[] | undefined, selectedIds: string[]) {
  return (quotes || []).filter((quote) => selectedIds.includes(quote.id)).reduce((sum, quote) => sum + (quote.total || 0), 0);
}

function AvailableQuotesColumn({ quotes, loading, selectedIds, onToggle }: { quotes: ConsolidationQuote[] | undefined; loading: boolean; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="font-display font-bold text-lg">Disponíveis para Consolidação</h3><Badge variant="secondary">{quotes?.length || 0} orçamentos</Badge></div>
      <ScrollArea className="h-[400px] border border-border/50 rounded-2xl bg-card/30 p-4"><div className="space-y-3"><PendingQuotesList quotes={quotes} loading={loading} selectedIds={selectedIds} onToggle={onToggle} /></div></ScrollArea>
    </div>
  );
}

function SelectedQuotesColumn({ quotes, selectedIds, consolidating, onToggle, onConsolidate }: { quotes: ConsolidationQuote[] | undefined; selectedIds: string[]; consolidating: boolean; onToggle: (id: string) => void; onConsolidate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="font-display font-bold text-lg">Grupo de Compra Selecionado</h3><Badge variant="outline">{selectedIds.length} selecionados</Badge></div>
      <Card className="border-2 border-primary/20 bg-primary/[0.02] h-[400px] flex flex-col">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1"><SelectedQuoteList ids={selectedIds} quotes={quotes} onRemove={onToggle} /></div>
          <div className="pt-4 border-t border-primary/10 mt-auto space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm font-medium">Subtotal Consolidado</span><span className="text-lg font-bold text-primary">{formatCurrency(selectedSubtotal(quotes, selectedIds))}</span></div>
            <Button className="w-full h-11 gap-2" disabled={selectedIds.length < 2 || consolidating} onClick={onConsolidate}>{consolidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Consolidar Pedidos</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * OrderConsolidationPanel — Permite ao Gestor consolidar várias solicitações de PAC em um único grupo de compra.
 */
export function OrderConsolidationPanel({ singularId }: Props) {
  const qc = useQueryClient();
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [isConsolidating, setIsConsolidating] = useState(false);

  // Fetch approved quotes that are not yet consolidated
  const { data: pendingQuotes, isLoading } = useQuery({
    queryKey: ["quotes", "to-consolidate", singularId],
    queryFn: () => fetchConsolidationQuotes(singularId),
    enabled: !!singularId,
  });


  const toggleQuoteSelection = (id: string) => {
    setSelectedQuoteIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleConsolidate = async () => {
    if (selectedQuoteIds.length < 2) {
      toast.error("Selecione ao menos 2 orçamentos para consolidar");
      return;
    }

    setIsConsolidating(true);
    try {
      await QuoteService.consolidate({
        singularId,
        quoteIds: selectedQuoteIds,
        notes: `Consolidação de ${selectedQuoteIds.length} orçamentos.`
      });

      toast.success("Orçamentos consolidados com sucesso!");
      setSelectedQuoteIds([]);
      qc.invalidateQueries({ queryKey: ["quotes"] });
    } catch {
      toast.error("Erro ao consolidar orçamentos");
    } finally {
      setIsConsolidating(false);
    }
  };


  return <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><AvailableQuotesColumn quotes={pendingQuotes} loading={isLoading} selectedIds={selectedQuoteIds} onToggle={toggleQuoteSelection} /><SelectedQuotesColumn quotes={pendingQuotes} selectedIds={selectedQuoteIds} consolidating={isConsolidating} onToggle={toggleQuoteSelection} onConsolidate={handleConsolidate} /></div>;
}
