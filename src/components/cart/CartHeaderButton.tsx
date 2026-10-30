/**
 * CartHeaderButton - Ícone de carrinho no header com popover de resumo
 */

import { ShoppingCart, Trash2, Plus, Building2, Package, X, ArrowRight, Eraser, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSellerCartContext } from "@/contexts/SellerCartContext";
import { CartCompanyPicker } from "./CartCompanyPicker";
import { cn } from "@/lib/utils";
import { useState, useEffect, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SellerCart, SellerCartItem } from "@/hooks/useSellerCarts";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CartLogo({ cart, active }: { cart: SellerCart; active: boolean }) {
  if (cart.company_logo_url) return <img src={cart.company_logo_url} alt="Logo da empresa" className="w-9 h-9 rounded-lg object-contain bg-background border border-border/50 flex-shrink-0 p-0.5" loading="lazy" />;
  return <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}><Building2 className="h-4 w-4" /></div>;
}

function CartCount({ count, active }: { count: number; active: boolean }) {
  if (count === 0) return null;
  return <span className={cn("text-[10px] font-bold tabular-nums rounded-full px-2 py-0.5", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>{count} {count === 1 ? "item" : "itens"}</span>;
}

function CartItemPreview({ item, removeItem, updateQuantity }: { item: SellerCartItem; removeItem: (id: string) => void; updateQuantity: (id: string, quantity: number) => void }) {
  const decrease = (event: MouseEvent) => {
    event.stopPropagation();
    if (item.quantity <= 1) removeItem(item.id);
    else updateQuantity(item.id, item.quantity - 1);
  };
  return <div data-testid="cart-item" data-cart-item-id={item.id} data-product-id={item.product_id} className="flex items-start gap-2.5 py-1.5 px-1.5 rounded-lg hover:bg-background/60 group/item transition-colors">{item.product_image_url ? <img src={item.product_image_url} alt={`Foto de ${item.product_name}`} className="w-9 h-9 rounded-lg object-contain bg-background border border-border/30 flex-shrink-0 p-0.5 mt-0.5" loading="lazy" /> : <div className="w-9 h-9 rounded-lg bg-muted/40 flex flex-shrink-0 items-center justify-center mt-0.5"><Package className="h-3.5 w-3.5 text-muted-foreground/50" /></div>}<div className="flex-1 min-w-0"><p data-testid="cart-item-name" className="text-xs text-foreground/90 leading-tight line-clamp-2">{item.product_name}</p><div className="flex items-center justify-between mt-1.5 gap-2"><span className="text-[11px] font-semibold text-primary tabular-nums">{formatCurrency(item.product_price)}</span><div data-testid="cart-item-qty-stepper" className="flex items-center gap-0 border border-border/50 rounded-md overflow-hidden"><button data-testid="cart-qty-decrement" className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label={`Diminuir quantidade de ${item.product_name}`} onClick={decrease}>{item.quantity <= 1 ? <Trash2 data-testid="cart-qty-remove-icon" className="h-3 w-3 text-destructive" /> : <Minus data-testid="cart-qty-decrement-icon" className="h-3 w-3" />}</button><span data-testid="cart-qty-badge" data-qty={item.quantity} className="h-6 min-w-[28px] flex items-center justify-center text-[11px] font-bold tabular-nums bg-muted/20 border-x border-border/30">{item.quantity}</span><button data-testid="cart-qty-increment" className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label={`Aumentar quantidade de ${item.product_name}`} onClick={(event) => { event.stopPropagation(); updateQuantity(item.id, item.quantity + 1); }}><Plus className="h-3 w-3" /></button></div></div></div><button data-testid="cart-item-action-remove" className="h-5 w-5 flex items-center justify-center opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all flex-shrink-0 rounded mt-0.5" aria-label={`Remover ${item.product_name} do orçamento`} onClick={(event) => { event.stopPropagation(); removeItem(item.id); }}><X className="h-3 w-3" /></button></div>;
}

function CartItemsPreview({ cart, active, removeItem, updateQuantity }: { cart: SellerCart; active: boolean; removeItem: (id: string) => void; updateQuantity: (id: string, quantity: number) => void }) {
  if (!active || cart.items.length === 0) return null;
  return <div className="border-t border-border/30 px-3 py-2 space-y-1.5">{cart.items.slice(0, 5).map((item) => <CartItemPreview key={item.id} item={item} removeItem={removeItem} updateQuantity={updateQuantity} />)}{cart.items.length > 5 ? <p className="text-[10px] text-muted-foreground text-center py-1">+{cart.items.length - 5} mais itens</p> : null}</div>;
}

function CartSummaryCard({ cart, active, onActivate, onDelete, removeItem, updateQuantity }: { cart: SellerCart; active: boolean; onActivate: () => void; onDelete: () => void; removeItem: (id: string) => void; updateQuantity: (id: string, quantity: number) => void }) {
  const clear = (event: MouseEvent) => { event.stopPropagation(); cart.items.forEach((item) => removeItem(item.id)); };
  const remove = (event: MouseEvent) => { event.stopPropagation(); onDelete(); };
  return <div data-testid="cart-tab" data-cart-id={cart.id} data-active={active ? "true" : "false"} className={cn("rounded-xl border transition-all duration-200 cursor-pointer group", active ? "border-primary/30 bg-primary/5" : "border-border/40 hover:border-border/60 hover:bg-muted/30")} onClick={onActivate}><div className="flex items-center gap-2.5 px-3 py-2.5"><CartLogo cart={cart} active={active} /><div className="min-w-0 flex-1"><p className={cn("text-[13px] font-semibold truncate leading-tight", active ? "text-primary" : undefined)}>{cart.company_name}</p>{cart.company_location ? <p className="text-[11px] text-muted-foreground mt-0.5">{cart.company_location}</p> : null}</div><div className="flex items-center gap-1.5 flex-shrink-0"><CartCount count={cart.items.length} active={active} />{active && cart.items.length > 0 ? <Tooltip><TooltipTrigger asChild><button className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" aria-label={`Limpar seleção de ${cart.company_name}`} onClick={clear}><Eraser className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" className="text-[11px]">Limpar seleção</TooltipContent></Tooltip> : null}<Tooltip><TooltipTrigger asChild><button className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" aria-label={`Excluir orçamento de ${cart.company_name}`} style={{ opacity: active ? 1 : undefined }} onClick={remove}><Trash2 className="h-3.5 w-3.5" /></button></TooltipTrigger><TooltipContent side="top" className="text-[11px]">Excluir orçamento em preparação</TooltipContent></Tooltip></div></div><CartItemsPreview cart={cart} active={active} removeItem={removeItem} updateQuantity={updateQuantity} /></div>;
}

export function CartHeaderButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Listen for FAB "open cart" event
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-seller-cart", handler);
    return () => window.removeEventListener("open-seller-cart", handler);
  }, []);

  // Keyboard shortcut: Alt+O to toggle cart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  const {
    carts,
    activeCart,
    activeCartId,
    totalItems,
    canCreateCart,
    setActiveCartId,
    deleteCart,
    removeItem,
    updateItemQuantity,
  } = useSellerCartContext();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid="cart-trigger"
                className="relative h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200"
               aria-label="Meu orçamento"><ShoppingCart className="h-[17px] w-[17px]" strokeWidth={1.75} />
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-bold rounded-full bg-primary text-primary-foreground shadow-sm animate-in zoom-in-50">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent className="bg-card border-border text-xs">
          Orçamentos em preparação <kbd className="ml-1.5 px-1 py-0.5 bg-muted rounded text-[9px] font-mono">Alt+O</kbd>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        data-testid="cart-drawer"
        className="w-[min(420px,calc(100vw-1rem))] overflow-hidden rounded-xl border-border/50 p-0 shadow-xl"
        align="end"
        sideOffset={8}
        onCloseAutoFocus={() => setShowPicker(false)}
      >
        <AnimatePresence mode="wait">
          {showPicker ? (
            <motion.div
              key="picker"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold">Novo orçamento</h3>
                <Button
                  variant="ghost"
                  size="icon" aria-label="Fechar"
                  className="h-6 w-6"
                  onClick={() => setShowPicker(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CartCompanyPicker
                onCreated={() => setShowPicker(false)}
                onCancel={() => setShowPicker(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="carts"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
            >
              {/* Header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingCart className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-sm">Orçamentos em preparação</h3>
                  <button
                    className="text-[10px] text-muted-foreground hover:text-primary font-medium underline-offset-2 hover:underline transition-colors"
                    onClick={() => { setOpen(false); navigate("/carrinhos"); }}
                  >
                    Ver todos →
                  </button>
                  <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
                    {carts.length}/3
                  </span>
                </div>
                {canCreateCart && (
                  <Button
                    data-testid="cart-tab-new"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] gap-1 px-2.5 rounded-lg border-dashed border-primary/30 text-primary hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                    onClick={() => setShowPicker(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Novo
                  </Button>
                )}
              </div>

              {carts.length === 0 ? (
                <div className="px-4 pb-5 pt-6 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/30 flex items-center justify-center">
                    <Package className="h-7 w-7 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium mb-1">Nenhum orçamento iniciado</p>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[220px] mx-auto">
                    Inicie um orçamento para reunir produtos e quantidades
                  </p>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs rounded-lg"
                    onClick={() => setShowPicker(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Iniciar orçamento
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[440px]">
                    <div className="p-3 space-y-2">
                      {carts.map((cart) => <CartSummaryCard key={cart.id} cart={cart} active={cart.id === activeCartId} onActivate={() => setActiveCartId(cart.id)} onDelete={() => deleteCart(cart.id)} removeItem={removeItem} updateQuantity={updateItemQuantity} />)}
                    </div>
                  </ScrollArea>

                  {/* CTA Footer with subtotal */}
                  {activeCart && activeCart.items.length > 0 && (() => {
                    const subtotal = activeCart.items.reduce(
                      (sum, item) => sum + item.product_price * item.quantity,
                      0
                    );
                    return (
                      <div className="p-3 border-t border-border/40 space-y-2">
                        {/* Subtotal */}
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs text-muted-foreground">
                            Subtotal ({activeCart.items.length} {activeCart.items.length === 1 ? "item" : "itens"})
                          </span>
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <Button
                          className="w-full gap-2 text-xs h-10 rounded-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => {
                            const cartIdToDelete = activeCart.id;
                            setOpen(false);
                            navigate("/orcamentos/novo", {
                              state: {
                                fromCart: true,
                                cartId: cartIdToDelete,
                                companyId: activeCart.company_id,
                                companyName: activeCart.company_name,
                                companyLocation: activeCart.company_location,
                                items: activeCart.items.map(i => ({
                                  product_id: i.product_id,
                                  product_name: i.product_name,
                                  product_sku: i.product_sku,
                                  product_image_url: i.product_image_url,
                                  unit_price: i.product_price,
                                  quantity: i.quantity,
                                  color_name: i.color_name,
                                  color_hex: i.color_hex,
                                })),
                              },
                            });
                            deleteCart(cartIdToDelete);
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                          Gerar Orçamento
                        </Button>
                      </div>
                    );
                  })()}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
