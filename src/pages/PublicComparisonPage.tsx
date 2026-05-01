/**
 * PublicComparisonPage — Visualização pública de uma comparação via /comparar-publica/:token
 * Read-only, sem auth, com reactions anônimas.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GitCompare, Sparkles, Heart, Package } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import type { CompareItem } from "@/stores/useComparisonStore";

interface PublicComparison {
  id: string;
  client_name: string | null;
  share_expires_at: string | null;
  items: CompareItem[];
}

interface ProductDetail {
  id: string;
  name: string;
  price: number | null;
  images: string[] | null;
  sku: string | null;
}

const EMOJIS = ["👍", "❤️", "🔥", "💡"] as const;

function getOrCreateAnonId(): string {
  const KEY = "pg_anon_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(KEY, id);
  }
  return id;
}

export default function PublicComparisonPage() {
  const { token } = useParams<{ token: string }>();
  const [comparison, setComparison] = useState<PublicComparison | null>(null);
  const [products, setProducts] = useState<Map<string, ProductDetail>>(new Map());
  const [reactions, setReactions] = useState<Map<number, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const anonId = useMemo(() => getOrCreateAnonId(), []);

  useEffect(() => {
    if (!token) { setError("Token inválido"); setLoading(false); return; }
    let mounted = true;
    (async () => {
      const { data: cmp, error: cErr } = await supabase
        .from("user_comparisons")
        .select("id, client_name, share_expires_at, is_public, items")
        .eq("share_token", token)
        .maybeSingle();

      if (!mounted) return;
      if (cErr || !cmp || !cmp.is_public) {
        setError("Comparação não encontrada ou link inválido.");
        setLoading(false);
        return;
      }
      if (cmp.share_expires_at && new Date(cmp.share_expires_at) < new Date()) {
        setError("Este link expirou.");
        setLoading(false);
        return;
      }

      const items = (cmp.items as CompareItem[]) ?? [];
      setComparison({
        id: cmp.id,
        client_name: cmp.client_name,
        share_expires_at: cmp.share_expires_at,
        items,
      });

      const productIds = [...new Set(items.map(i => i.productId))];
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, price, images, sku")
          .in("id", productIds);
        const pMap = new Map<string, ProductDetail>();
        (prods ?? []).forEach((p: ProductDetail) => pMap.set(p.id, p));
        setProducts(pMap);
      }

      const { data: reacts } = await supabase
        .from("comparison_reactions")
        .select("item_index, emoji")
        .eq("comparison_id", cmp.id);
      const rMap = new Map<number, Map<string, number>>();
      (reacts ?? []).forEach((r: { item_index: number; emoji: string }) => {
        if (!rMap.has(r.item_index)) rMap.set(r.item_index, new Map());
        const m = rMap.get(r.item_index)!;
        m.set(r.emoji, (m.get(r.emoji) ?? 0) + 1);
      });
      setReactions(rMap);

      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [token]);

  const sendReaction = async (itemIndex: number, emoji: string) => {
    if (!token || !comparison) return;
    const log = createClientLogger('comparison.publicShare');
    log.info('reaction_start', { itemIndex, emoji });
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/comparisons-public-react`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...log.headers() },
        body: JSON.stringify({
          share_token: token,
          comparison_id: comparison.id,
          item_index: itemIndex,
          emoji,
          anon_id: anonId,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) {
          log.warn('reaction_rate_limited', { status: 429 });
          toast.error("Muitas reações em pouco tempo. Aguarde um instante.");
        } else {
          log.warn('reaction_failed', { status: res.status, body });
          toast.error(body.error || "Falha ao reagir");
        }
        return;
      }
      setReactions((prev) => {
        const next = new Map(prev);
        const m = new Map(next.get(itemIndex) ?? new Map<string, number>());
        m.set(emoji, (m.get(emoji) ?? 0) + 1);
        next.set(itemIndex, m);
        return next;
      });
      log.info('reaction_ok', { itemIndex, emoji });
      toast.success("Obrigado pelo feedback!");
    } catch (err) {
      log.error('reaction_exception', { err });
      toast.error("Erro de conexão");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <GitCompare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Link indisponível</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild variant="outline"><a href="/">Ir para o início</a></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Comparação compartilhada — Brindes Sicoob</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
            <GitCompare className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Comparação de Produtos
            </h1>
            {comparison.client_name && comparison.client_name !== "current" && (
              <p className="text-xs text-primary font-medium mt-0.5">
                <Sparkles className="h-3 w-3 inline mr-1" />
                Curadoria para {comparison.client_name}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {comparison.items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            Esta comparação está vazia.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparison.items.map((item, idx) => {
              const product = products.get(item.productId);
              const img = item.variant?.thumbnail || product?.images?.[0];
              const reactionMap = reactions.get(idx);
              return (
                <article key={`${item.productId}-${idx}`} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-muted overflow-hidden">
                    {img ? (
                      <img src={img} alt={product?.name ?? "Produto"} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-2">
                    <h3 className="font-medium text-sm line-clamp-2 leading-tight">{product?.name ?? "Produto"}</h3>
                    {product?.price ? (
                      <p className="font-display text-lg font-bold text-primary">{formatCurrency(product.price)}</p>
                    ) : null}
                    {item.variant?.color_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {item.variant.color_hex && (
                          <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: item.variant.color_hex }} />
                        )}
                        {item.variant.color_name}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-auto pt-2 border-t border-border">
                      {EMOJIS.map((e) => {
                        const count = reactionMap?.get(e) ?? 0;
                        return (
                          <button
                            key={e}
                            type="button"
                            onClick={() => sendReaction(idx, e)}
                            className="flex items-center gap-0.5 px-2 py-1 rounded-md hover:bg-accent transition-colors text-sm"
                            aria-label={`Reagir com ${e}`}
                          >
                            <span>{e}</span>
                            {count > 0 && <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <Heart className="h-3 w-3 inline mr-1 text-primary" />
        Comparação compartilhada via Brindes Sicoob
      </footer>
    </div>
  );
}
