import { useState, useMemo } from "react";
import {
  Package, Palette, Weight, Layers, BoxSelect, ShoppingBag,
  ChevronUp, ChevronDown, Box,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KitComponent } from "@/types/product-catalog";
import { KitComponentCard } from "./kit-composition/KitComponentCard";

interface KitCompositionProps {
  items: KitComponent[];
  onViewProduct?: (productId: string) => void;
}

interface KitStatsValue {
  totalPieces: number;
  totalWeight: number;
  packagingCount: number;
  productCount: number;
  personalizableCount: number;
}

function formatWeight(grams: number) {
  return grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;
}

function calculateKitStats(items: KitComponent[]): KitStatsValue {
  return {
    totalPieces: items.reduce((sum, item) => sum + item.quantity, 0),
    totalWeight: items.reduce((sum, item) => sum + (item.weightG ?? 0) * item.quantity, 0),
    packagingCount: items.filter((item) => item.isPackaging).length,
    productCount: items.filter((item) => !item.isPackaging).length,
    personalizableCount: items.filter((item) => item.allowsPersonalization).length,
  };
}

function KitTrigger({ items, totalPieces, onOpen }: { items: KitComponent[]; totalPieces: number; onOpen: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm cursor-pointer hover:border-primary/40 transition-all group" onClick={onOpen} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") onOpen(); }}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors"><Layers className="h-5 w-5 text-primary" /></div><div className="text-left"><h3 className="font-display font-semibold text-foreground text-base">Composição do Kit</h3><span className="text-xs text-muted-foreground">{items.length} componentes • {totalPieces} peças</span></div></div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex -space-x-2">
            {items.slice(0, 4).map((item) => <div key={item.id} className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center overflow-hidden">{item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" /> : <Package className="h-3.5 w-3.5 text-muted-foreground/50" />}</div>)}
            {items.length > 4 && <div className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">+{items.length - 4}</div>}
          </div>
          <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </div>
  );
}

function KitStats({ stats }: { stats: KitStatsValue }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {stats.productCount > 0 && <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1"><ShoppingBag className="h-3 w-3" />{stats.productCount} {stats.productCount === 1 ? "item" : "itens"}</Badge>}
      {stats.packagingCount > 0 && <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1"><BoxSelect className="h-3 w-3" />{stats.packagingCount} {stats.packagingCount === 1 ? "embalagem" : "embalagens"}</Badge>}
      {stats.personalizableCount > 0 && <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 text-primary border-primary/30"><Palette className="h-3 w-3" />{stats.personalizableCount} personalizáveis</Badge>}
      {stats.totalWeight > 0 && <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1"><Weight className="h-3 w-3" />{formatWeight(stats.totalWeight)} total</Badge>}
    </div>
  );
}

function KitSection({ items, open, onOpenChange, variant, onViewProduct, onZoomImage }: { items: KitComponent[]; open: boolean; onOpenChange: (open: boolean) => void; variant: "packaging" | "item"; onViewProduct?: (productId: string) => void; onZoomImage: (url: string) => void }) {
  if (items.length === 0) return null;
  const packaging = variant === "packaging";
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className={packaging ? "flex items-center justify-between w-full px-3 py-2.5 bg-warning/5 border border-warning/20 rounded-lg hover:bg-warning/10 transition-colors" : "flex items-center justify-between w-full px-3 py-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"}>
        <span className={packaging ? "text-[11px] font-semibold uppercase tracking-wider text-warning dark:text-warning flex items-center gap-1.5" : "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"}>{packaging ? <Box className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />}{packaging ? "Embalagem" : "Itens do Kit"} ({items.length})</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent><div className="mt-3 space-y-3">{items.map((item, index) => <KitComponentCard key={item.id} item={item} index={index + 1} variant={variant} onViewProduct={onViewProduct} onZoomImage={onZoomImage} />)}</div></CollapsibleContent>
    </Collapsible>
  );
}

export function KitComposition({ items, onViewProduct }: KitCompositionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({ packaging: true, products: true });

  const stats = useMemo(() => calculateKitStats(items), [items]);

  const packagingItems = items.filter((item) => item.isPackaging); const productItems = items.filter((item) => !item.isPackaging);

  return (
    <>
      <KitTrigger items={items} totalPieces={stats.totalPieces} onOpen={() => setDialogOpen(true)} />

      {/* Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[72vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Composição do Kit</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  {items.length} {items.length === 1 ? "componente" : "componentes"} • {stats.totalPieces} {stats.totalPieces === 1 ? "peça" : "peças"}
                </DialogDescription>
              </div>
            </div>
            <KitStats stats={stats} />
          </DialogHeader>

          <ScrollArea className="max-h-[calc(72vh-160px)]">
            <div className="px-6 py-4 space-y-5">
              <KitSection items={packagingItems} open={expandedSections.packaging} onOpenChange={(open) => setExpandedSections((sections) => ({ ...sections, packaging: open }))} variant="packaging" onViewProduct={onViewProduct} onZoomImage={setZoomImageUrl} />
              <KitSection items={productItems} open={expandedSections.products} onOpenChange={(open) => setExpandedSections((sections) => ({ ...sections, products: open }))} variant="item" onViewProduct={onViewProduct} onZoomImage={setZoomImageUrl} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={!!zoomImageUrl} onOpenChange={() => setZoomImageUrl(null)}>
        <DialogContent className="max-w-2xl p-2 bg-background/95 backdrop-blur-xl">
          {zoomImageUrl && 
<img src={zoomImageUrl} alt="Zoom" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" loading="lazy" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
