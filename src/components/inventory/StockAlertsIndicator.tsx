import { type ComponentPropsWithoutRef, useState, useEffect, forwardRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, TrendingDown, Package, X,
  ExternalLink, Sparkles, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import type { PromobrindProduct } from "@/lib/external-db/product-types";

// ─── Types ───────────────────────────────────────────────────

type NotificationType = "stock" | "new" | "restocked";

interface NotificationItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string | null;
  type: NotificationType;
  /** stock-specific */
  currentStock?: number;
  alertLevel?: "low" | "critical" | "out";
  supplier?: string;
}

interface StockAlertsIndicatorProps {
  lowStockThreshold?: number;
  criticalStockThreshold?: number;
}

// ─── Tab config ──────────────────────────────────────────────

const TABS: { key: NotificationType; label: string; color: string; activeColor: string }[] = [
  { key: "stock", label: "Zerou", color: "text-destructive", activeColor: "bg-destructive/10 text-destructive border-destructive" },
  { key: "new", label: "Novidade", color: "text-primary", activeColor: "bg-primary/10 text-primary border-primary" },
  { key: "restocked", label: "Chegou", color: "text-primary", activeColor: "bg-primary/10 text-primary border-primary" },
];

function stockAlertLevel(stock: number, criticalThreshold: number): NotificationItem["alertLevel"] {
  if (stock === 0) return "out";
  return stock <= criticalThreshold ? "critical" : "low";
}

function stockNotification(product: PromobrindProduct, criticalThreshold: number, imageUrl: string | null): NotificationItem {
  const stock = product.stock_quantity ?? 0;
  return {
    id: `stock-${product.id}`,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    imageUrl,
    type: "stock",
    currentStock: stock,
    alertLevel: stockAlertLevel(stock, criticalThreshold),
    supplier: product.brand || product.supplier_name || "",
  };
}

function newProductNotification(product: PromobrindProduct, sevenDaysAgo: Date, imageUrl: string | null) {
  if (!product.created_at || new Date(product.created_at) < sevenDaysAgo) return null;
  return { id: `new-${product.id}`, productId: product.id, productName: product.name, sku: product.sku, imageUrl, type: "new" as const };
}

function restockedNotification(product: PromobrindProduct, sevenDaysAgo: Date, stockThreshold: number, imageUrl: string | null) {
  const stock = product.stock_quantity ?? 0;
  if (stock <= 0 || stock > stockThreshold || !product.updated_at || !product.created_at) return null;
  const updated = new Date(product.updated_at);
  const created = new Date(product.created_at);
  if (updated < sevenDaysAgo || updated.getTime() - created.getTime() <= 3_600_000) return null;
  return { id: `restocked-${product.id}`, productId: product.id, productName: product.name, sku: product.sku, imageUrl, type: "restocked" as const, currentStock: stock };
}

function buildNotifications(products: PromobrindProduct[], stockThreshold: number, criticalThreshold: number, getImageUrl: (product: PromobrindProduct) => string | null) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const stockItems = products.filter((product) => (product.stock_quantity ?? 0) < stockThreshold).slice(0, 50).map((product) => stockNotification(product, criticalThreshold, getImageUrl(product)));
  const newItems = products.map((product) => newProductNotification(product, sevenDaysAgo, getImageUrl(product))).filter((item): item is NonNullable<typeof item> => item !== null);
  const restockedItems = products.map((product) => restockedNotification(product, sevenDaysAgo, stockThreshold, getImageUrl(product))).filter((item): item is NonNullable<typeof item> => item !== null);
  return [...stockItems, ...newItems, ...restockedItems];
}

// ─── Trigger ─────────────────────────────────────────────────

interface TriggerProps extends ComponentPropsWithoutRef<typeof Button> {
  totalCount: number;
  dominantColor: string;
}

const NotificationTrigger = forwardRef<HTMLButtonElement, TriggerProps>(
  ({ totalCount, dominantColor, ...props }, ref) => (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
      {...props}
      aria-label="Alertas de estoque"
    >
      <Package className="h-[17px] w-[17px]" strokeWidth={1.75} />
      {totalCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "absolute -top-0.5 -right-0.5 h-[18px] min-w-[18px] px-1 flex items-center justify-center text-[9px] font-bold rounded-full text-primary-foreground",
            dominantColor
          )}
        >
          {totalCount > 99 ? "99+" : totalCount}
        </motion.span>
      )}
    </Button>
  )
);
NotificationTrigger.displayName = "NotificationTrigger";

