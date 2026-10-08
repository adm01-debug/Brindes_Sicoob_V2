import { Heart, Share2, Users, FileText, Presentation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FavoritesSortBar, type FavoritesSort } from "./FavoritesSortBar";
import { ExportFavoritesButton } from "./ExportFavoritesButton";
import { FavoritesHeatmap } from "./FavoritesHeatmap";
import { formatCurrency } from "@/lib/format";
import type { FavoriteList, FavoriteListItem } from "@/hooks/useFavoriteLists";
import type { Product } from "@/types/product-catalog";

interface Props {
  list: FavoriteList | null;
  itemCount: number;
  sort: FavoritesSort;
  onSortChange: (s: FavoritesSort) => void;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  onlyPriceDrops?: boolean;
  onTogglePriceDrops?: (v: boolean) => void;
  priceDropCount?: number | null;
  /** Produtos da view atual — usado para CTA orçamento + export */
  products?: Product[];
  rawItems?: FavoriteListItem[];
  /** Abrir modo apresentação */
  onPresent?: () => void;
}

function buildQuoteUrl(products: Product[], list: FavoriteList | null) {
  const items = products.slice(0, 50).map((product) => `${product.id}:1`).join(",");
  const params = new URLSearchParams({ items });
  if (list?.id) params.set("list_id", list.id);
  if (list?.client_id) params.set("client_id", list.client_id);
  if (list?.client_name) params.set("client_name", list.client_name);
  return `/orcamentos/novo?${params.toString()}`;
}

function ListIdentity({ list, name, color, itemCount, subtitle }: { list: FavoriteList | null; name: string; color: string; itemCount: number; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: list ? `${color}20` : undefined, color }}><Heart className="h-4 w-4" fill="currentColor" /></div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-base sm:text-lg font-display font-semibold text-foreground truncate">{name}</h2>
          {list?.is_default && <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">padrão</Badge>}
          {list?.shared_token && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1"><Share2 className="h-2.5 w-2.5" /> compartilhada</Badge>}
          {list?.client_name && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1"><Users className="h-2.5 w-2.5" /> {list.client_name}</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? "item" : "itens"}{subtitle && ` • ${subtitle}`}</p>
      </div>
    </div>
  );
}

function HeaderActions({ products, rawItems, name, onPresent, sortProps }: { products: Product[]; rawItems?: FavoriteListItem[]; name: string; onPresent?: () => void; sortProps: Pick<Props, "sort" | "onSortChange" | "onlyPriceDrops" | "onTogglePriceDrops" | "priceDropCount"> }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FavoritesSortBar value={sortProps.sort} onChange={sortProps.onSortChange} onlyPriceDrops={sortProps.onlyPriceDrops} onTogglePriceDrops={sortProps.onTogglePriceDrops} priceDropCount={sortProps.priceDropCount} />
      {products.length > 0 && <>{onPresent && <Button variant="outline" size="sm" onClick={onPresent} title="Modo apresentação"><Presentation className="h-3.5 w-3.5" /><span className="hidden sm:inline ml-1.5 text-xs">Apresentar</span></Button>}<ExportFavoritesButton products={products} rawItems={rawItems} listName={name} /></>}
    </div>
  );
}

function QuoteSummary({ products, onGenerate }: { products: Product[]; onGenerate: () => void }) {
  if (products.length === 0) return null;
  const potentialValue = products.reduce((sum, product) => sum + (product.price ?? 0), 0);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-3 flex-wrap"><Button onClick={onGenerate} variant="premium" size="sm" className="gap-1.5"><FileText className="h-3.5 w-3.5" />Gerar Orçamento</Button><div className="text-xs text-muted-foreground">Valor potencial: <span className="font-semibold text-foreground">{formatCurrency(potentialValue)}</span></div></div>
      <div className="hidden md:block"><FavoritesHeatmap /></div>
    </div>
  );
}

export function FavoritesViewHeader({
  list, itemCount, sort, onSortChange, fallbackTitle, fallbackSubtitle,
  onlyPriceDrops, onTogglePriceDrops, priceDropCount,
  products = [], rawItems, onPresent,
}: Props) {
  const navigate = useNavigate();
  const color = list?.color ?? "hsl(var(--destructive))";
  const name = list?.name ?? fallbackTitle ?? "Favoritos";

  const handleGenerateQuote = () => {
    if (products.length === 0) return;
    navigate(buildQuoteUrl(products, list));
  };

  return (
    <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <ListIdentity list={list} name={name} color={color} itemCount={itemCount} subtitle={fallbackSubtitle} />
      <HeaderActions products={products} rawItems={rawItems} name={name} onPresent={onPresent} sortProps={{ sort, onSortChange, onlyPriceDrops, onTogglePriceDrops, priceDropCount }} />
    </div>

    {/* Linha 2: CTA orçamento + KPI valor potencial + heatmap */}
    <QuoteSummary products={products} onGenerate={handleGenerateQuote} />
    </div>
  );
}
