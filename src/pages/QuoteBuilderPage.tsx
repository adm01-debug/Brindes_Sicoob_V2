/**
 * QuoteBuilderPage — Módulo de criação/edição de orçamentos
 * Refatorado: lógica em useQuoteBuilderState, UI em sub-componentes.
 */

import { useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  FileText, Plus, Save, Send, Package, Loader2, BookTemplate, ArrowLeft,
  Edit, AlertTriangle, Calendar as CalendarIcon, Lock, Layers, X
} from "lucide-react";
import { toast } from "sonner";
import { Sparkles, ExternalLink } from "lucide-react";
import { format, addDays } from "date-fns";

import { QuoteTemplateSelector } from "@/components/quotes/QuoteTemplateSelector";
import { SaveAsTemplateButton } from "@/components/quotes/SaveAsTemplateButton";
import { QuoteProductCustomization } from "@/components/quotes/QuoteProductCustomization";
import { QuoteClientSelector } from "@/components/quotes/QuoteClientSelector";
import { QuoteProductSelector } from "@/components/quotes/QuoteProductSelector";
import { QuoteItemsList } from "@/components/quotes/QuoteItemsList";
import { QuoteSummary } from "@/components/quotes/QuoteSummary";
import { QuoteAutoSave } from "@/components/quotes/QuoteAutoSave";
import { QuoteBuilderStepper } from "@/components/quotes/QuoteBuilderStepper";
import { QuoteBuilderSummaryColumn } from "@/components/quotes/QuoteBuilderSummaryColumn";
import { CommercialConditions } from "@/components/quotes/builder/CommercialConditions";
import { ValidityPicker } from "@/components/quotes/builder/ValidityPicker";
import { useQuoteBuilderState } from "@/hooks/useQuoteBuilderState";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "@/components/common/UnsavedChangesDialog";
import { TagManager } from "@/components/quotes/TagManager";