function stockBadge(level?: NotificationItem["alertLevel"]) {
  if (level === "out") return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Esgotado</Badge>;
  if (level === "critical") return <Badge className="bg-orange text-primary-foreground text-[10px] px-1.5 py-0">Crítico</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Baixo</Badge>;
}

function stockIcon(level?: NotificationItem["alertLevel"]) {
  if (level === "out") return <Package className="h-3.5 w-3.5 text-destructive" />;
  if (level === "critical") return <AlertTriangle className="h-3.5 w-3.5 text-orange" />;
  return <TrendingDown className="h-3.5 w-3.5 text-warning" />;
}

function typeBadge(item: NotificationItem) {
  if (item.type === "stock") return stockBadge(item.alertLevel);
  return <Badge className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0">{item.type === "new" ? "Novo" : "Reposto"}</Badge>;
}

function typeIcon(item: NotificationItem) {
  if (item.type === "stock") return stockIcon(item.alertLevel);
  return item.type === "new" ? <Sparkles className="h-3.5 w-3.5 text-primary" /> : <RefreshCw className="h-3.5 w-3.5 text-primary" />;
}

function useStockNotifications(lowStockThreshold: number, criticalStockThreshold: number) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const fetchAll = useCallback(async () => {
    try {
      const { fetchPromobrindProducts, getProductImageUrl } = await import("@/lib/external-db");
      const products = await fetchPromobrindProducts({ limit: 500 });
      setNotifications(buildNotifications(products, lowStockThreshold, criticalStockThreshold, getProductImageUrl));
    } catch (error) { console.error("Error fetching notifications:", error); }
    finally { setIsLoading(false); }
  }, [criticalStockThreshold, lowStockThreshold]);
  useEffect(() => { void fetchAll(); const interval = setInterval(() => void fetchAll(), 5 * 60 * 1000); return () => clearInterval(interval); }, [fetchAll]);
  const visible = useMemo(() => notifications.filter((item) => !dismissedIds.has(item.id)), [notifications, dismissedIds]);
  const counts = useMemo(() => {
    const count = (type: NotificationType) => visible.filter((item) => item.type === type).length;
    const stock = count("stock"); const newCount = count("new"); const restocked = count("restocked");
    return { stock, new: newCount, restocked, total: stock + newCount + restocked };
  }, [visible]);
  return { isLoading, visible, counts, dismiss: (id: string) => setDismissedIds((current) => new Set([...current, id])) };
}

type NotificationCounts = ReturnType<typeof useStockNotifications>["counts"];

function NotificationTabs({ counts, activeTab, setActiveTab }: { counts: NotificationCounts; activeTab: NotificationType; setActiveTab: (tab: NotificationType) => void }) {
  return <div className="flex gap-1.5 px-4 py-2 border-b border-border/30">{TABS.map((tab) => { const count = counts[tab.key]; const active = activeTab === tab.key; return <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all", active ? tab.activeColor : "border-transparent text-muted-foreground hover:bg-muted/40")}>{tab.label}{count > 0 && <span className={cn("h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-bold rounded-full", active ? "bg-current/20" : "bg-muted")}>{count > 99 ? "99+" : count}</span>}</button>; })}</div>;
}

function NotificationRow({ item, index, openProduct, dismiss }: { item: NotificationItem; index: number; openProduct: (id: string) => void; dismiss: (id: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.02 }} className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/30 hover:border-border/50 hover:bg-muted/30 transition-all group cursor-pointer" onClick={() => openProduct(item.productId)}>
      {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-background border border-border/30 flex-shrink-0 p-0.5" loading="lazy" /> : <div className="w-10 h-10 rounded-lg bg-muted/40 flex-shrink-0 flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground/50" /></div>}
      <div className="flex-1 min-w-0"><div className="flex items-start gap-2 mb-1"><p className="text-xs font-medium text-foreground/90 leading-tight line-clamp-2 flex-1">{item.productName}</p>{typeBadge(item)}</div><div className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="font-mono">{item.sku}</span>{item.type === "stock" && <span className="flex items-center gap-1">{typeIcon(item)}<span className={cn("font-medium", item.alertLevel === "out" && "text-destructive")}>{item.currentStock} un.</span></span>}{item.type === "restocked" && item.currentStock !== undefined && <span className="flex items-center gap-1"><RefreshCw className="h-3 w-3 text-primary" /><span className="font-medium text-primary">{item.currentStock} un.</span></span>}{item.type === "new" && <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-primary" /><span className="font-medium text-primary">Recém-cadastrado</span></span>}{item.supplier && <span className="truncate">{item.supplier}</span>}</div></div>
      <div className="flex flex-col gap-1 flex-shrink-0"><Tooltip><TooltipTrigger asChild><button className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); openProduct(item.productId); }}><ExternalLink className="h-3 w-3" /></button></TooltipTrigger><TooltipContent side="left" className="text-[11px]">Ver produto</TooltipContent></Tooltip><button className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); dismiss(item.id); }}><X className="h-3 w-3" /></button></div>
    </motion.div>
  );
}

