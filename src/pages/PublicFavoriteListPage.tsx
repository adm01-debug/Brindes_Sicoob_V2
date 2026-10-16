/**
 * PublicFavoriteListPage — Visualização pública (sem login) de uma lista de favoritos
 * compartilhada via shared_token. Cliente reage com 👍 ❤️ 🔥 💡 por item.
 */
import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Heart, Lock, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useFavoriteReactions } from '@/hooks/useFavoriteReactions';
import { PageSEO } from '@/components/seo/PageSEO';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';

interface PublicList {
  id: string;
  name: string;
  description: string | null;
  color: string;
  shared_expires_at: string | null;
}

interface PublicItem {
  id: string;
  product_id: string;
  variant_info: {
    color_name?: string | null;
    color_hex?: string | null;
    thumbnail?: string | null;
  } | null;
  note: string | null;
  added_at: string;
}

interface ExternalProduct {
  id: string;
  name: string;
  price?: number;
  images?: string[];
  sku?: string;
}

interface FavoriteReactionMeta {
  counts: Record<string, number>;
  mine: Set<string>;
}

const EMOJIS: Array<'👍' | '❤️' | '🔥' | '💡'> = ['👍', '❤️', '🔥', '💡'];

function FavoriteProductImage({ image, name }: { image?: string | null; name: string }) {
  if (!image) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
        Sem imagem
      </div>
    );
  }
  return <img src={image} alt={name} loading="lazy" className="h-full w-full object-cover" />;
}

