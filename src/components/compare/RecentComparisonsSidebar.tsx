/**
 * RecentComparisonsSidebar — Sheet lateral com últimas 5 comparações do usuário.
 * Restaura comparação ao clicar; usa RPC get_user_recent_comparisons.
 */
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useComparisonStore, type CompareVariantInfo } from "@/stores/useComparisonStore";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentRow {
  id: string;
  name: string | null;
  client_name: string | null;
  items: Array<{ productId: string; variant?: CompareVariantInfo }>;
  item_count: number;
  updated_at: string;
}

export function RecentComparisonsSidebar() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { clearCompare, addToCompare } = useComparisonStore();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const { data } = await supabase.rpc("get_user_recent_comparisons", { p_limit: 5 });
        setItems((data ?? []) as unknown as RecentRow[]);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const restore = (row: RecentRow) => {
    clearCompare();
    let added = 0;
    (row.items ?? []).slice(0, 4).forEach(it => {
      if (it?.productId && addToCompare(it.productId)) added++;
    });
    toast.success(`${added} produto${added !== 1 ? "s" : ""} restaurado${added !== 1 ? "s" : ""}`);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Recentes
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Comparações recentes
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {loading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}
          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma comparação salva ainda.</p>
          )}
          {items.map(item => (
            <div key={item.id} className="rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors">
              <p className="font-medium text-sm truncate">{item.name || item.client_name || "Sem título"}</p>
              <p className="text-xs text-muted-foreground mb-2">
                {item.item_count ?? item.items?.length ?? 0} produtos · {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true, locale: ptBR })}
              </p>
              <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => restore(item)}>
                <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
