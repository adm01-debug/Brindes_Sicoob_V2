import { useState } from "react";
import { Layers, Plus, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/quote-calculations";
import { cn } from "@/lib/utils";

interface Props {
  singularId: string | null;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("singular_id", singularId!)
        .eq("status", "approved_singular")
        .is("consolidation_id", null);
      if (error) throw error;
      return data;
    },
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
      // 1. Create consolidation record
      const { data: consolidation, error: consErr } = await supabase
        .from("quote_consolidations")
        .insert({
          singular_id: singularId,
          status: "pending",
          notes: `Consolidação de ${selectedQuoteIds.length} orçamentos.`
        })
        .select()
        .single();

      if (consErr) throw consErr;

      // 2. Link quotes to it
      const { error: updErr } = await supabase
        .from("quotes")
        .update({ consolidation_id: consolidation.id } as any)
        .in("id", selectedQuoteIds);

      if (updErr) throw updErr;

      toast.success("Orçamentos consolidados com sucesso!");
      setSelectedQuoteIds([]);
      qc.invalidateQueries({ queryKey: ["quotes"] });
    } catch (err) {
      toast.error("Erro ao consolidar orçamentos");
    } finally {
      setIsConsolidating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">Disponíveis para Consolidação</h3>
          <Badge variant="secondary">{pendingQuotes?.length || 0} orçamentos</Badge>
        </div>
        <ScrollArea className="h-[400px] border border-border/50 rounded-2xl bg-card/30 p-4">
          <div className="space-y-3">
            {isLoading ? (
              <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : !pendingQuotes?.length ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Nenhum orçamento aprovado pendente de consolidação.</div>
            ) : (
              pendingQuotes.map((q) => (
                <Card 
                  key={q.id} 
                  className={cn(
                    "cursor-pointer transition-all border-border/60",
                    selectedQuoteIds.includes(q.id) ? "ring-2 ring-primary border-primary/50 bg-primary/5" : "hover:border-border"
                  )}
                  onClick={() => toggleQuoteSelection(q.id)}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">#{q.quote_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{q.client_company}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(q.total || 0)}</p>
                      <p className="text-[10px] text-muted-foreground">Pendente</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg">Grupo de Compra Selecionado</h3>
          <Badge variant="outline">{selectedQuoteIds.length} selecionados</Badge>
        </div>
        <Card className="border-2 border-primary/20 bg-primary/[0.02] h-[400px] flex flex-col">
          <CardContent className="p-4 flex flex-col h-full">
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {selectedQuoteIds.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                  <Plus className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-xs">Selecione orçamentos ao lado para iniciar a consolidação.</p>
                </div>
              ) : (
                selectedQuoteIds.map(id => {
                  const q = pendingQuotes?.find(item => item.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-card border border-border/40 text-xs">
                      <span className="font-medium">#{q?.quote_number}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => toggleQuoteSelection(id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-primary/10 mt-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Subtotal Consolidado</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(pendingQuotes?.filter(q => selectedQuoteIds.includes(q.id)).reduce((s, q) => s + (q.total || 0), 0) || 0)}
                </span>
              </div>
              <Button 
                className="w-full h-11 gap-2" 
                disabled={selectedQuoteIds.length < 2 || isConsolidating}
                onClick={handleConsolidate}
              >
                {isConsolidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Consolidar Pedidos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