function FavoriteReactionBar({
  itemId,
  meta,
  isPending,
  onReact,
}: {
  itemId: string;
  meta?: FavoriteReactionMeta;
  isPending: boolean;
  onReact: (itemId: string, emoji: (typeof EMOJIS)[number]) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-t border-border pt-2">
      {EMOJIS.map((emoji) => {
        const count = meta?.counts[emoji] ?? 0;
        const isMine = meta?.mine.has(emoji) ?? false;
        return (
          <button
            key={emoji}
            type="button"
            disabled={isMine || isPending}
            onClick={() => onReact(itemId, emoji)}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all',
              'min-h-[32px]',
              isMine
                ? 'cursor-default bg-primary/10 text-primary'
                : 'text-foreground/70 hover:bg-accent',
            )}
            aria-label={`Reagir com ${emoji}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-[10px] font-medium tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function getFavoriteProductPresentation(item: PublicItem, product?: ExternalProduct) {
  if (!product) {
    return {
      name: 'Produto indisponível',
      image: item.variant_info?.thumbnail,
      price: undefined,
    };
  }
  return {
    name: product.name,
    image: item.variant_info?.thumbnail || product.images?.[0],
    price: product.price,
  };
}

function FavoriteProductCard({
  item,
  product,
  meta,
  isPending,
  onReact,
}: {
  item: PublicItem;
  product?: ExternalProduct;
  meta?: FavoriteReactionMeta;
  isPending: boolean;
  onReact: (itemId: string, emoji: (typeof EMOJIS)[number]) => void;
}) {
  const presentation = getFavoriteProductPresentation(item, product);
  const variant = item.variant_info;
  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
      <div className="aspect-square overflow-hidden bg-muted">
        <FavoriteProductImage image={presentation.image} name={presentation.name} />
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">
          {presentation.name}
        </h3>
        {presentation.price !== undefined && (
          <p className="text-xs font-semibold text-primary">{formatCurrency(presentation.price)}</p>
        )}
        {variant?.color_name && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {variant.color_hex && (
              <span
                className="inline-block h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: variant.color_hex }}
              />
            )}
            {variant.color_name}
          </div>
        )}
        {item.note && (
          <p className="line-clamp-2 border-l-2 border-primary/30 pl-2 text-[11px] italic text-muted-foreground">
            ✎ {item.note}
          </p>
        )}
        <FavoriteReactionBar itemId={item.id} meta={meta} isPending={isPending} onReact={onReact} />
      </div>
    </article>
  );
}

interface PublicFavoriteBundle {
  list: PublicList;
  items: PublicItem[];
}

async function fetchPublicFavoriteBundle(token?: string): Promise<PublicFavoriteBundle | null> {
  if (!token) return null;
  const { data, error } = await supabase.rpc('get_public_favorite_list', { _token: token });
  if (error) throw error;
  return data as unknown as PublicFavoriteBundle | null;
}

function isFavoriteListExpired(list: PublicList | null | undefined) {
  if (!list?.shared_expires_at) return false;
  return new Date(list.shared_expires_at) < new Date();
}

async function fetchPublicFavoriteProducts(items: PublicItem[]) {
  if (items.length === 0) return [];
  const ids = items.map((item) => item.product_id);
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { action: 'get_products_by_ids', product_ids: ids },
  });
  if (error) return [];
  return (data?.products ?? []) as ExternalProduct[];
}

function buildFavoriteReactionMap(
  reactions: Array<{ item_id: string; emoji: string; anon_id: string }>,
  anonId: string,
) {
  const map = new Map<string, FavoriteReactionMeta>();
  for (const reaction of reactions) {
    const current = map.get(reaction.item_id) ?? {
      counts: {},
      mine: new Set<string>(),
    };
    current.counts[reaction.emoji] = (current.counts[reaction.emoji] ?? 0) + 1;
    if (reaction.anon_id === anonId) current.mine.add(reaction.emoji);
    map.set(reaction.item_id, current);
  }
  return map;
}

function usePublicFavoriteListData(token?: string) {
  const bundleQuery = useQuery({
    queryKey: ['public-favorite-list', token],
    queryFn: () => fetchPublicFavoriteBundle(token),
    enabled: Boolean(token),
    retry: false,
  });
  const list = bundleQuery.data?.list;
  const expired = isFavoriteListExpired(list);
  const listId = list?.id;
  const items = expired ? [] : (bundleQuery.data?.items ?? []);
  const productIds = items.map((item) => item.product_id).join(',');
  const productsQuery = useQuery({
    queryKey: ['public-favorite-products', productIds],
    queryFn: () => fetchPublicFavoriteProducts(items),
    enabled: items.length > 0,
  });
  const products = productsQuery.data ?? [];
  const reactionState = useFavoriteReactions(listId ?? null, token ?? null);
  const reactionMap = useMemo(
    () => buildFavoriteReactionMap(reactionState.reactions, reactionState.anonId),
    [reactionState.reactions, reactionState.anonId],
  );
  return {
    list,
    loadingList: bundleQuery.isLoading,
    listError: bundleQuery.error,
    refetchList: bundleQuery.refetch,
    expired,
    items,
    productMap: new Map(products.map((product) => [product.id, product])),
    reactionMap,
    react: reactionState.react,
  };
}

export default function PublicFavoriteListPage() {
  const { token } = useParams<{ token: string }>();
  const {
    list,
    loadingList,
    listError,
    refetchList,
    expired,
    items,
    productMap,
    reactionMap,
    react,
  } = usePublicFavoriteListData(token);

  // SEO: noindex
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex,nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  if (loadingList) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  if (listError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center" role="alert">
          <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-warning" />
          <h1 className="mb-1 font-display text-xl font-semibold text-foreground">
            Não foi possível carregar a lista
          </h1>
          <p className="mb-4 text-sm text-muted-foreground">
            Serviço indisponível. Tente novamente em instantes.
          </p>
          <Button type="button" variant="outline" onClick={() => void refetchList()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <Lock className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-1 font-display text-xl font-semibold text-foreground">
            Lista não encontrada
          </h1>
          <p className="text-sm text-muted-foreground">
            Este link pode ter sido revogado ou está incorreto.
          </p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <Lock className="mx-auto mb-3 h-12 w-12 text-warning" />
          <h1 className="mb-1 font-display text-xl font-semibold text-foreground">Link expirado</h1>
          <p className="text-sm text-muted-foreground">
            Solicite um novo link ao curador desta lista.
          </p>
        </div>
      </div>
    );
  }

  const expiresLabel = list.shared_expires_at
    ? new Date(list.shared_expires_at).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <PageSEO
        title={`${list.name} — Curadoria`}
        description="Lista de produtos curada para você."
        path={`/lista-publica/${token}`}
      />

      {/* Hero */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${list.color}20`, color: list.color }}
              >
                <Heart className="h-6 w-6" fill="currentColor" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-2xl font-bold text-foreground">
                  {list.name}
                </h1>
                {list.description && (
                  <p className="line-clamp-1 text-sm text-muted-foreground">{list.description}</p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {items.length} produtos selecionados
                  {expiresLabel && ` • Expira em ${expiresLabel}`}
                </p>
              </div>
            </div>
            <div className="self-end text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Sicoob • Curadoria
            </div>
          </div>
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">Esta lista ainda não tem produtos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <FavoriteProductCard
                key={item.id}
                item={item}
                product={productMap.get(item.product_id)}
                meta={reactionMap.get(item.id)}
                isPending={react.isPending}
                onReact={(itemId, emoji) => react.mutate({ itemId, emoji })}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="mt-12 border-t border-border py-6 text-center">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          Powered by Sicoob
        </span>
      </footer>
    </div>
  );
}
