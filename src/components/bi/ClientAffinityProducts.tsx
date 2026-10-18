/**
 * ClientAffinityProducts — Zona 2: "O que esse cliente gosta"
 * Usa exclusivamente dados reais de quote_items quando existem.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Info, CheckCircle2 } from "lucide-react";
import { useClientAffinity } from "@/hooks/bi/useClientAffinity";
import { useBICategoryFocus } from "@/contexts/BICategoryFocusContext";
import { resolveBICategory } from "@/lib/bi/categoryResolver";
import { BIProductCard } from "./BIProductCard";
import { useMemo } from "react";

interface Props {
  clientId: string;
}

function AffinityErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="py-8 text-center" role="alert">
      <p className="text-sm text-muted-foreground">Não foi possível consultar o histórico real deste cliente.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Tentar novamente</Button>
    </div>
  );
}

function AffinityBody({ clientId, isLoading, isError, categories, onRetry }: {
  clientId: string;
  isLoading: boolean;
  isError: boolean;
  categories: NonNullable<ReturnType<typeof useClientAffinity>["data"]>["categories"];
  onRetry: () => void;
}) {
  if (isLoading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>;
  if (isError) return <AffinityErrorState onRetry={onRetry} />;
  if (categories.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">As sugestões aparecerão após o primeiro orçamento real deste cliente.</p>;
  return <div className="space-y-5">{categories.map((cat) => (
    <div key={cat.category}>
      <div className="flex items-center justify-between mb-2"><h3 className="font-medium text-sm">{cat.category} <span className="text-muted-foreground font-normal text-xs">· {cat.count} compras</span></h3></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{cat.suggestions.map((suggestion) => (
        <BIProductCard key={suggestion.name} name={suggestion.name} category={cat.category} priceFrom={suggestion.priceFrom} priceTo={suggestion.priceTo} reason={suggestion.reason} variant="affinity" clientId={clientId} imageUrl={suggestion.imageUrl} productId={suggestion.productId} />
      ))}</div>
    </div>
  ))}</div>;
}

export function ClientAffinityProducts({ clientId }: Props) {
  const { data, isLoading, isError, refetch } = useClientAffinity(clientId);
  const { focusedSlug } = useBICategoryFocus();

  const visibleCategories = useMemo(() => {
    const cats = data?.categories ?? [];
    if (!focusedSlug) return cats.slice(0, 3);
    const filtered = cats.filter((c) => resolveBICategory(c.suggestions[0]?.name ?? c.category, c.category).slug === focusedSlug);
    return filtered.length > 0 ? filtered : cats.slice(0, 3);
  }, [data, focusedSlug]);

  return (
    <Card className="border-[1.5px]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold">Produtos das categorias favoritas</h2>
              <p className="text-xs text-muted-foreground">
                {isError
                  ? "Não foi possível confirmar o histórico deste cliente"
                  : data?.isMock
                  ? "Cenário fictício do cliente de demonstração"
                  : data?.realProductsCount
                  ? `Baseado em ${data.realProductsCount} produtos já orçados · agrupados por categoria`
                  : "Sem histórico de produtos orçados para este cliente"}
              </p>
            </div>
          </div>
          {isError ? <Badge variant="destructive" className="gap-1 text-[10px]"><Info className="h-3 w-3" /> Consulta indisponível</Badge> : data &&
            (data.isMock ? (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Info className="h-3 w-3" /> Dados simulados
              </Badge>
            ) : data.realProductsCount === 0 ? (
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Info className="h-3 w-3" /> Sem histórico
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-300 text-[10px]">
                <CheckCircle2 className="h-3 w-3" /> Dados reais
              </Badge>
            ))}
        </div>

        <AffinityBody clientId={clientId} isLoading={isLoading} isError={isError} categories={visibleCategories} onRetry={() => void refetch()} />
      </CardContent>
    </Card>
  );
}
