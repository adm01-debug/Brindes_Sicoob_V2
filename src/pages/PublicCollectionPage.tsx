/**
 * PublicCollectionPage — Visualização pública de uma coleção via /colecao-publica/:token
 * Não requer autenticação. Permite reactions anônimas.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { fetchPromobrindProducts } from '@/lib/external-db';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Package, Heart, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface PublicCollection {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  icon_color: string | null;
  client_name: string | null;
  share_expires_at: string | null;
}

interface PublicItem {
  id: string;
  product_id: string;
  color_name: string | null;
  color_hex: string | null;
  thumbnail_url: string | null;
  notes: string | null;
}

interface ProductDetail {
  id: string;
  name: string;
  price: number | null;
  images: string[] | null;
  sku: string | null;
}

const EMOJIS = ['👍', '❤️', '🔥', '💡'] as const;

function getOrCreateAnonId(): string {
  const KEY = 'pg_anon_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(KEY, id);
  }
  return id;
}

async function loadExternalProducts(items: PublicItem[]) {
  const productIds = items.map((item) => item.product_id);
  if (productIds.length === 0) return new Map<string, ProductDetail>();

  const products = await fetchPromobrindProducts({
    filters: { id: productIds },
    limit: productIds.length,
  }).catch(() => []);
  return new Map(
    products.map((product) => [
      product.id,
      {
        id: product.id,
        name: product.name,
        price: product.sale_price ?? null,
        images: product.images,
        sku: product.sku,
      } satisfies ProductDetail,
    ]),
  );
}

async function loadCollectionReactions(items: PublicItem[]) {
  const itemIds = items.map((item) => item.id);
  if (itemIds.length === 0) {
    return new Map<string, Map<string, number>>();
  }

  const { data } = await supabase
    .from('collection_item_reactions')
    .select('item_id, emoji')
    .in('item_id', itemIds);
  const reactions = new Map<string, Map<string, number>>();
  for (const row of data ?? []) {
    const counts = reactions.get(row.item_id) ?? new Map<string, number>();
    counts.set(row.emoji, (counts.get(row.emoji) ?? 0) + 1);
    reactions.set(row.item_id, counts);
  }
  return reactions;
}

async function loadPublicCollection(token: string) {
  const { data: collection, error } = await supabase
    .from('collections')
    .select('id, name, description, icon, icon_color, client_name, share_expires_at, is_public')
    .eq('share_token', token)
    .maybeSingle();

  if (error || !collection || !collection.is_public) {
    throw new Error('Coleção não encontrada ou link inválido.');
  }
  if (collection.share_expires_at && new Date(collection.share_expires_at) < new Date()) {
    throw new Error('Este link expirou.');
  }

  const { data } = await supabase
    .from('collection_items')
    .select('id, product_id, color_name, color_hex, thumbnail_url, notes, sort_order')
    .eq('collection_id', collection.id)
    .order('sort_order', { ascending: true });
  const items = (data ?? []) as (PublicItem & { sort_order: number })[];
  const [products, reactions] = await Promise.all([
    loadExternalProducts(items),
    loadCollectionReactions(items),
  ]);
  return {
    collection: collection as PublicCollection,
    items,
    products,
    reactions,
  };
}

function PublicProductImage({
  image,
  productName,
}: {
  image?: string | null;
  productName: string;
}) {
  if (image) {
    return (
      <img src={image} alt={productName} loading="lazy" className="h-full w-full object-cover" />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
      <Package className="h-10 w-10" />
    </div>
  );
}

function PublicItemReactions({
  itemId,
  counts,
  onReaction,
}: {
  itemId: string;
  counts?: Map<string, number>;
  onReaction: (itemId: string, emoji: string) => void;
}) {
  return (
    <div className="mt-auto flex items-center gap-1 border-t border-border pt-2">
      {EMOJIS.map((emoji) => {
        const count = counts?.get(emoji) ?? 0;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReaction(itemId, emoji)}
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

function getProductPresentation(item: PublicItem, product?: ProductDetail) {
  if (!product) {
    return {
      name: 'Produto',
      image: item.thumbnail_url,
      price: null,
    };
  }
  return {
    name: product.name,
    image: item.thumbnail_url || product.images?.[0],
    price: product.price,
  };
}

function PublicCollectionItemCard({
  item,
  product,
  reactions,
  onReaction,
}: {
  item: PublicItem;
  product?: ProductDetail;
  reactions?: Map<string, number>;
  onReaction: (itemId: string, emoji: string) => void;
}) {
  const presentation = getProductPresentation(item, product);
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      <div className="aspect-square overflow-hidden bg-muted">
        <PublicProductImage image={presentation.image} productName={presentation.name} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-tight">{presentation.name}</h3>
        {presentation.price ? (
          <p className="font-display text-lg font-bold text-primary">
            {formatCurrency(presentation.price)}
          </p>
        ) : null}
        {item.color_name && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {item.color_hex && (
              <span
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: item.color_hex }}
              />
            )}
            {item.color_name}
          </p>
        )}
        {item.notes && (
          <p className="border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">
            ✎ {item.notes}
          </p>
        )}
        <PublicItemReactions itemId={item.id} counts={reactions} onReaction={onReaction} />
      </div>
    </article>
  );
}

export default function PublicCollectionPage() {
  const { token } = useParams<{ token: string }>();
  const [collection, setCollection] = useState<PublicCollection | null>(null);
  const [items, setItems] = useState<PublicItem[]>([]);
  const [products, setProducts] = useState<Map<string, ProductDetail>>(new Map());
  const [reactions, setReactions] = useState<Map<string, Map<string, number>>>(new Map());
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
    void loadPublicCollection(token)
      .then((result) => {
        if (!mounted) return;
        setCollection(result.collection);
        setItems(result.items);
        setProducts(result.products);
        setReactions(result.reactions);
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar coleção.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const sendReaction = async (itemId: string, emoji: string) => {
    if (!token) return;
    try {
      const url = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/collections-public-react`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: token, item_id: itemId, emoji, anon_id: anonId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 429) toast.error('Muitas reações em pouco tempo. Aguarde um instante.');
        else toast.error(body.error || 'Falha ao reagir');
        return;
      }
      // optimistic update
      setReactions((prev) => {
        const next = new Map(prev);
        const m = new Map(next.get(itemId) ?? new Map<string, number>());
        m.set(emoji, (m.get(emoji) ?? 0) + 1);
        next.set(itemId, m);
        return next;
      });
      toast.success('Obrigado pelo feedback!');
    } catch {
      toast.error('Erro de conexão');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-72 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
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
        <title>{collection.name} — Coleção compartilhada</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
            style={{ backgroundColor: `${collection.icon_color ?? '#8B5CF6'}20` }}
          >
            {collection.icon ?? '📁'}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold text-foreground sm:text-2xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="truncate text-sm text-muted-foreground">{collection.description}</p>
            )}
            {collection.client_name && (
              <p className="mt-0.5 text-xs font-medium text-primary">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Curadoria para {collection.client_name}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Items */}
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {items.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            Esta coleção ainda não tem produtos.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <PublicCollectionItemCard
                key={item.id}
                item={item}
                product={products.get(item.product_id)}
                reactions={reactions.get(item.id)}
                onReaction={sendReaction}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <Heart className="mr-1 inline h-3 w-3 text-primary" />
        Coleção compartilhada via Brindes Sicoob
      </footer>
    </div>
  );
}
