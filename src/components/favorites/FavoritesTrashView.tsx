import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trash2 } from "lucide-react";
import { useFavoriteTrash } from "@/hooks/useFavoriteLists";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useMemo, useState } from "react";
import { DeleteConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";

type TrashItem = ReturnType<typeof useFavoriteTrash>["items"][number];
type TrashProduct = ReturnType<ReturnType<typeof useProductsContext>["getProductsByIds"]>[number];

function formatDaysLeft(expiresAt: string) {
  const milliseconds = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(milliseconds / 86400_000));
}

function daysLabel(days: number) {
  return `${days} dia${days === 1 ? "" : "s"} restantes`;
}

function TrashThumbnail({ source, name }: { source: string | undefined; name: string }) {
  return <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">{source && <img src={source} alt={name} className="w-full h-full object-cover" loading="lazy" />}</div>;
}

function TrashHeader({ count, onEmpty }: { count: number; onEmpty: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">{count} {count === 1 ? "item removido" : "itens removidos"} • TTL de 30 dias</p>
      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={onEmpty}><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Esvaziar lixeira</Button>
    </div>
  );
}

function TrashCard({ item, product, onRestore, onPurge }: { item: TrashItem; product: TrashProduct | undefined; onRestore: () => void; onPurge: () => void }) {
  const daysLeft = formatDaysLeft(item.expires_at);
  const variantInfo = item.variant_info as { color_name?: string; thumbnail?: string } | null;
  const thumbnail = variantInfo?.thumbnail ?? product?.images?.[0];
  const name = product?.name ?? item.product_id;
  return (
    <div className="flex gap-3 p-3 rounded-xl border border-border bg-card">
      <TrashThumbnail source={thumbnail} name={name} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {variantInfo?.color_name && <p className="text-xs text-muted-foreground truncate">Cor: {variantInfo.color_name}</p>}
        <Badge variant={daysLeft <= 5 ? "destructive" : "secondary"} className="text-[10px] mt-1">{daysLabel(daysLeft)}</Badge>
        <div className="flex gap-1.5 mt-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onRestore}><RotateCcw className="h-3 w-3 mr-1" /> Restaurar</Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onPurge}><Trash2 className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}

export function FavoritesTrashView() {
  const { items, isLoading, restoreItem, purgeItem, purgeAll } = useFavoriteTrash();
  const { getProductsByIds } = useProductsContext();
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const productMap = useMemo(() => {
    const ids = items.map((i) => i.product_id);
    const products = getProductsByIds(ids);
    return new Map(products.map((p) => [p.id, p]));
  }, [items, getProductsByIds]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Carregando lixeira…</div>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant="favorites"
        title="Lixeira vazia"
        description="Itens removidos aparecem aqui por 30 dias antes de serem excluídos definitivamente."
      />
    );
  }

  return (
    <div className="space-y-3">
      <TrashHeader count={items.length} onEmpty={() => setConfirmEmpty(true)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => {
          const p = productMap.get(it.product_id);
          return <TrashCard key={it.id} item={it} product={p} onRestore={() => restoreItem.mutate(it.id)} onPurge={() => purgeItem.mutate(it.id)} />;
        })}
      </div>

      <DeleteConfirmDialog
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        entityName="lixeira"
        onConfirm={async () => { await purgeAll.mutateAsync(); setConfirmEmpty(false); }}
      />
    </div>
  );
}
