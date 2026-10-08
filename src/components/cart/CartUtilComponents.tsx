/**
 * Cart utility components: Skeletons, FollowUpTimer, Suggestions, History, and re-exports
 * 
 * Dialogs, export utils, and mobile sheet extracted to ./cart-utils/
 */

import { useMemo } from "react";
import { Card } from "@/components/ui/card";


import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Package, Trash2, Plus, Copy, FileText, Timer, Sparkles, TrendingUp, Lightbulb, History, MessageSquare, MoveRight, ChevronDown } from "lucide-react";
import { type SellerCart, type CartStatus } from "@/hooks/useSellerCarts";
import { differenceInDays, differenceInHours, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ============================================
// HELPERS
// ============================================

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const STATUS_CONFIG: Record<CartStatus, { label: string; color: string }> = {
  novo: { label: "Novo", color: "bg-primary/10 text-primary border-primary/20" },
  em_negociacao: { label: "Em negociação", color: "bg-warning/10 text-warning border-warning/20" },
  pronto_orcamento: { label: "Pronto p/ orçamento", color: "bg-primary/10 text-primary border-primary/20" },
};

export function getStatusCfg(status: string | undefined | null) {
  return STATUS_CONFIG[(status as CartStatus)] || STATUS_CONFIG.novo;
}

// ============================================
// ACTION HISTORY (in-memory per session)
// ============================================

export interface CartAction {
  type: "add" | "remove" | "qty" | "move" | "duplicate";
  itemName: string;
  detail?: string;
  time: Date;
}

const actionHistoryMap = new Map<string, CartAction[]>();

export function recordAction(cartId: string, action: CartAction) {
  const list = actionHistoryMap.get(cartId) || [];
  list.unshift(action);
  if (list.length > 20) list.pop();
  actionHistoryMap.set(cartId, list);
}

export function getActionHistory(cartId: string): CartAction[] {
  return actionHistoryMap.get(cartId) || [];
}

// ============================================
// SKELETON LOADER
// ============================================

export function CartItemSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-20" />
        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </Card>
  );
}

// ============================================
// FOLLOW-UP TIMER
// ============================================

export function FollowUpTimer({ createdAt }: { createdAt: string }) {
  const days = differenceInDays(new Date(), new Date(createdAt));
  const hours = differenceInHours(new Date(), new Date(createdAt));

  if (days < 1) return null;

  const isUrgent = days >= 3;
  const isWarning = days >= 2;

  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border",
      isUrgent
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : isWarning
          ? "bg-warning/10 text-warning border-warning/20"
          : "bg-muted/50 text-muted-foreground border-border/30"
    )}>
      <Timer className="h-3.5 w-3.5" />
      <span>
        {isUrgent
          ? `${days} dias — Hora do follow-up!`
          : isWarning
            ? `${days} dias desde a criação`
            : `Criado há ${hours}h`}
      </span>
    </div>
  );
}

// ============================================
// SMART SUGGESTIONS
// ============================================

interface ProductLike {
  id: string;
  name: string;
  category_name?: string;
  category?: { name?: string };
  is_active?: boolean;
}

export function SmartSuggestions({ cart, allProducts }: { cart: SellerCart; allProducts: ProductLike[] }) {
  const suggestions = useMemo(() => {
    const tips: { icon: typeof Lightbulb; text: string }[] = [];
    const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.items.reduce((s, i) => s + i.product_price * i.quantity, 0);

    if (cart.items.length === 1) {
      tips.push({ icon: Lightbulb, text: "Carrinhos com 3+ SKUs distintos convertem 40% mais" });
    }
    if (totalQty < 50) {
      tips.push({ icon: TrendingUp, text: "Pedidos acima de 50 unidades costumam ter melhor margem" });
    }
    if (subtotal > 5000 && !cart.notes) {
      tips.push({ icon: MessageSquare, text: "Negociações acima de R$5k com notas detalhadas fecham mais rápido" });
    }
    if (cart.items.some(i => !i.notes) && cart.items.length > 2) {
      tips.push({ icon: FileText, text: "Adicione observações em cada item para acelerar a produção" });
    }

    if (allProducts.length > 0 && cart.items.length > 0) {
      const cartCategoryNames = new Set(
        cart.items
          .map(i => {
            const prod = allProducts.find(p => p.id === i.product_id);
            return prod?.category_name || prod?.category?.name;
          })
          .filter(Boolean)
      );
      const cartProductIds = new Set(cart.items.map(i => i.product_id));
      const similar = allProducts.find(p => {
        const pCatName = p.category_name || p.category?.name;
        return !cartProductIds.has(p.id) &&
          pCatName &&
          cartCategoryNames.has(pCatName) &&
          p.is_active !== false;
      });
      if (similar) {
        tips.push({
          icon: Sparkles,
          text: `Clientes similares também compraram: ${similar.name}`,
        });
      }
    }

    return tips.slice(0, 3);
  }, [cart, allProducts]);

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {suggestions.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground/80 bg-muted/20 rounded-lg px-2.5 py-2 border border-border/20">
            <Icon className="h-3 w-3 mt-0.5 text-warning flex-shrink-0" />
            <span>{s.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// ACTION HISTORY PANEL
// ============================================

export function ActionHistoryPanel({ cartId }: { cartId: string }) {
  const history = getActionHistory(cartId);
  if (history.length === 0) return null;

  const icons: Record<string, typeof Plus> = {
    add: Plus,
    remove: Trash2,
    qty: Package,
    move: MoveRight,
    duplicate: Copy,
  };

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full" aria-label="Recolher">
          <History className="h-3.5 w-3.5" />
          Histórico de ações ({history.length})
          <ChevronDown className="h-3 w-3 ml-auto" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {history.slice(0, 10).map((action, i) => {
            const Icon = icons[action.type] || Package;
            return (
              <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground py-1">
                <Icon className="h-3 w-3 flex-shrink-0" />
                <span className="truncate flex-1">
                  {action.type === "add" && `Adicionou ${action.itemName}`}
                  {action.type === "remove" && `Removeu ${action.itemName}`}
                  {action.type === "qty" && `Alterou qtd de ${action.itemName}${action.detail ? ` → ${action.detail}` : ""}`}
                  {action.type === "move" && `Moveu ${action.itemName}${action.detail ? ` → ${action.detail}` : ""}`}
                  {action.type === "duplicate" && `Duplicou ${action.itemName}${action.detail ? ` → ${action.detail}` : ""}`}
                </span>
                <span className="text-[9px] tabular-nums flex-shrink-0">
                  {formatDistanceToNow(action.time, { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================
// RE-EXPORTS from extracted modules
// ============================================

export { exportCartToCSV, exportCartToPDF, shareCartLink } from "./cart-utils/CartExport";
export { CompareCartsDialog, SaveTemplateDialog, LoadTemplateDialog } from "./cart-utils/CartDialogs";
export { MobileSummarySheet } from "./cart-utils/CartMobileSheet";
