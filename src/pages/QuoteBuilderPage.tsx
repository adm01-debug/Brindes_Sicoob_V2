/**
 * QuoteBuilderPage — Módulo de criação/edição de orçamentos
 * Refatorado: lógica em useQuoteBuilderState, UI em sub-componentes.
 */

import { useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { cn } from "@/lib/utils";

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
  Edit, AlertTriangle, Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Sparkles, ExternalLink } from "lucide-react";
import { format, addDays } from "date-fns";

import { QuoteTemplateSelector } from "@/components/quotes/QuoteTemplateSelector";
import { SaveAsTemplateButton } from "@/components/quotes/SaveAsTemplateButton";
import { QuoteProductCustomization } from "@/components/quotes/QuoteProductCustomization";
import { CompanyContactSelector } from "@/components/quotes/CompanyContactSelector";
import { QuoteAutoSave } from "@/components/quotes/QuoteAutoSave";
import { DraggableQuoteItems } from "@/components/quotes/DraggableQuoteItems";
import { QuoteBuilderStepper } from "@/components/quotes/QuoteBuilderStepper";
import { QuoteBuilderSummaryColumn } from "@/components/quotes/QuoteBuilderSummaryColumn";
import { QuoteBuilderProductSearch } from "@/components/quotes/QuoteBuilderProductSearch";
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
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageSEO title={s.quoteId ? "Editar Orçamento" : "Novo Orçamento"} description="Crie e edite orçamentos com seleção de produtos e personalização." path="/orcamentos/novo" noIndex />

      <QuoteAutoSave
        quoteId={s.quoteId}
        data={{ clientId: s.clientId, validUntil: s.validUntil, discountType: s.discountType, discountValue: s.discountValue, notes: s.notes, internalNotes: s.internalNotes, items: s.items }}
        onRestore={(data) => {
          s.setClientId(data.clientId || "");
          s.setValidUntil(data.validUntil || format(addDays(new Date(), 30), "yyyy-MM-dd"));
          s.setDiscountType(data.discountType || "percent");
          s.setDiscountValue(data.discountValue || 0);
          s.setNotes(data.notes || "");
          s.setInternalNotes(data.internalNotes || "");
          s.setItems(data.items || []);
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
              <h1 data-testid="page-title-orcamento-novo" className="font-display text-2xl font-bold text-foreground flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  {s.isEditMode ? <Edit className="h-6 w-6 text-primary" /> : <FileText className="h-6 w-6 text-primary" />}
                </div>
                {s.isEditMode ? "Editar Orçamento" : "Novo Orçamento"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {s.isEditMode && s.quoteNumber ? <>Editando: <strong>{s.quoteNumber}</strong></> : "Crie um orçamento com produtos e personalizações"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!s.isEditMode && (
              <QuoteTemplateSelector
                onSelectTemplate={s.applyTemplate}
                trigger={
                  <Button variant="outline">
                    <BookTemplate className="h-4 w-4 mr-2" />
                    Usar Template
                    {s.templates.length > 0 && <Badge variant="secondary" className="ml-2">{s.templates.length}</Badge>}
                  </Button>
                }
              />
            )}
            {s.items.length > 0 && (
              <SaveAsTemplateButton
                items={s.getTemplateItems()}
                discountPercent={s.discountType === "percent" ? s.discountValue : 0}
                discountAmount={s.discountType === "amount" ? s.discountValue : 0}
                notes={s.notes}
                internalNotes={s.internalNotes}
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
          <div className="lg:col-span-3">
            <div className="sticky top-24 space-y-3 overflow-y-auto max-h-[calc(100vh-7rem)] pr-1">
              {/* Empresa + Contato */}
              <div className={cn("rounded-2xl border bg-card p-4 space-y-4", (s.validationErrors.includes("empresa") || s.validationErrors.includes("contato")) ? "border-destructive/50" : "border-border/50")}>
                <CompanyContactSelector
                  companyId={s.clientId} contactId={s.contactId}
                  onCompanyChange={s.setClientId} onContactChange={s.setContactId}
                  onCompanyInfoChange={s.setCompanyInfo} onContactInfoChange={s.setContactInfo}
                />
                {(s.validationErrors.includes("empresa") || s.validationErrors.includes("contato")) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {s.validationErrors.includes("empresa") ? "Selecione uma empresa" : "Selecione um contato"}
                  </p>
                )}
              </div>

              {/* Validade */}
              <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2"><span className="text-primary">📅</span>Validade | Proposta</h3>
                <Select value={s.validityDays} onValueChange={(val) => { s.setValidityDays(val); s.setValidUntil(format(addDays(new Date(), parseInt(val)), "yyyy-MM-dd")); }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 dia</SelectItem>
                    <SelectItem value="3">3 dias</SelectItem>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="15">15 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Condições Comerciais */}
              <div className={cn("rounded-2xl border bg-card p-4 space-y-3", (s.validationErrors.includes("prazo_pagamento") || s.validationErrors.includes("prazo_entrega") || s.validationErrors.includes("frete") || s.validationErrors.includes("valor_frete")) ? "border-destructive/50" : "border-border/50")}>
                <h3 className="font-display font-semibold text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Condições</h3>

                {/* Pagamento */}
                <div className="space-y-1">
                  <Label className={cn("text-xs", s.validationErrors.includes("prazo_pagamento") ? "text-destructive" : "text-muted-foreground")}>
                    Prazo | Pagamento {s.validationErrors.includes("prazo_pagamento") && <span className="ml-1">*</span>}
                  </Label>
                  <Select value={s.paymentTerms} onValueChange={s.setPaymentTerms}>
                    <SelectTrigger className={cn("h-8 text-xs", s.validationErrors.includes("prazo_pagamento") && "border-destructive")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="21_dias">21 dias | A partir da entrega</SelectItem>
                      <SelectItem value="28_dias">28 dias | A partir da entrega</SelectItem>
                      <SelectItem value="50_50">50% entrada / 50% após entrega</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Entrega */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className={cn("text-xs", s.validationErrors.includes("prazo_entrega") ? "text-destructive" : "text-muted-foreground")}>
                      Prazo | Entrega {s.validationErrors.includes("prazo_entrega") && <span className="ml-1">*</span>}
                    </Label>
                    <div className="flex gap-0.5 rounded-md bg-muted p-0.5">
                      <button type="button" onClick={() => { s.setDeliveryMode("prazo"); s.setDeliveryTime(""); s.setDeliveryDate(undefined); }}
                        className={cn("px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors", s.deliveryMode === "prazo" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>Prazo</button>
                      <button type="button" onClick={() => { s.setDeliveryMode("data"); s.setDeliveryTime(""); }}
                        className={cn("px-2 py-0.5 text-[10px] rounded-sm font-medium transition-colors", s.deliveryMode === "data" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>Data</button>
                    </div>
                  </div>
                  {s.deliveryMode === "prazo" ? (
                    <Select value={s.deliveryTime} onValueChange={s.setDeliveryTime}>
                      <SelectTrigger className={cn("h-8 text-xs", s.validationErrors.includes("prazo_entrega") && "border-destructive")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="14_dias">14 dias | Após aprovação</SelectItem>
                        <SelectItem value="21_dias">21 dias | Após aprovação</SelectItem>
                        <SelectItem value="28_dias">28 dias | Após aprovação</SelectItem>
                        <SelectItem value="45_dias">45 dias | Após aprovação</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("h-8 w-full justify-start text-left text-xs font-normal", !s.deliveryDate && "text-muted-foreground", s.validationErrors.includes("prazo_entrega") && "border-destructive")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {s.deliveryDate ? format(s.deliveryDate, "dd/MM/yyyy") : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={s.deliveryDate} onSelect={(date) => { s.setDeliveryDate(date); s.setDeliveryTime(date ? `date:${format(date, "yyyy-MM-dd")}` : ""); }} disabled={(date) => date < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Frete */}
                <div className="space-y-1">
                  <Label className={cn("text-xs", s.validationErrors.includes("frete") ? "text-destructive" : "text-muted-foreground")}>
                    Frete {s.validationErrors.includes("frete") && <span className="ml-1">*</span>}
                  </Label>
                  <Select value={s.shippingType} onValueChange={s.setShippingType}>
                    <SelectTrigger className={cn("h-8 text-xs", s.validationErrors.includes("frete") && "border-destructive")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cif">CIF | Frete grátis</SelectItem>
                      <SelectItem value="fob">FOB | Repassado ao cliente</SelectItem>
                      <SelectItem value="fob_pre">FOB | Valor pré negociado</SelectItem>
                    </SelectContent>
                  </Select>
                  {(s.shippingType === "fob_pre" || s.shippingType === "fob") && (
                    <div className="space-y-1 mt-1.5">
                      <Label className={cn("text-xs", s.validationErrors.includes("valor_frete") ? "text-destructive" : "text-muted-foreground")}>
                        Valor R$ {s.validationErrors.includes("valor_frete") && <span className="ml-1">*</span>}
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">R$</span>
                        <Input type="number" min={0} step={0.01} value={s.shippingCost || ""} onChange={(e) => s.setShippingCost(parseFloat(e.target.value) || 0)} placeholder="0,00" className={cn("h-8 text-xs", s.validationErrors.includes("valor_frete") && "border-destructive")} />
                      </div>
                    </div>
                  )}
              </div>
              </div>

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
          <div className="lg:col-span-5">
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
          />
        </div>
      </div>

      {/* Product Search Dialog */}
      <QuoteBuilderProductSearch
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
    </MainLayout>
  );
}
