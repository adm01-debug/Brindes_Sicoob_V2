/**
 * SellerCartsPage - Workspace de carrinhos do vendedor (Onda Excelência UX).
 * - Header compactado (Carrinhos · X · Y · R$ Z)
 * - Picker em Dialog (Recentes/Favoritas/Todas)
 * - Tabs ricas (status dot, contador colorido, indicador follow-up, +novo)
 * - Cart header fundido (status como Select óbvio)
 * - Empty state inteligente (template / duplicar / catálogo)
 * - Notas sempre visíveis (textarea inline com debounce)
 * - Sidebar reorganizada (Hero pricing → Ação → Menu) + Health Checklist
 */
import { useCallback, useMemo, useRef } from "react";

// import { MainLayout } from "@/components/layout/MainLayout";
import { type CartStatus } from "@/hooks/useSellerCarts";
import { CartCompanyPickerDialog } from "@/components/cart/CartCompanyPickerDialog";
import { CartTabsRich } from "@/components/cart/CartTabsRich";
import { CartEmptyStateSmart } from "@/components/cart/CartEmptyStateSmart";
import { SortableCartItem } from "@/components/cart/SortableCartItem";
import {
  getStatusCfg, STATUS_CONFIG, CartItemSkeleton, FollowUpTimer,
  CompareCartsDialog, MobileSummarySheet, formatCurrency,
} from "@/components/cart/CartUtilComponents";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { DeleteConfirmDialog, ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import {
  ShoppingCart, Plus, Building2, Trash2, Clock, MapPin, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PageSEO } from "@/components/seo/PageSEO";
import { useSellerCartsPage } from "./seller-carts/useSellerCartsPage";
import { CartSidebar } from "./seller-carts/CartSidebar";

export default function SellerCartsPage() {
  return (
    <>
      <PageSEO title="Carrinhos" description="Gerencie carrinhos de seleção de produtos para seus clientes." path="/carrinhos" noIndex />
      <SellerCartsContent />
    </>
  );
}

const NOTES_PLACEHOLDERS = [
  "Cliente quer entrega para o evento dia DD/MM...",
  "Negociar prazo 30/60/90 dias...",
  "Aprovar arte até dia X — produção começa após confirmação...",
  "Margem-alvo: XX%. Frete por conta do cliente.",
];

function SellerCartsContent() {
  const s = useSellerCartsPage();
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const focusNotes = useCallback(() => {
    notesRef.current?.focus();
    notesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const aggregateTotal = useMemo(
    () => s.carts.reduce((sum, c) => sum + c.items.reduce((a, i) => a + i.product_price * i.quantity, 0), 0),
    [s.carts]
  );

  // Stable rotating placeholder per cart
  const notesPlaceholder = useMemo(() => {
    if (!s.activeCart) return NOTES_PLACEHOLDERS[0];
    const seed = s.activeCart.id.charCodeAt(0) % NOTES_PLACEHOLDERS.length;
    return NOTES_PLACEHOLDERS[seed];
  }, [s.activeCart]);

  const handleDuplicateLast = useCallback((sourceCart: typeof s.activeCart) => {
    if (!sourceCart) return;
    sourceCart.items.forEach(i => {
      // re-uses the addToActiveCart through handleLoadTemplate-like flow
      s.handleLoadTemplate([{
        product_id: i.product_id, product_name: i.product_name,
        product_sku: i.product_sku || undefined, product_image_url: i.product_image_url || undefined,
        product_price: i.product_price, quantity: i.quantity,
        color_name: i.color_name || undefined, color_hex: i.color_hex || undefined,
      }]);
    });
  }, [s]);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
      {/* Header compactado */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 data-testid="page-title-carrinhos" className="text-xl lg:text-2xl font-display font-bold text-foreground leading-tight">Carrinhos</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span className="tabular-nums">{s.carts.length}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="tabular-nums">{s.totalItems} itens</span>
              {aggregateTotal > 0 && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span className="tabular-nums font-medium text-foreground/80">{formatCurrency(aggregateTotal)}</span>
                </>
              )}
              <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-muted-foreground/50" title="Buscar produtos">
                <kbd className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono">Ctrl+K</kbd>
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.carts.length >= 2 && <CompareCartsDialog carts={s.carts} />}
          {s.canCreateCart && (
            <Button onClick={() => s.setShowNewCart(true)} size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground h-9">
              <Plus className="h-3.5 w-3.5" /> Novo Carrinho
            </Button>
          )}
        </div>
      </header>

      {/* Picker em Dialog */}
      <CartCompanyPickerDialog
        open={s.showNewCart}
        onOpenChange={s.setShowNewCart}
        onCreated={() => s.setShowNewCart(false)}
      />

      {/* Tabs ricas */}
      {s.carts.length > 0 && (
        <CartTabsRich
          carts={s.carts}
          activeCartId={s.activeCartId}
          canCreateCart={s.canCreateCart}
          onSelect={s.setActiveCartId}
          onNew={() => s.setShowNewCart(true)}
        />
      )}

      {/* Conteúdo */}
      {s.isLoading ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <CartItemSkeleton key={i} />)}
          </div>
          <div className="space-y-4"><Skeleton className="h-64 w-full rounded-xl" /></div>
        </div>
      ) : s.carts.length === 0 ? (
        <EmptyState
          variant="cart"
          title="Monte o carrinho perfeito para seu cliente"
          description="Crie carrinhos vinculados a empresas, adicione produtos do catálogo e gere orçamentos profissionais em segundos."
          action={{ label: "Criar Primeiro Carrinho", onClick: () => s.setShowNewCart(true) }}
        />
      ) : s.activeCart ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-4">
            {/* Cart header fundido (status Select óbvio + ações inline) */}
            <Card
              className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border/40"
              style={s.companyAccentColor ? { borderTopColor: s.companyAccentColor, borderTopWidth: "3px" } : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                {s.activeCart.company_logo_url ? (
                  <img src={s.activeCart.company_logo_url} alt="" className="w-10 h-10 rounded-xl object-contain bg-background border border-border/50 p-1 flex-shrink-0" loading="lazy" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4.5 w-4.5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="font-display font-semibold text-base truncate">{s.activeCart.company_name}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {s.activeCart.company_location && (
                      <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{s.activeCart.company_location}</span>
                    )}
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(s.activeCart.updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Select
                  value={s.activeCart.status}
                  onValueChange={(v) => s.updateCartStatus(s.activeCart!.id, v as CartStatus)}
                >
                  <SelectTrigger className="h-8 text-xs w-auto min-w-[150px] gap-1.5">
                    <span className={cn("w-1.5 h-1.5 rounded-full inline-block", getStatusCfg(s.activeCart.status).color.split(" ")[0])} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(STATUS_CONFIG) as [CartStatus, typeof STATUS_CONFIG[CartStatus]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <span className={cn("w-1.5 h-1.5 rounded-full", cfg.color.split(" ")[0])} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1.5 text-xs h-8" onClick={() => s.setConfirmDeleteCart(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </Card>

            <FollowUpTimer createdAt={s.activeCart.created_at} />

            {/* Notas sempre visíveis */}
            <div className="space-y-1.5">
              <label htmlFor="cart-notes" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Notas da negociação
              </label>
              <Textarea
                id="cart-notes"
                ref={notesRef}
                value={s.localCartNotes}
                onChange={(e) => s.handleCartNotesChange(e.target.value)}
                placeholder={notesPlaceholder}
                className="text-sm min-h-[64px] resize-y"
                rows={2}
              />
            </div>

            {/* Produtos */}
            {s.activeCart.items.length === 0 ? (
              <CartEmptyStateSmart
                activeCart={s.activeCart}
                templates={s.templates as { id: string; name: string; description?: string; items: import("@/hooks/useCartTemplates").CartTemplateItem[] }[]}
                otherCarts={s.otherCarts}
                onApplyTemplate={s.handleLoadTemplate}
                onDuplicateLast={handleDuplicateLast}
                onNavigateProducts={() => s.navigate("/produtos")}
              />
            ) : (
              <DndContext sensors={s.sensors} collisionDetection={closestCenter} onDragEnd={s.handleDragEnd}>
                <SortableContext items={s.activeCart.items.map(i => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <AnimatePresence>
                      {s.activeCart.items.map((item, index) => (
                        <SortableCartItem
                          key={item.id} item={item} index={index}
                          otherCarts={s.otherCarts} companyAccentColor={s.companyAccentColor}
                          stockMap={s.stockMap} onRemove={s.handleRemoveItem}
                          onUpdateQuantity={s.handleUpdateQuantity} onUpdateNotes={s.updateItemNotes}
                          onMoveToCart={s.handleMoveItem} onDuplicateToCart={s.handleDuplicateItem}
                          onNavigate={s.navigate}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Sidebar */}
          {s.activeCart.items.length > 0 && (
            <CartSidebar
              cart={s.activeCart} otherCarts={s.otherCarts}
              cartSubtotal={s.cartSubtotal} cartTotalQty={s.cartTotalQty}
              cartAge={s.cartAge} weightVolume={s.weightVolume}
              allProducts={s.allProducts} templates={s.templates}
              canCreateCart={s.canCreateCart}
              onGenerateQuote={s.handleGenerateQuote}
              onShareCart={s.shareCartLink}
              onDuplicateCart={(id) => {
                if (s.canCreateCart) s.duplicateCart(id);
                else toast.error("Limite de 3 carrinhos atingido");
              }}
              onExportCSV={s.exportCartToCSV}
              onExportPDF={s.exportCartToPDF}
              onSaveTemplate={s.handleSaveTemplate}
              onLoadTemplate={s.handleLoadTemplate}
              onDeleteTemplate={s.deleteTemplate}
              onClear={() => s.setConfirmClearCart(true)}
              onNavigate={s.navigate}
              onSetActiveCartId={s.setActiveCartId}
              onFocusNotes={focusNotes}
            />
          )}
        </div>
      ) : null}

      {/* Mobile summary */}
      {s.activeCart && (
        <MobileSummarySheet cart={s.activeCart} subtotal={s.cartSubtotal} totalQty={s.cartTotalQty} onGenerateQuote={() => s.handleGenerateQuote(s.activeCart!)} />
      )}

      {/* Dialogs */}
      <ConfirmDialog
        open={!!s.confirmQuoteCart}
        onOpenChange={(open) => { if (!open) s.setConfirmQuoteCart(null); }}
        variant="warning"
        title={`Gerar orçamento para ${s.confirmQuoteCart?.company_name}?`}
        description={`Os ${s.confirmQuoteCart?.items.length || 0} itens serão transferidos para um novo orçamento e o carrinho será removido.`}
        confirmLabel="Gerar Orçamento" cancelLabel="Cancelar"
        onConfirm={s.confirmGenerateQuote}
        testId="cart-confirm-dialog"
      />
      <DeleteConfirmDialog
        open={s.confirmDeleteCart} onOpenChange={s.setConfirmDeleteCart}
        entityName="carrinho" itemName={s.activeCart?.company_name}
        onConfirm={() => { if (s.activeCart) s.deleteCart(s.activeCart.id); s.setConfirmDeleteCart(false); }}
        testId="cart-delete-dialog"
      />
      <ConfirmDialog
        open={s.confirmClearCart} onOpenChange={s.setConfirmClearCart}
        variant="warning" title="Limpar todos os itens?"
        description={`${s.activeCart?.items.length || 0} itens serão removidos do carrinho de ${s.activeCart?.company_name}.`}
        confirmLabel="Limpar" cancelLabel="Cancelar"
        onConfirm={() => { s.activeCart?.items.forEach(i => s.removeItem(i.id)); toast.success("Carrinho limpo"); s.setConfirmClearCart(false); }}
        testId="cart-clear-dialog"
      />
    </div>
  );
}
