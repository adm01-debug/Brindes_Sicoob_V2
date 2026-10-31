/**
 * ComparisonMobileView — Carousel vertical de atributos para mobile (<768px).
 * Cada linha = atributo, produtos viram chips horizontais swipeable.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useComparisonScore } from "@/hooks/useComparisonScore";
import type { Product, ProductColor } from "@/hooks/useProducts";

interface Props {
  products: Product[];
  formatCurrency: (v: number) => string;
  onRemove: (idx: number) => void;
  onProductClick?: (id: string) => void;
}

const ROWS = [
  { key: "image", label: "Foto" },
  { key: "name", label: "Produto" },
  { key: "price", label: "Preço" },
  { key: "minQty", label: "Qtd. mínima" },
  { key: "stock", label: "Estoque" },
  { key: "colors", label: "Cores" },
  { key: "supplier", label: "Fornecedor" },
] as const;
type RowKey = typeof ROWS[number]["key"];

function useWinnerIndex(products: Product[]): number {
  const scores = useComparisonScore(products);
  if (scores.length === 0) return -1;
  return scores.reduce((best, current, index, all) => current.total > (all[best]?.total ?? Number.NEGATIVE_INFINITY) ? index : best, 0);
}

interface CellProps {
  product: Product;
  index: number;
  isWinner: boolean;
  formatCurrency: Props["formatCurrency"];
  onRemove: Props["onRemove"];
  onProductClick?: Props["onProductClick"];
}

function ProductImageCell({ product, index, isWinner, onRemove }: CellProps) {
  return (
    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
      <img src={product.images?.[0]} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
      {isWinner && <Badge className="absolute top-1 left-1 text-[9px] gap-0.5 px-1 py-0"><Crown className="h-2.5 w-2.5" /></Badge>}
      <button aria-label="Remover" onClick={() => onRemove(index)} className="absolute top-1 right-1 p-1 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground"><X className="h-3 w-3" /></button>
    </div>
  );
}

function ProductColors({ colors = [] }: { colors?: ProductColor[] }) {
  return <div className="flex gap-0.5 flex-wrap">{colors.slice(0, 4).map((color, index) => <div key={`${color.hex}-${index}`} className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: color.hex }} />)}{colors.length > 4 && <span className="text-[10px]">+{colors.length - 4}</span>}</div>;
}

function TextProductCell({ rowKey, product, formatCurrency }: Pick<CellProps, "product" | "formatCurrency"> & { rowKey: RowKey }) {
  switch (rowKey) {
    case "price": return <span className="text-sm font-bold text-primary">{formatCurrency(product.price)}</span>;
    case "minQty": return <span className="text-xs">{product.minQuantity ?? 0} un.</span>;
    case "stock": return <span className="text-xs">{product.stock ?? 0}</span>;
    case "supplier": return <span className="text-[10px] text-muted-foreground line-clamp-1">{product.supplier?.name ?? "—"}</span>;
    default: return null;
  }
}

function ProductCell({ rowKey, ...props }: CellProps & { rowKey: RowKey }) {
  if (rowKey === "image") return <ProductImageCell {...props} />;
  if (rowKey === "name") return <button onClick={() => props.onProductClick?.(props.product.id)} className="text-xs font-medium text-left line-clamp-2 hover:text-primary">{props.product.name}</button>;
  if (rowKey === "colors") return <ProductColors colors={props.product.colors} />;
  return <TextProductCell rowKey={rowKey} product={props.product} formatCurrency={props.formatCurrency} />;
}

export function ComparisonMobileView({ products, formatCurrency, onRemove, onProductClick }: Props) {
  const winnerIdx = useWinnerIndex(products);

  return (
    <div className="md:hidden space-y-3">
      {ROWS.map((row) => (
        <div key={row.key} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-border">
            {row.label}
          </div>
          <div className="flex gap-2 p-2 overflow-x-auto snap-x snap-mandatory scrollbar-thin">
            {products.map((p, idx) => (
              <div
                key={`${p.id}-${idx}`}
                className={cn(
                  "shrink-0 snap-start min-w-[42%] max-w-[42%] flex items-center justify-center p-2 rounded-lg border border-border bg-background",
                  winnerIdx === idx && "border-primary/60 ring-1 ring-primary/30"
                )}
              >
                <ProductCell rowKey={row.key} product={p} index={idx} isWinner={winnerIdx === idx} formatCurrency={formatCurrency} onRemove={onRemove} onProductClick={onProductClick} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button variant="outline" size="sm" className="w-full" onClick={() => {
        const firstProduct = products[0];
        if (firstProduct) onProductClick?.(firstProduct.id);
      }}>
        Ver detalhes do primeiro produto
      </Button>
    </div>
  );
}
