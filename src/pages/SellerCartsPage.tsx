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
import { useCallback, useMemo, useRef } from 'react';

// import { MainLayout } from "@/components/layout/MainLayout";
import { type CartStatus } from '@/hooks/useSellerCarts';
import type { CartTemplateItem } from '@/hooks/cart/useCartTemplates';
import { CartCompanyPickerDialog } from '@/components/cart/CartCompanyPickerDialog';
import { CartTabsRich } from '@/components/cart/CartTabsRich';
import { CartEmptyStateSmart } from '@/components/cart/CartEmptyStateSmart';
import { SortableCartItem } from '@/components/cart/SortableCartItem';
import {
  getStatusCfg,
  STATUS_CONFIG,
  CartItemSkeleton,
  FollowUpTimer,
  CompareCartsDialog,
  MobileSummarySheet,
  formatCurrency,
} from '@/components/cart/CartUtilComponents';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { DeleteConfirmDialog, ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { ShoppingCart, Plus, Building2, Trash2, Clock, MapPin, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageSEO } from '@/components/seo/PageSEO';
import { useSellerCartsPage } from './seller-carts/useSellerCartsPage';
import { CartSidebar } from './seller-carts/CartSidebar';

export default function SellerCartsPage() {
  return (
    <>
      <PageSEO
        title="Carrinhos"
        description="Gerencie carrinhos de seleção de produtos para seus clientes."
        path="/carrinhos"
        noIndex
      />
      <SellerCartsContent />
    </>
  );
}

const NOTES_PLACEHOLDERS = [
  'Cliente quer entrega para o evento dia DD/MM...',
  'Negociar prazo 30/60/90 dias...',
  'Aprovar arte até dia X — produção começa após confirmação...',
  'Margem-alvo: XX%. Frete por conta do cliente.',
];

type SellerCartsState = ReturnType<typeof useSellerCartsPage>;
type ActiveCart = NonNullable<SellerCartsState['activeCart']>;

function useCartNotesFocus() {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const focusNotes = useCallback(() => {
    notesRef.current?.focus();
    notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);
  return { notesRef, focusNotes };
}

function useSellerCartComputed(state: SellerCartsState) {
  const aggregateTotal = useMemo(
    () =>
      state.carts.reduce(
        (sum, c) => sum + c.items.reduce((a, i) => a + i.product_price * i.quantity, 0),
        0,
      ),
    [state.carts],
  );
  const notesPlaceholder = useMemo(() => {
    if (!state.activeCart) return NOTES_PLACEHOLDERS[0] ?? '';
    const seed = state.activeCart.id.charCodeAt(0) % NOTES_PLACEHOLDERS.length;
    return NOTES_PLACEHOLDERS[seed] ?? '';
  }, [state.activeCart]);
  const handleDuplicateLast = useCallback(
    (sourceCart: typeof state.activeCart) => {
      if (!sourceCart) return;
      sourceCart.items.forEach((i) => {
        state.handleLoadTemplate([
          {
            product_id: i.product_id,
            product_name: i.product_name,
            product_sku: i.product_sku || undefined,
            product_image_url: i.product_image_url || undefined,
            product_price: i.product_price,
            quantity: i.quantity,
            color_name: i.color_name || undefined,
            color_hex: i.color_hex || undefined,
          },
        ]);
      });
    },
    [state],
  );
  return { aggregateTotal, notesPlaceholder, handleDuplicateLast };
}

function SellerCartsContent() {
  const s = useSellerCartsPage();
  const { notesRef, focusNotes } = useCartNotesFocus();
  const computed = useSellerCartComputed(s);

  return (
    <div className="mx-auto w-full max-w-[1920px] animate-fade-in space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-4 md:pb-6 lg:px-6 xl:px-8">
      <SellerCartsHeader state={s} aggregateTotal={computed.aggregateTotal} />
      <CartCompanyPickerDialog
        open={s.showNewCart}
        onOpenChange={s.setShowNewCart}
        onCreated={() => s.setShowNewCart(false)}
      />
      <SellerCartTabs state={s} />
      <SellerCartBody
        state={s}
        notesRef={notesRef}
        notesPlaceholder={computed.notesPlaceholder}
        onDuplicateLast={computed.handleDuplicateLast}
        onFocusNotes={focusNotes}
      />
      <SellerCartDialogs state={s} />
    </div>
  );
}

function SellerCartsHeader({
  state,
  aggregateTotal,
}: {
  state: SellerCartsState;
  aggregateTotal: number;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <SellerCartHeaderSummary state={state} aggregateTotal={aggregateTotal} />
      <div className="flex items-center gap-2">
        {state.carts.length >= 2 && <CompareCartsDialog carts={state.carts} />}
        {state.canCreateCart && (
          <Button
            onClick={() => state.setShowNewCart(true)}
            size="sm"
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Carrinho
          </Button>
        )}
      </div>
    </header>
  );
}

function SellerCartHeaderSummary({
  state,
  aggregateTotal,
}: {
  state: SellerCartsState;
  aggregateTotal: number;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <ShoppingCart className="h-4.5 w-4.5 text-primary" />
      </div>
      <div className="min-w-0">
        <h1
          data-testid="page-title-carrinhos"
          className="font-display text-xl font-bold leading-tight text-foreground lg:text-2xl"
        >
          Carrinhos
        </h1>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{state.carts.length}</span>
          <span className="text-muted-foreground/50">·</span>
          <span className="tabular-nums">{state.totalItems} itens</span>
          {aggregateTotal > 0 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-medium tabular-nums text-foreground/80">
                {formatCurrency(aggregateTotal)}
              </span>
            </>
          )}
          <span
            className="ml-2 hidden items-center gap-1 text-muted-foreground/50 sm:inline-flex"
            title="Buscar produtos"
          >
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl+K</kbd>
          </span>
        </p>
      </div>
    </div>
  );
}

function SellerCartTabs({ state }: { state: SellerCartsState }) {
  if (state.carts.length === 0) return null;
  return (
    <CartTabsRich
      carts={state.carts}
      activeCartId={state.activeCartId}
      canCreateCart={state.canCreateCart}
      onSelect={state.setActiveCartId}
      onNew={() => state.setShowNewCart(true)}
    />
  );
}

interface SellerCartBodyProps {
  state: SellerCartsState;
  notesRef: { current: HTMLTextAreaElement | null };
  notesPlaceholder: string;
  onDuplicateLast: (cart: SellerCartsState['activeCart']) => void;
  onFocusNotes: () => void;
}

function SellerCartBody(props: SellerCartBodyProps) {
  const { state } = props;
  if (state.isLoading) return <SellerCartLoading />;
  if (state.carts.length === 0) {
    return (
      <EmptyState
        variant="cart"
        title="Monte o carrinho perfeito para seu cliente"
        description="Crie carrinhos vinculados a empresas, adicione produtos do catálogo e gere orçamentos profissionais em segundos."
        action={{ label: 'Criar Primeiro Carrinho', onClick: () => state.setShowNewCart(true) }}
      />
    );
  }
  if (!state.activeCart) return null;
  return <ActiveCartWorkspace {...props} cart={state.activeCart} />;
}

function SellerCartLoading() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <CartItemSkeleton key={index} />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

function ActiveCartWorkspace(props: SellerCartBodyProps & { cart: ActiveCart }) {
  const { state, cart, notesRef, notesPlaceholder, onDuplicateLast, onFocusNotes } = props;
  return (
    <>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <ActiveCartHeader state={state} cart={cart} />
          <FollowUpTimer createdAt={cart.created_at} />
          <CartNotes state={state} notesRef={notesRef} placeholder={notesPlaceholder} />
          <ActiveCartItems state={state} cart={cart} onDuplicateLast={onDuplicateLast} />
        </div>
        {cart.items.length > 0 && (
          <ActiveCartSidebar state={state} cart={cart} onFocusNotes={onFocusNotes} />
        )}
      </div>
      <MobileSummarySheet
        cart={cart}
        subtotal={state.cartSubtotal}
        totalQty={state.cartTotalQty}
        onGenerateQuote={() => state.handleGenerateQuote(cart)}
      />
    </>
  );
}

function ActiveCartHeader({ state, cart }: { state: SellerCartsState; cart: ActiveCart }) {
  const accentStyle = state.companyAccentColor
    ? { borderTopColor: state.companyAccentColor, borderTopWidth: '3px' }
    : undefined;
  return (
    <Card
      className="flex flex-col justify-between gap-3 border-border/40 p-3.5 sm:flex-row sm:items-center"
      style={accentStyle}
    >
      <CartCompanyIdentity cart={cart} />
      <CartHeaderActions state={state} cart={cart} />
    </Card>
  );
}

function CartCompanyIdentity({ cart }: { cart: ActiveCart }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CartCompanyLogo cart={cart} />
      <div className="min-w-0">
        <h2 className="truncate font-display text-base font-semibold">{cart.company_name}</h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {cart.company_location && (
            <span className="flex items-center gap-1 truncate">
              <MapPin className="h-3 w-3" />
              {cart.company_location}
            </span>
          )}
          <span className="flex items-center gap-1 whitespace-nowrap">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(cart.updated_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
}

function CartHeaderActions({ state, cart }: { state: SellerCartsState; cart: ActiveCart }) {
  return (
    <div className="flex flex-shrink-0 items-center gap-2">
      <Select
        value={cart.status}
        onValueChange={(value) => state.updateCartStatus(cart.id, value as CartStatus)}
      >
        <SelectTrigger className="h-8 w-auto min-w-[150px] gap-1.5 text-xs">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              getStatusCfg(cart.status).color.split(' ')[0],
            )}
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(
            Object.entries(STATUS_CONFIG) as [CartStatus, (typeof STATUS_CONFIG)[CartStatus]][]
          ).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              <span className="flex items-center gap-2">
                <span className={cn('h-1.5 w-1.5 rounded-full', config.color.split(' ')[0])} />
                {config.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs text-destructive hover:text-destructive"
        onClick={() => state.setConfirmDeleteCart(true)}
      >
        <Trash2 className="h-3.5 w-3.5" /> Excluir
      </Button>
    </div>
  );
}

function CartCompanyLogo({ cart }: { cart: ActiveCart }) {
  if (cart.company_logo_url) {
    return (
      <img
        src={cart.company_logo_url}
        alt=""
        className="h-10 w-10 flex-shrink-0 rounded-xl border border-border/50 bg-background object-contain p-1"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
      <Building2 className="h-4.5 w-4.5 text-primary" />
    </div>
  );
}

function CartNotes({
  state,
  notesRef,
  placeholder,
}: {
  state: SellerCartsState;
  notesRef: { current: HTMLTextAreaElement | null };
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="cart-notes"
        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
      >
        <FileText className="h-3.5 w-3.5" /> Notas da negociação
      </label>
      <Textarea
        id="cart-notes"
        ref={notesRef}
        value={state.localCartNotes}
        onChange={(event) => state.handleCartNotesChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[64px] resize-y text-sm"
        rows={2}
      />
    </div>
  );
}

function ActiveCartItems({
  state,
  cart,
  onDuplicateLast,
}: {
  state: SellerCartsState;
  cart: ActiveCart;
  onDuplicateLast: (cart: SellerCartsState['activeCart']) => void;
}) {
  if (cart.items.length === 0) {
    return (
      <CartEmptyStateSmart
        activeCart={cart}
        templates={
          state.templates as {
            id: string;
            name: string;
            description?: string;
            items: CartTemplateItem[];
          }[]
        }
        otherCarts={state.otherCarts}
        onApplyTemplate={state.handleLoadTemplate}
        onDuplicateLast={onDuplicateLast}
        onNavigateProducts={() => state.navigate('/produtos')}
      />
    );
  }
  return <SortableCartItemsGrid state={state} cart={cart} />;
}

function SortableCartItemsGrid({ state, cart }: { state: SellerCartsState; cart: ActiveCart }) {
  return (
    <DndContext
      sensors={state.sensors}
      collisionDetection={closestCenter}
      onDragEnd={state.handleDragEnd}
    >
      <SortableContext items={cart.items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {cart.items.map((item, index) => (
              <SortableCartItem
                key={item.id}
                item={item}
                index={index}
                otherCarts={state.otherCarts}
                companyAccentColor={state.companyAccentColor}
                stockMap={state.stockMap}
                onRemove={state.handleRemoveItem}
                onUpdateQuantity={state.handleUpdateQuantity}
                onUpdateNotes={state.updateItemNotes}
                onMoveToCart={state.handleMoveItem}
                onDuplicateToCart={state.handleDuplicateItem}
                onNavigate={state.navigate}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function ActiveCartSidebar({
  state,
  cart,
  onFocusNotes,
}: {
  state: SellerCartsState;
  cart: ActiveCart;
  onFocusNotes: () => void;
}) {
  const duplicate = (id: string) => {
    if (state.canCreateCart) state.duplicateCart(id);
    else toast.error('Limite de 3 carrinhos atingido');
  };
  return (
    <CartSidebar
      cart={cart}
      otherCarts={state.otherCarts}
      cartSubtotal={state.cartSubtotal}
      cartTotalQty={state.cartTotalQty}
      cartAge={state.cartAge}
      weightVolume={state.weightVolume}
      allProducts={state.allProducts}
      templates={state.templates}
      canCreateCart={state.canCreateCart}
      onGenerateQuote={state.handleGenerateQuote}
      onShareCart={state.shareCartLink}
      onDuplicateCart={duplicate}
      onExportCSV={state.exportCartToCSV}
      onExportPDF={state.exportCartToPDF}
      onSaveTemplate={state.handleSaveTemplate}
      onLoadTemplate={state.handleLoadTemplate}
      onDeleteTemplate={state.deleteTemplate}
      onClear={() => state.setConfirmClearCart(true)}
      onNavigate={state.navigate}
      onSetActiveCartId={state.setActiveCartId}
      onFocusNotes={onFocusNotes}
    />
  );
}

function SellerCartDialogs({ state }: { state: SellerCartsState }) {
  const clearCart = () => {
    state.activeCart?.items.forEach((item) => state.removeItem(item.id));
    toast.success('Carrinho limpo');
    state.setConfirmClearCart(false);
  };
  const deleteCart = () => {
    if (state.activeCart) state.deleteCart(state.activeCart.id);
    state.setConfirmDeleteCart(false);
  };
  return (
    <>
      <ConfirmDialog
        open={Boolean(state.confirmQuoteCart)}
        onOpenChange={(open) => {
          if (!open) state.setConfirmQuoteCart(null);
        }}
        variant="warning"
        title={`Gerar orçamento para ${state.confirmQuoteCart?.company_name}?`}
        description={`Os ${state.confirmQuoteCart?.items.length || 0} itens serão transferidos para um novo orçamento e o carrinho será removido.`}
        confirmLabel="Gerar Orçamento"
        cancelLabel="Cancelar"
        onConfirm={state.confirmGenerateQuote}
        testId="cart-confirm-dialog"
      />
      <DeleteConfirmDialog
        open={state.confirmDeleteCart}
        onOpenChange={state.setConfirmDeleteCart}
        entityName="carrinho"
        itemName={state.activeCart?.company_name}
        onConfirm={deleteCart}
        testId="cart-delete-dialog"
      />
      <ConfirmDialog
        open={state.confirmClearCart}
        onOpenChange={state.setConfirmClearCart}
        variant="warning"
        title="Limpar todos os itens?"
        description={`${state.activeCart?.items.length || 0} itens serão removidos do carrinho de ${state.activeCart?.company_name}.`}
        confirmLabel="Limpar"
        cancelLabel="Cancelar"
        onConfirm={clearCart}
        testId="cart-clear-dialog"
      />
    </>
  );
}
