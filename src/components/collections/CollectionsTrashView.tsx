/**
 * CollectionsTrashView — Lixeira de itens removidos de uma coleção.
 * Espelho de FavoritesTrashView. TTL de 30 dias.
 */
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { DeleteConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Product } from "@/hooks/useProducts";

interface TrashRow {
  id: string;
  product_id: string;
  collection_id: string;
  color_name: string | null;
  color_hex: string | null;
  thumbnail_url: string | null;
  expires_at: string;
}

interface Props {
  collectionId: string;
  onCountChange?: (n: number) => void;
}

function daysUntil(expiresAt: string) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400_000));
}

function TrashCard({ item, product, onRestore, onPurge }: { item: TrashRow; product?: Product; onRestore: (productId: string) => void; onPurge: (id: string) => void }) {
  const daysLeft = daysUntil(item.expires_at);
  const thumbnail = item.thumbnail_url ?? product?.images?.[0];
  const name = product?.name ?? item.product_id;
  return <div className="flex gap-3 p-3 rounded-xl border border-border bg-card"><div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">{thumbnail ? <img src={thumbnail} alt={name} className="w-full h-full object-cover" loading="lazy" /> : null}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{name}</p>{item.color_name ? <p className="text-xs text-muted-foreground truncate">Cor: {item.color_name}</p> : null}<Badge variant={daysLeft <= 5 ? "destructive" : "secondary"} className="text-[10px] mt-1">{daysLeft} dia{daysLeft !== 1 ? "s" : ""} restantes</Badge><div className="flex gap-1.5 mt-2"><Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onRestore(item.product_id)}><RotateCcw className="h-3 w-3 mr-1" /> Restaurar</Button><Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => onPurge(item.id)}><Trash2 className="h-3 w-3" /></Button></div></div></div>;
}

export function CollectionsTrashView({ collectionId, onCountChange }: Props) {
  const { restoreFromTrash } = useCollectionsContext();
  const { getProductsByIds } = useProductsContext();
  const [items, setItems] = useState<TrashRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const load = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("collection_items_trash" as never)
      .select("*")
      .eq("collection_id", collectionId)
      .order("deleted_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar lixeira");
      setItems([]);
    } else {
      setItems((data as unknown as TrashRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  const productMap = useMemo(() => {
    const ids = items.map((i) => i.product_id);
    const products = getProductsByIds(ids);
    return new Map(products.map((p) => [p.id, p]));
  }, [items, getProductsByIds]);

  const handleRestore = async (productId: string) => {
    const ok = await restoreFromTrash(collectionId, productId);
    if (ok) {
      toast.success("Produto restaurado");
      load();
    } else {
      toast.error("Não foi possível restaurar");
    }
  };

  const handlePurge = async (id: string) => {
    const { error } = await supabase
      .from("collection_items_trash" as never)
      .delete()
      .eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Item excluído permanentemente");
      load();
    }
  };

  const handlePurgeAll = async () => {
    const { error } = await supabase
      .from("collection_items_trash" as never)
      .delete()
      .eq("collection_id", collectionId);
    if (error) toast.error("Erro ao esvaziar lixeira");
    else {
      toast.success("Lixeira esvaziada");
      setConfirmEmpty(false);
      load();
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-8 text-center">Carregando lixeira…</div>;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        variant="collections"
        title="Lixeira vazia"
        description="Itens removidos aparecem aqui por 30 dias antes de serem excluídos definitivamente."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item removido" : "itens removidos"} • TTL de 30 dias
        </p>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmEmpty(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Esvaziar lixeira
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => <TrashCard key={item.id} item={item} product={productMap.get(item.product_id)} onRestore={handleRestore} onPurge={handlePurge} />)}
      </div>

      <DeleteConfirmDialog
        open={confirmEmpty}
        onOpenChange={setConfirmEmpty}
        entityName="lixeira"
        onConfirm={handlePurgeAll}
      />
    </div>
  );
}