function NotificationsPanel({ counts, activeTab, setActiveTab, items, close, openProduct, dismiss }: { counts: NotificationCounts; activeTab: NotificationType; setActiveTab: (tab: NotificationType) => void; items: NotificationItem[]; close: () => void; openProduct: (id: string) => void; dismiss: (id: string) => void }) {
  return (
    <PopoverContent className="w-[420px] p-0 rounded-xl border-border/50 shadow-xl overflow-hidden relative" align="end" sideOffset={8}>
      <button aria-label="Fechar" className="absolute top-3 right-3 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors z-10" onClick={close}><X className="h-4 w-4" /></button>
      <div className="px-4 pt-4 pb-3 border-b border-border/40"><div className="flex items-center gap-2 pr-8"><div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center"><Package className="h-3.5 w-3.5 text-primary" /></div><h3 className="font-display font-semibold text-sm">Notificações</h3><span className="text-[10px] text-muted-foreground font-medium tabular-nums ml-auto">{counts.total} {counts.total === 1 ? "alerta" : "alertas"}</span></div></div>
      <NotificationTabs counts={counts} activeTab={activeTab} setActiveTab={setActiveTab} />
      <ScrollArea className="h-[400px]"><div className="p-3 space-y-1.5"><AnimatePresence>{items.map((item, index) => <NotificationRow key={item.id} item={item} index={index} openProduct={openProduct} dismiss={dismiss} />)}</AnimatePresence>{items.length === 0 && <div className="text-center py-8 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Nenhuma notificação nesta categoria</p></div>}</div></ScrollArea>
    </PopoverContent>
  );
}

// ─── Main component ─────────────────────────────────────────

export function StockAlertsIndicator({
  lowStockThreshold = 50,
  criticalStockThreshold = 10,
}: StockAlertsIndicatorProps) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<NotificationType>("stock");
    const state = useStockNotifications(lowStockThreshold, criticalStockThreshold);
    const items = useMemo(() => state.visible.filter((item) => item.type === activeTab), [state.visible, activeTab]);
    const hasCritical = state.visible.some((item) => item.type === "stock" && (item.alertLevel === "critical" || item.alertLevel === "out"));
    const dominantColor = hasCritical ? "bg-destructive" : state.counts.stock > 0 ? "bg-orange" : "bg-primary";
    const openProduct = (id: string) => { setIsOpen(false); navigate(`/produto/${id}`); };
    if (state.isLoading || state.counts.total === 0) return null;
    return (
      <div>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <PopoverTrigger asChild>
                  <NotificationTrigger totalCount={state.counts.total} dominantColor={dominantColor} aria-label="Alertas de estoque" />
                </PopoverTrigger>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Alerta de Estoque
            </TooltipContent>
          </Tooltip>
          <NotificationsPanel counts={state.counts} activeTab={activeTab} setActiveTab={setActiveTab} items={items} close={() => setIsOpen(false)} openProduct={openProduct} dismiss={state.dismiss} />
        </Popover>
      </div>
    );
}
