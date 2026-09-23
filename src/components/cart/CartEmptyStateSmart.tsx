/**
 * CartEmptyStateSmart - Empty state com 3 CTAs inteligentes:
 * Aplicar template, Duplicar último carrinho desta empresa, Explorar catálogo.
 */
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Copy, Package, Sparkles, ArrowRight } from "lucide-react";
import { type SellerCart } from "@/hooks/useSellerCarts";
import { type CartTemplateItem } from "@/hooks/cart/useCartTemplates";
import { cn } from "@/lib/utils";

interface SmartTemplate {
  id: string;
  name: string;
  description?: string;
  items: CartTemplateItem[];
}

interface CartEmptyStateSmartProps {
  activeCart: SellerCart;
  templates: SmartTemplate[];
  otherCarts: SellerCart[];
  onApplyTemplate: (items: CartTemplateItem[]) => void;
  onDuplicateLast: (sourceCart: SellerCart) => void;
  onNavigateProducts: () => void;
}

export function CartEmptyStateSmart({
  activeCart, templates, otherCarts,
  onApplyTemplate, onDuplicateLast, onNavigateProducts,
}: CartEmptyStateSmartProps) {
  const topTemplates = templates.slice(0, 3);
  const lastCartSameCompany = otherCarts
    .filter(c => c.company_id === activeCart.company_id && c.items.length > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

  return (
    <div className="space-y-4">
      <div className="text-center pt-6 pb-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h3 className="font-display text-xl font-semibold mb-1">Comece a montar o carrinho</h3>
        <p className="text-sm text-muted-foreground">Escolha um caminho rápido ou explore o catálogo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Template */}
        <Card className={cn(
          "p-4 flex flex-col gap-3 border-border/40 hover:border-primary/30 transition-colors",
          topTemplates.length === 0 && "opacity-60"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <LayoutTemplate className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Aplicar template</h4>
          </div>
          {topTemplates.length > 0 ? (
            <>
              <ul className="space-y-1 text-xs text-muted-foreground flex-1">
                {topTemplates.map(t => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{t.name}</span>
                    <span className="tabular-nums text-[10px]">{t.items.length} itens</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => onApplyTemplate(topTemplates[0]!.items)}
              >
                Aplicar "{topTemplates[0]!.name}" <ArrowRight className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex-1">Crie templates a partir de carrinhos existentes.</p>
          )}
        </Card>

        {/* Duplicate last */}
        <Card className={cn(
          "p-4 flex flex-col gap-3 border-border/40 hover:border-primary/30 transition-colors",
          !lastCartSameCompany && "opacity-60"
        )}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Copy className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Duplicar anterior</h4>
          </div>
          {lastCartSameCompany ? (
            <>
              <p className="text-xs text-muted-foreground flex-1">
                Carrinho anterior desta empresa com {lastCartSameCompany.items.length} itens.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5 text-xs"
                onClick={() => onDuplicateLast(lastCartSameCompany)}
              >
                Copiar itens <ArrowRight className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground flex-1">Nenhum carrinho anterior para esta empresa.</p>
          )}
        </Card>

        {/* Catalog */}
        <Card className="p-4 flex flex-col gap-3 border-border/40 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <h4 className="font-semibold text-sm">Explorar catálogo</h4>
          </div>
          <p className="text-xs text-muted-foreground flex-1">
            Navegue por +5.000 produtos e adicione manualmente.
          </p>
          <Button
            size="sm"
            className="w-full gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onNavigateProducts}
          >
            Ir ao catálogo <ArrowRight className="h-3 w-3" />
          </Button>
        </Card>
      </div>
    </div>
  );
}