export default function QuoteBuilderPage() {
  const s = useQuoteBuilderState();
  const { showDialog, guardNavigation, confirmLeave, cancelLeave, message } = useUnsavedChangesGuard({
    hasUnsavedChanges: s.hasUnsavedData,
  });

  if (s.loadingQuote) {
    return (
      <>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageSEO title={s.quoteId ? "Editar Orçamento" : "Novo Orçamento"} description="Crie e edite orçamentos com seleção de produtos e personalização." path="/orcamentos/novo" noIndex />

      <QuoteAutoSave
        quoteId={s.quoteId}
        data={{ clientId: s.clientId, validUntil: s.validUntil, discountType: s.discountType, discountValue: s.discountValue, notes: s.notes, internalNotes: s.internalNotes, items: s.items, tags: s.tags }}
        onRestore={(data) => {
          s.setClientId(data.clientId || "");
          s.setValidUntil(data.validUntil || format(addDays(new Date(), 30), "yyyy-MM-dd"));
          s.setDiscountType(data.discountType || "percent");
          s.setDiscountValue(data.discountValue || 0);
          s.setNotes(data.notes || "");
          s.setInternalNotes(data.internalNotes || "");
          s.setItems(data.items || []);
          s.setTags(data.tags || []);
          toast.success("Rascunho restaurado!");
        }}
        className="fixed top-20 right-4 z-40"
      />

      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" aria-label="Voltar" onClick={() => guardNavigation(() => s.navigate(-1))}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 data-testid="page-title-orcamento-novo" className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    {s.isEditMode ? <Edit className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />}
                  </div>
                  {s.isEditMode ? "Editar Orçamento" : "Novo Orçamento"}
                </h1>
                {!s.canEdit && (
                  <Badge variant="outline" className="gap-1 bg-muted/50">
                    <Lock className="h-3 w-3" /> Somente Leitura
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {s.isEditMode && s.quoteNumber ? <>Editando: <strong>{s.quoteNumber}</strong></> : "Crie um orçamento com produtos e personalizações"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!s.isEditMode && (
              <QuoteTemplateSelector
                onSelect={s.applyTemplate}
              />
            )}
            {s.items.length > 0 && (
              <SaveAsTemplateButton
                quoteData={{
                  items: s.getTemplateItems(),
                  discount_percent: s.discountType === "percent" ? s.discountValue : 0,
                  notes: s.notes,
                  payment_terms: s.payment_terms,
                  delivery_time: s.delivery_time
                }}
              />
            )}
          </div>
        </div>

        {/* Stepper */}
        <QuoteBuilderStepper completedSteps={s.completedSteps} />

        {/* Template notifications */}
        {s.templateApplied && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookTemplate className="h-4 w-4 text-primary" />
                <span className="text-sm">Template <strong>"{s.templateApplied}"</strong> aplicado</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => s.setTemplateApplied(null)}>Fechar</Button>
            </CardContent>
          </Card>
        )}

        {!s.isEditMode && s.defaultTemplate && s.items.length === 0 && !s.templateApplied && (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookTemplate className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Template padrão disponível</p>
                  <p className="text-sm text-muted-foreground">Use "{s.defaultTemplate.name}" para começar rapidamente</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => s.applyTemplate(s.defaultTemplate!)}>Aplicar Template</Button>
            </CardContent>
          </Card>
        )}

        {/* 3-column layout */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* COL 1 — Cliente + Condições */}
          <div className={cn("lg:col-span-3", !s.canEdit && "pointer-events-none grayscale-[0.3] opacity-80")}>
            <div className="sticky top-24 space-y-3 overflow-y-auto max-h-[calc(100vh-7rem)] pr-1">
              {/* Empresa + Contato */}
              <div className={cn("rounded-2xl border bg-card p-4 space-y-4", (s.validationErrors.includes("empresa") || s.validationErrors.includes("contato")) ? "border-destructive/50" : "border-border/50")}>
                <QuoteClientSelector
                  clientId={s.clientId}
                  contactId={s.contactId}
                  onClientChange={s.setClientId}
                  onContactChange={s.setContactId}
                  onClientInfoChange={s.setCompanyInfo}
                  onContactInfoChange={s.setContactInfo}
                />
                {(s.validationErrors.includes("empresa") || s.validationErrors.includes("contato")) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {s.validationErrors.includes("empresa") ? "Selecione uma empresa" : "Selecione um contato"}
                  </p>
                )}
              </div>

              {/* Validade */}
              <ValidityPicker
                validityDays={s.validityDays}
                setValidityDays={s.setValidityDays}
                setValidUntil={s.setValidUntil}
              />

              {/* Condições Comerciais */}
              <CommercialConditions
                paymentTerms={s.paymentTerms}
                setPaymentTerms={s.setPaymentTerms}
                deliveryMode={s.deliveryMode}
                setDeliveryMode={s.setDeliveryMode}
                deliveryTime={s.deliveryTime}
                setDeliveryTime={s.setDeliveryTime}
                deliveryDate={s.deliveryDate}
                setDeliveryDate={s.setDeliveryDate}
                shippingType={s.shippingType}
                setShippingType={s.setShippingType}
                shippingCost={s.shippingCost}
                setShippingCost={s.setShippingCost}
                validationErrors={s.validationErrors}
              />

              {/* Etiquetas / Tags */}
              <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                  <span className="text-primary">🏷️</span>Etiquetas
                </h3>
                <TagManager tags={s.tags} onChange={s.setTags} />
                <p className="text-[10px] text-muted-foreground">Etiquetas ajudam a organizar e filtrar orçamentos depois.</p>
              </div>

              {/* Atalho para Business Analytics do cliente */}
              {s.companyInfo?.id && (
                <a
                  href={`/ferramentas/bi?clientId=${s.companyInfo.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 hover:bg-primary/10 hover:border-primary/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm leading-tight">
                      Inteligência completa deste cliente
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      Histórico, afinidade, sazonalidade e tendência do setor
                    </p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* COL 2 — Item ativo + Personalização */}
          <div className={cn("lg:col-span-5", !s.canEdit && "pointer-events-none grayscale-[0.3] opacity-80")}>
            <div className="sticky top-24 flex flex-col max-h-[calc(100vh-7rem)]">
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="flex items-center justify-between p-4 pb-3 shrink-0">
                  <div>
                    <h3 className="font-display font-semibold text-sm">Itens do Orçamento</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.items.length} item(ns) adicionado(s)</p>
                  </div>
                  <Button size="sm" onClick={() => s.setProductSearchOpen(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />Produto
                  </Button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
                  {s.items.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">Nenhum item adicionado</p>
                      <p className="text-xs mt-1">Pesquise e adicione produtos ao orçamento</p>
                    </div>
                  ) : s.activeItemIndex !== null && s.items[s.activeItemIndex] ? (() => {
                    const item = s.items[s.activeItemIndex];
                    const idx = s.activeItemIndex;
                    return (
                      <div className="space-y-3">
                        <DraggableQuoteItems
                          items={[item]}
                          onReorder={() => {}}
                          onUpdateQuantity={(_, qty) => s.updateItemQuantity(idx, qty)}
                          onUpdatePrice={(_, price) => s.updateItemPrice(idx, price)}
                          onRemove={() => { s.removeItem(idx); s.setActiveItemIndex(null); }}
                          onTogglePersonalization={() => s.toggleExpanded(idx)}
                          expandedItems={new Set(s.expandedItems.has(idx) ? [0] : [])}
                          renderPersonalization={() => (
                            <QuoteProductCustomization
                              productId={item.product_id}
                              quantity={item.quantity}
                              existingPersonalizations={item.personalizations}
                              onPersonalizationsChange={(p) => s.handlePersonalizationsChange(idx, p)}
                            />
                          )}
                          formatCurrency={s.formatCurrency}
                        />
                      </div>
                    );
                  })() : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium text-sm">Selecione um item no resumo</p>
                      <p className="text-xs mt-1">Ou adicione um novo produto</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* COL 3 — Resumo */}
          <QuoteBuilderSummaryColumn
            items={s.items}
            activeItemIndex={s.activeItemIndex}
            setActiveItemIndex={s.setActiveItemIndex}
            removeItem={s.removeItem}
            discountType={s.discountType}
            setDiscountType={s.setDiscountType}
            discountValue={s.discountValue}
            setDiscountValue={s.setDiscountValue}
            discountAmount={s.discountAmount}
            total={s.total}
            isFormValid={s.isFormValid}
            isDraftValid={s.isDraftValid}
            validationErrors={s.validationErrors}
            quotesLoading={s.quotesLoading}
            isEditMode={s.isEditMode}
            formatCurrency={s.formatCurrency}
            calculateItemPersonalizationTotal={s.calculateItemPersonalizationTotal}
            calculateItemTotal={s.calculateItemTotal}
            onSave={s.handleSaveQuote}
            maxDiscountPercent={s.maxDiscountPercent}
            isDiscountExceeded={s.isDiscountExceeded}
            negotiationMarkup={s.negotiationMarkup}
            setNegotiationMarkup={s.setNegotiationMarkup}
            realSubtotal={s.realSubtotal}
            realDiscountPercent={s.realDiscountPercent}
            confirmItemPrice={s.confirmItemPrice}
            confirmAllStalePrices={s.confirmAllStalePrices}
            selectedIndexes={s.selectedItemIndexes}
            onToggleSelection={s.toggleItemSelection}
            onGroupItems={s.groupItemsIntoKit}
            onUngroup={s.ungroupItems}
            onClearSelection={() => s.setSelectedItemIndexes(new Set())}
          />
        </div>
      </div>

      {/* Product Search Dialog */}
      <QuoteProductSelector
        open={s.productSearchOpen}
        onOpenChange={s.setProductSearchOpen}
        productSearch={s.productSearch}
        setProductSearch={s.setProductSearch}
        filteredProducts={s.filteredProducts}
        selectedProductForColor={s.selectedProductForColor}
        setSelectedProductForColor={s.setSelectedProductForColor}
        onProductClick={s.handleProductClick}
        onAddWithColor={s.addProductWithColor}
        formatCurrency={s.formatCurrency}
      />

      <UnsavedChangesDialog
        open={showDialog}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
        message={message}
      />
    </>
  );
}
