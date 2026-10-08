/**
 * BundleSuggestionCard — sugere produtos comumente orçados juntos com o produto-âncora.
 * Consulta histórico de quote_items via RPC `get_bundle_suggestions(_product_id)`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Plus } from "lucide-react";

interface BundleSuggestion {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  cooccurrence_count: number;
  frequency_percent: number;
}

interface BundleSuggestionCardProps {
  productId: string;
  onAdd?: (suggestion: BundleSuggestion) => void;
  className?: string;
}

export function BundleSuggestionCard({ productId, onAdd, className }: BundleSuggestionCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["bundle-suggestions", productId],
    enabled: !!productId,
    queryFn: async (): Promise<BundleSuggestion[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_bundle_suggestions", {
        _product_id: productId,
      });
      if (error) {
        console.warn("get_bundle_suggestions error:", error);
        return [];
      }
      return (data ?? []) as BundleSuggestion[];
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!isLoading && !data?.length) return null;

  return (
    <Card className={`border-primary/20 ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Frequentemente orçado em conjunto
        </CardTitle>
        <CardDescription className="text-xs">
          Vendedores que orçaram este produto também incluíram:
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)
        ) : (
          (data ?? []).map(item => (
            <div
              key={item.product_id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              {item.product_image_url ? (
                <img
                  src={item.product_image_url}
                  alt={item.product_name}
                  className="w-10 h-10 rounded object-cover bg-muted"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.product_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.frequency_percent}% das vezes · {item.cooccurrence_count}x
                </p>
              </div>
              {onAdd && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 shrink-0"
                  onClick={() => onAdd(item)}
                  aria-label={`Adicionar ${item.product_name}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
