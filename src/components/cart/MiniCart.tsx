
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
import { ShoppingCart, Trash2, Plus, Minus, ShieldCheck, AlertCircle, Info } from "lucide-react";
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
  const { items, subtotal, totalItemsCount, removeItem, updateQuantity, clearCart } = useCart();
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
                            onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-6 text-center">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeItem.mutate(item.id)}
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
              <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className={isOverThreshold ? "h-4 w-4 text-destructive" : "h-4 w-4 text-primary"} />
                    <span className="text-xs font-semibold uppercase tracking-wider">Limite de Alçada</span>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px] text-xs">
                        {isOverThreshold 
                          ? "Este pedido excede sua alçada e exigirá aprovação do Gestor da Singular."
                          : `Você pode aprovar pedidos de até ${formatCurrency(threshold)} automaticamente.`}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <Progress value={thresholdProgress} className="h-1.5" />
                
                <div className="flex items-center justify-between text-[10px]">
                  <span className={isOverThreshold ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {isOverThreshold ? "Limite Excedido" : `${thresholdProgress.toFixed(0)}% do limite`}
                  </span>
                  <span className="font-medium">
                    {isOverThreshold 
                      ? `+${formatCurrency(subtotal - threshold)}`
                      : `Restam ${formatCurrency(remaining)}`}
                  </span>
                </div>

                {isOverThreshold && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-destructive bg-destructive/5 p-1.5 rounded border border-destructive/10 animate-pulse">
                    <AlertCircle className="h-3 w-3" />
                    <span>Requer aprovação da Singular</span>
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
