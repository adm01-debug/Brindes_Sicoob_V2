
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { ShoppingCart, Trash2, Plus, Minus, ShieldCheck, AlertCircle, Info, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Link } from "react-router-dom";
import { CouponInput } from "./CouponInput";
import { useApprovalThreshold } from "@/hooks/useApprovalThreshold";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function MiniCart() {
  const { items, subtotal, totalItemsCount, removeItem, updateQuantity, clearCart, getOptimisticQuantity } = useCart();
  const { threshold, needsApproval } = useApprovalThreshold(items);
  
  const isOverThreshold = needsApproval(subtotal);
  const thresholdProgress = threshold > 0 ? Math.min((subtotal / threshold) * 100, 100) : 0;
  const remaining = Math.max(0, threshold - subtotal);

  const handleReset = () => {
    if (confirm("Deseja realmente redefinir o carrinho para o padrão (vazio)?")) {
      clearCart.mutate();
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {totalItemsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {totalItemsCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader className="flex flex-row items-center justify-between space-y-0">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Seu Carrinho ({totalItemsCount})
          </SheetTitle>
          {items.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset} 
              className="text-[10px] uppercase font-bold text-muted-foreground hover:text-destructive h-7 px-2 gap-1"
              title="Redefinir carrinho"
            >
              <RefreshCw className="h-3 w-3" />
              Redefinir
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-hidden mt-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p>Seu carrinho está vazio</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="flex flex-col gap-4">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-20 w-20 rounded-md border bg-muted overflow-hidden flex-shrink-0">
                      {item.product_image_url ? (
                        <img 
                          src={item.product_image_url} 
                          alt={item.product_name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          Sem foto
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-medium line-clamp-1">{item.product_name}</h4>
                        {item.color_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            Cor: {item.color_name}
                            {item.color_hex && (
                              <span 
                                className="h-2 w-2 rounded-full inline-block border"
                                style={{ backgroundColor: item.color_hex }}
                              />
                            )}
                          </p>
                        )}
                        <p className="text-sm font-bold mt-1">
                          {formatCurrency(item.product_price)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            disabled={updateQuantity.isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              const currentQty = getOptimisticQuantity(item.id);
                              updateQuantity.mutate({ itemId: item.id, quantity: currentQty - 1 });
                            }}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-6 text-center font-medium tabular-nums">
                            {getOptimisticQuantity(item.id)}
                          </span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            disabled={updateQuantity.isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              const currentQty = getOptimisticQuantity(item.id);
                              updateQuantity.mutate({ itemId: item.id, quantity: currentQty + 1 });
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={() => removeItem.mutate(item.id)}
                          disabled={removeItem.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {items.length > 0 && (
          <div className="mt-auto pt-4 space-y-4">
            {threshold > 0 && (
              <div 
                className={`space-y-2 p-3 rounded-lg border transition-all duration-300 ${isOverThreshold ? "bg-destructive/5 border-destructive/20 shadow-[0_0_12px_rgba(239,68,68,0.1)]" : "bg-muted/30 border-border/50"}`}
                role="region" 
                aria-label="Informações de Alçada e Aprovação"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className={isOverThreshold ? "h-4 w-4 text-destructive animate-pulse" : "h-4 w-4 text-primary"} aria-hidden="true" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Limite de Alçada</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" aria-label="Mais informações sobre o limite de alçada">
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px] text-xs">
                        {isOverThreshold 
                          ? "Este pedido excede sua alçada e exigirá aprovação do Gestor da Singular."
                          : `Você pode aprovar pedidos de até ${formatCurrency(threshold)} automaticamente.`}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="space-y-1">
                  <Progress 
                    value={thresholdProgress} 
                    className="h-1.5" 
                    aria-label={`Progresso do limite de alçada: ${thresholdProgress.toFixed(0)}%`}
                  />
                  
                  <div className="flex items-center justify-between text-[10px]" aria-live="polite">
                    <span className={isOverThreshold ? "text-destructive font-bold" : "text-muted-foreground"}>
                      {isOverThreshold ? "⚠️ Limite Excedido" : `${thresholdProgress.toFixed(0)}% do limite`}
                    </span>
                    <span className="font-bold">
                      {isOverThreshold 
                        ? `Excesso: ${formatCurrency(subtotal - threshold)}`
                        : `Restam ${formatCurrency(remaining)}`}
                    </span>
                  </div>
                </div>

                {isOverThreshold && (
                  <div 
                    className="flex items-center gap-1.5 mt-2 text-[10px] text-destructive font-semibold bg-destructive/10 p-2 rounded border border-destructive/20"
                    role="alert"
                    aria-live="assertive"
                  >
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Requer aprovação da Singular após finalização</span>
                  </div>
                )}
              </div>
            )}

            <Separator />
            <CouponInput />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>
            <SheetFooter>
              <Button asChild className="w-full">
                <Link to="/checkout">Finalizar Compra</Link>
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
