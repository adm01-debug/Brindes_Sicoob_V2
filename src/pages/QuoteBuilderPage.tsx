/**
 * QuoteBuilderPage — Módulo de criação/edição de orçamentos
 * Refatorado: lógica em useQuoteBuilderState, UI em sub-componentes.
 */

// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Plus, Package, Loader2, BookTemplate, ArrowLeft,
  Edit, AlertTriangle, Lock, Sparkles, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

import { QuoteTemplateSelector } from "@/components/quotes/QuoteTemplateSelector";
import { SaveAsTemplateButton } from "@/components/quotes/SaveAsTemplateButton";
import { QuoteProductCustomization } from "@/components/quotes/QuoteProductCustomization";
import { QuoteClientSelector } from "@/components/quotes/QuoteClientSelector";
import { QuoteProductSelector } from "@/components/quotes/QuoteProductSelector";
import { QuoteAutoSave } from "@/components/quotes/QuoteAutoSave";
import { QuoteBuilderStepper } from "@/components/quotes/QuoteBuilderStepper";
import { QuoteBuilderSummaryColumn } from "@/components/quotes/QuoteBuilderSummaryColumn";
import { DraggableQuoteItems } from "@/components/quotes/DraggableQuoteItems";
import { CommercialConditions } from "@/components/quotes/builder/CommercialConditions";
import { ValidityPicker } from "@/components/quotes/builder/ValidityPicker";
import { useQuoteBuilderState } from "@/hooks/useQuoteBuilderState";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesDialog } from "@/components/common/UnsavedChangesDialog";
import { TagManager } from "@/components/quotes/TagManager";
import { ReorderCatalogValidityBanner } from "@/components/quotes/ReorderCatalogValidityBanner";
import type { SelectedCompanyInfo, SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";

function isSelectedInfo(value: unknown): value is SelectedCompanyInfo & SelectedContactInfo {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
}

type QuoteBuilderState = ReturnType<typeof useQuoteBuilderState>;

function restoreQuoteDraft(state: QuoteBuilderState, data: Record<string, unknown>) {
  state.setClientId(typeof data.clientId === "string" ? data.clientId : "");
  state.setValidUntil(typeof data.validUntil === "string" ? data.validUntil : format(addDays(new Date(), 30), "yyyy-MM-dd"));
  state.setDiscountType(data.discountType === "amount" ? "amount" : "percent");
  state.setDiscountValue(typeof data.discountValue === "number" ? data.discountValue : 0);
  state.setNotes(typeof data.notes === "string" ? data.notes : "");
  state.setInternalNotes(typeof data.internalNotes === "string" ? data.internalNotes : "");
  state.setItems(Array.isArray(data.items) ? data.items as QuoteBuilderState["items"] : []);
  state.setTags(Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : []);
  toast.success("Rascunho restaurado!");
}

function QuoteBuilderHeader({ state, onBack }: { state: QuoteBuilderState; onBack: () => void }) {
  const subtitle = state.isEditMode && state.quoteNumber ? <>Editando: <strong>{state.quoteNumber}</strong></> : "Crie um orçamento com produtos e personalizações";
  return <div className="flex items-center justify-between flex-wrap gap-4"><div className="flex items-center gap-4"><Button variant="ghost" size="icon" aria-label="Voltar" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button><div><div className="flex items-center gap-2"><h1 data-testid="page-title-orcamento-novo" className="font-display text-2xl font-bold text-foreground flex items-center gap-3"><div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">{state.isEditMode ? <Edit className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />}</div>{state.isEditMode ? "Editar Orçamento" : "Novo Orçamento"}</h1>{!state.canEdit && <Badge variant="outline" className="gap-1 bg-muted/50"><Lock className="h-3 w-3" /> Somente Leitura</Badge>}</div><p className="text-muted-foreground mt-1">{subtitle}</p></div></div><QuoteTemplateActions state={state} /></div>;
}

function templateButtonData(state: QuoteBuilderState) {
  return {
    items: state.getTemplateItems().map((item) => ({ product_id: item.productId, product_name: item.productName, product_sku: item.productSku, product_image_url: item.productImageUrl, quantity: item.quantity, unit_price: item.unitPrice, color_name: item.colorName, color_hex: item.colorHex, personalizations: item.personalizations?.map((personalization) => ({ technique_id: personalization.techniqueId || "", technique_name: personalization.techniqueName, colors_count: personalization.colorsCount, positions_count: personalization.positionsCount, unit_cost: personalization.unitCost, setup_cost: personalization.setupCost })) })),
    discount_percent: state.discountType === "percent" ? state.discountValue : 0,
    notes: state.notes, payment_terms: state.paymentTerms, delivery_time: state.deliveryTime,
  };
}

function QuoteTemplateActions({ state }: { state: QuoteBuilderState }) {
  return <div className="flex items-center gap-2">{!state.isEditMode && <QuoteTemplateSelector onSelect={state.applyTemplate} />}{state.items.length > 0 && <SaveAsTemplateButton quoteData={templateButtonData(state)} />}</div>;
}

function QuoteTemplateNotices({ state }: { state: QuoteBuilderState }) {
  if (state.templateApplied) return <Card className="bg-primary/5 border-primary/20"><CardContent className="py-3 flex items-center justify-between"><div className="flex items-center gap-2"><BookTemplate className="h-4 w-4 text-primary" /><span className="text-sm">Template <strong>"{state.templateApplied}"</strong> aplicado</span></div><Button variant="ghost" size="sm" onClick={() => state.setTemplateApplied(null)}>Fechar</Button></CardContent></Card>;
  const template = state.defaultTemplate;
  if (state.isEditMode || !template || state.items.length > 0) return null;
  return <Card className="bg-muted/50 border-dashed"><CardContent className="py-4 flex items-center justify-between"><div className="flex items-center gap-3"><BookTemplate className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium">Template padrão disponível</p><p className="text-sm text-muted-foreground">Use "{template.name}" para começar rapidamente</p></div></div><Button variant="outline" onClick={() => state.applyTemplate(template)}>Aplicar Template</Button></CardContent></Card>;
}

function QuoteClientValidation({ state }: { state: QuoteBuilderState }) {
  const hasCompanyError = state.validationErrors.includes("empresa");
  const hasContactError = state.validationErrors.includes("contato");
  if (!hasCompanyError && !hasContactError) return null;
  return <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3 shrink-0" />{hasCompanyError ? "Selecione uma empresa" : "Selecione um contato"}</p>;
}

function ClientAnalyticsLink({ state }: { state: QuoteBuilderState }) {
  if (!state.companyInfo?.id) return null;
  return <a href={`/ferramentas/bi?clientId=${state.companyInfo.id}`} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-3 hover:bg-primary/10 hover:border-primary/50 transition-colors"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Sparkles className="h-4 w-4 text-primary" /></div><div className="flex-1 min-w-0"><p className="font-display font-semibold text-sm leading-tight">Inteligência completa deste cliente</p><p className="text-[11px] text-muted-foreground leading-tight mt-0.5">Histórico, afinidade, sazonalidade e tendência do setor</p></div><ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" /></a>;
}

function QuoteClientColumn({ state }: { state: QuoteBuilderState }) {
  const hasClientError = state.validationErrors.includes("empresa") || state.validationErrors.includes("contato");
  return <div className={cn("lg:col-span-3", !state.canEdit && "pointer-events-none grayscale-[0.3] opacity-80")}><div className="sticky top-24 space-y-3 overflow-y-auto max-h-[calc(100vh-7rem)] pr-1"><div className={cn("rounded-2xl border bg-card p-4 space-y-4", hasClientError ? "border-destructive/50" : "border-border/50")}><QuoteClientSelector clientId={state.clientId} contactId={state.contactId} onClientChange={state.setClientId} onContactChange={state.setContactId} onClientInfoChange={(info) => state.setCompanyInfo(isSelectedInfo(info) ? info : null)} onContactInfoChange={(info) => state.setContactInfo(isSelectedInfo(info) ? info : null)} /><QuoteClientValidation state={state} /></div><ValidityPicker validityDays={state.validityDays} setValidityDays={state.setValidityDays} setValidUntil={state.setValidUntil} /><CommercialConditions paymentTerms={state.paymentTerms} setPaymentTerms={state.setPaymentTerms} deliveryMode={state.deliveryMode} setDeliveryMode={state.setDeliveryMode} deliveryTime={state.deliveryTime} setDeliveryTime={state.setDeliveryTime} deliveryDate={state.deliveryDate} setDeliveryDate={state.setDeliveryDate} shippingType={state.shippingType} setShippingType={state.setShippingType} shippingCost={state.shippingCost} setShippingCost={state.setShippingCost} validationErrors={state.validationErrors} /><div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3"><h3 className="font-display font-semibold text-sm flex items-center gap-2"><span className="text-primary">🏷️</span>Etiquetas</h3><TagManager tags={state.tags} onChange={state.setTags} /><p className="text-[10px] text-muted-foreground">Etiquetas ajudam a organizar e filtrar orçamentos depois.</p></div><ClientAnalyticsLink state={state} /></div></div>;
}

function EmptyItems() {
  return <div className="text-center py-12 text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="font-medium text-sm">Nenhum item adicionado</p><p className="text-xs mt-1">Pesquise e adicione produtos ao orçamento</p></div>;
}

function SelectItemPrompt() {
  return <div className="text-center py-12 text-muted-foreground"><Package className="h-10 w-10 mx-auto mb-3 opacity-30" /><p className="font-medium text-sm">Selecione um item no resumo</p><p className="text-xs mt-1">Ou adicione um novo produto</p></div>;
}

function ActiveQuoteItem({ state }: { state: QuoteBuilderState }) {
  const index = state.activeItemIndex;
  const item = index === null ? undefined : state.items[index];
  if (index === null || !item) return <SelectItemPrompt />;
  const remove = () => { state.removeItem(index); state.setActiveItemIndex(null); };
  return <div className="space-y-3"><DraggableQuoteItems items={[item]} onReorder={() => undefined} onUpdateQuantity={(_, quantity) => state.updateItemQuantity(index, quantity)} onUpdatePrice={(_, price) => state.updateItemPrice(index, price)} onRemove={remove} onTogglePersonalization={() => state.toggleExpanded(index)} expandedItems={new Set(state.expandedItems.has(index) ? [0] : [])} renderPersonalization={() => <QuoteProductCustomization productId={item.product_id} quantity={item.quantity} existingPersonalizations={item.personalizations} onPersonalizationsChange={(personalizations) => state.handlePersonalizationsChange(index, personalizations)} />} formatCurrency={state.formatCurrency} /></div>;
}

function QuoteItemsContent({ state }: { state: QuoteBuilderState }) {
  if (state.items.length === 0) return <EmptyItems />;
  return <ActiveQuoteItem state={state} />;
}

function QuoteItemsColumn({ state }: { state: QuoteBuilderState }) {
  return <div className={cn("lg:col-span-5", !state.canEdit && "pointer-events-none grayscale-[0.3] opacity-80")}><div className="sticky top-24 flex flex-col max-h-[calc(100vh-7rem)]"><div className="rounded-2xl border border-border/50 bg-card overflow-hidden flex flex-col flex-1 min-h-0"><div className="flex items-center justify-between p-4 pb-3 shrink-0"><div><h3 className="font-display font-semibold text-sm">Itens do Orçamento</h3><p className="text-xs text-muted-foreground mt-0.5">{state.items.length} item(ns) adicionado(s)</p></div><Button size="sm" onClick={() => state.setProductSearchOpen(true)}><Plus className="h-3.5 w-3.5 mr-1.5" />Produto</Button></div><div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"><QuoteItemsContent state={state} /></div></div></div></div>;
}

function QuoteSummaryColumn({ state }: { state: QuoteBuilderState }) {
  return <QuoteBuilderSummaryColumn readOnly={!state.canEdit} items={state.items} activeItemIndex={state.activeItemIndex} setActiveItemIndex={state.setActiveItemIndex} removeItem={state.removeItem} discountType={state.discountType} setDiscountType={state.setDiscountType} discountValue={state.discountValue} setDiscountValue={state.setDiscountValue} discountAmount={state.discountAmount} total={state.total} isFormValid={state.isFormValid} isDraftValid={state.isDraftValid} validationErrors={state.validationErrors} quotesLoading={state.quotesLoading} isEditMode={state.isEditMode} formatCurrency={state.formatCurrency} calculateItemPersonalizationTotal={state.calculateItemPersonalizationTotal} calculateItemTotal={state.calculateItemTotal} onSave={state.handleSaveQuote} maxDiscountPercent={state.maxDiscountPercent} isDiscountExceeded={state.isDiscountExceeded} negotiationMarkup={state.negotiationMarkup} setNegotiationMarkup={state.setNegotiationMarkup} realSubtotal={state.realSubtotal} realDiscountPercent={state.realDiscountPercent} confirmItemPrice={state.confirmItemPrice} confirmAllStalePrices={state.confirmAllStalePrices} selectedIndexes={state.selectedItemIndexes} onToggleSelection={state.toggleItemSelection} onGroupItems={state.groupItemsIntoKit} onUngroup={state.ungroupItems} onClearSelection={() => state.setSelectedItemIndexes(new Set())} />;
}

function QuoteBuilderDialogs({ state }: { state: QuoteBuilderState }) {
  return <QuoteProductSelector open={state.productSearchOpen} onOpenChange={state.setProductSearchOpen} productSearch={state.productSearch} setProductSearch={state.setProductSearch} filteredProducts={state.filteredProducts} selectedProductForColor={state.selectedProductForColor} setSelectedProductForColor={state.setSelectedProductForColor} onProductClick={state.handleProductClick} onAddWithColor={state.addProductWithColor} formatCurrency={state.formatCurrency} />;
}

export default function QuoteBuilderPage() {
  const state = useQuoteBuilderState();
  const unsaved = useUnsavedChangesGuard({ hasUnsavedChanges: state.hasUnsavedData });
  if (state.loadingQuote) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  return <><PageSEO title={state.quoteId ? "Editar Orçamento" : "Novo Orçamento"} description="Crie e edite orçamentos com seleção de produtos e personalização." path="/orcamentos/novo" noIndex /><QuoteAutoSave enabled={state.canEdit} quoteId={state.quoteId} scopeId={state.user?.id} data={{ clientId: state.clientId, validUntil: state.validUntil, discountType: state.discountType, discountValue: state.discountValue, notes: state.notes, internalNotes: state.internalNotes, items: state.items, tags: state.tags }} onRestore={(data) => restoreQuoteDraft(state, data)} className="fixed top-20 right-4 z-40" /><div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4 pb-24 md:pb-6 animate-fade-in"><QuoteBuilderHeader state={state} onBack={() => unsaved.guardNavigation(() => state.navigate(-1))} /><QuoteBuilderStepper completedSteps={state.completedSteps} /><ReorderCatalogValidityBanner quoteId={state.quoteId} hasUnsavedChanges={state.hasUnsavedData} onRevalidated={() => window.location.reload()} /><QuoteTemplateNotices state={state} /><div className="grid gap-4 lg:grid-cols-12"><QuoteClientColumn state={state} /><QuoteItemsColumn state={state} /><QuoteSummaryColumn state={state} /></div></div><QuoteBuilderDialogs state={state} /><UnsavedChangesDialog open={unsaved.showDialog} onConfirm={unsaved.confirmLeave} onCancel={unsaved.cancelLeave} message={unsaved.message} /></>;
}
