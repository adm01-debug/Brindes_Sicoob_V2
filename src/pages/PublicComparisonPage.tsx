/**
 * PublicComparisonPage — Visualização pública de uma comparação via /comparar-publica/:token
 * Read-only, sem auth, com reactions anônimas.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { fetchPromobrindProducts } from '@/lib/external-db';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { GitCompare, Sparkles, Heart, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import type { CompareItem } from '@/stores/useComparisonStore';

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

const EMOJIS = ['👍', '❤️', '🔥', '💡'] as const;

function parseCompareItems(value: unknown): CompareItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CompareItem => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<CompareItem>;
    return typeof candidate.productId === 'string';
  });
}

function getOrCreateAnonId(): string {
  const KEY = 'pg_anon_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(KEY, id);
  }
  return id;
}

function ProductImage({ image, name }: { image?: string; name?: string }) {
  return (
    <div className="aspect-square overflow-hidden bg-muted">
      {image ? (
        <img
          src={image}
          alt={name ?? 'Produto'}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
          <Package className="h-10 w-10" />
        </div>
      )}
    </div>
  );
}

function ProductVariant({ item }: { item: CompareItem }) {
  if (!item.variant?.color_name) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {item.variant.color_hex && (
        <span
          className="h-3 w-3 rounded-full border border-border"
          style={{ backgroundColor: item.variant.color_hex }}
        />
      )}
      {item.variant.color_name}
    </p>
  );
}

function ReactionButtons({
  counts,
  react,
}: {
  counts?: Map<string, number>;
  react: (emoji: string) => void;
}) {
  return (
    <div className="mt-auto flex items-center gap-1 border-t border-border pt-2">
      {EMOJIS.map((emoji) => {
        const count = counts?.get(emoji) ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => react(emoji)}
            className="flex items-center gap-0.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-accent"
            aria-label={`Reagir com ${emoji}`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="text-[10px] tabular-nums text-muted-foreground">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PublicProductCard({
  item,
  index,
  product,
  counts,
  sendReaction,
}: {
  item: CompareItem;
  index: number;
  product?: ProductDetail;
  counts?: Map<string, number>;
  sendReaction: (index: number, emoji: string) => void;
}) {
  const image = item.variant?.thumbnail || product?.images?.[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <ProductImage image={image} name={product?.name} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">
          {product?.name ?? 'Produto'}
        </h3>
        {product?.price ? (
          <p className="font-display text-lg font-bold text-primary">
            {formatCurrency(product.price)}
          </p>
        ) : null}
        <ProductVariant item={item} />
        <ReactionButtons
          counts={counts}
          react={(emoji) => {
            void sendReaction(index, emoji);
          }}
        />
      </div>
    </article>
  );
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
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data: cmp, error: cErr } = await supabase
        .from('user_comparisons')
        .select('id, client_name, share_expires_at, is_public, items')
        .eq('share_token', token)
        .maybeSingle();

      if (!mounted) return;
      if (cErr || !cmp || !cmp.is_public) {
        setError('Comparação não encontrada ou link inválido.');
        setLoading(false);
        return;
      }
      if (cmp.share_expires_at && new Date(cmp.share_expires_at) < new Date()) {
        setError('Este link expirou.');
        setLoading(false);
        return;
      }

      const items = parseCompareItems(cmp.items);
      setComparison({
        id: cmp.id,
        client_name: cmp.client_name,
        share_expires_at: cmp.share_expires_at,
        items,
      });

      const productIds = [...new Set(items.map((i) => i.productId))];
      if (productIds.length > 0) {
        // Produtos vêm do catálogo externo (Promobrind), não do banco operacional —
        // a tabela local "products" não existe. Ver docs/execucao/evidencias/products_companies_fix_20260917.md
        const prods = await fetchPromobrindProducts({
          filters: { id: productIds },
          limit: productIds.length,
        }).catch(() => []);
        const pMap = new Map<string, ProductDetail>();
        prods.forEach((p) =>
          pMap.set(p.id, {
            id: p.id,
            name: p.name,
            price: p.sale_price ?? null,
            images: p.images,
            sku: p.sku,
          }),
        );
        setProducts(pMap);
      }

      const { data: reacts } = await supabase
        .from('comparison_reactions')
        .select('item_index, emoji')
        .eq('comparison_id', cmp.id);
      const rMap = new Map<number, Map<string, number>>();
      (reacts ?? []).forEach((r: { item_index: number; emoji: string }) => {
        const counts = rMap.get(r.item_index) ?? new Map<string, number>();
        counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
        rMap.set(r.item_index, counts);
      });
      setReactions(rMap);

      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const sendReaction = async (itemIndex: number, emoji: string) => {
    if (!token || !comparison) return;
    const log = createClientLogger('comparison.publicShare');
    log.info('reaction_start', { itemIndex, emoji });
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/comparisons-public-react`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...log.headers() },
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
          toast.error('Muitas reações em pouco tempo. Aguarde um instante.');
        } else {
          log.warn('reaction_failed', { status: res.status, body });
          toast.error(body.error || 'Falha ao reagir');
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
      toast.success('Obrigado pelo feedback!');
    } catch (err) {
      log.error('reaction_exception', { err });
      toast.error('Erro de conexão');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !comparison) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <GitCompare className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-2 font-display text-2xl font-bold">Link indisponível</h1>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button asChild variant="outline">
            <a href="/">Ir para o início</a>
          </Button>
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

      <header className="sticky top-0 z-10 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <GitCompare className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
              Comparação de Produtos
            </h1>
            {comparison.client_name && comparison.client_name !== 'current' && (
              <p className="mt-0.5 text-xs font-medium text-primary">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Curadoria para {comparison.client_name}
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {comparison.items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">Esta comparação está vazia.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {comparison.items.map((item, index) => {
              const product = products.get(item.productId);
              return (
                <PublicProductCard
                  key={`${item.productId}-${index}`}
                  item={item}
                  index={index}
                  product={product}
                  counts={reactions.get(index)}
                  sendReaction={sendReaction}
                />
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <Heart className="mr-1 inline h-3 w-3 text-primary" />
        Comparação compartilhada via Brindes Sicoob
      </footer>
    </div>
  );
}
