
/**
 * useQuoteBuilderState — Estado centralizado do QuoteBuilder (REFATORADO)
 * Extrai toda a lógica de estado, cálculos e ações do QuoteBuilderPage.
 */

import { useState, useMemo, useCallback } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useSellerDiscountLimits } from "@/hooks/useSellerDiscountLimits";
import { useDiscountApproval } from "@/hooks/useDiscountApproval";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { validateQuoteForm, QUOTE_FIELD_LABELS } from "@/lib/validations";
import { useQuotes, type QuoteItem, type QuoteItemPersonalization } from "@/hooks/useQuotes";
import { useQuoteTemplates, type QuoteTemplate, type QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { useRBAC } from "@/hooks/useRBAC";
import { getPriceFreshness } from "@/utils/price-freshness";
import type { SelectedCompanyInfo, SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import type { QuoteBuilderStep } from "@/components/quotes/QuoteBuilderStepper";
import { calculateQuoteTotals, formatCurrency, calculateItemTotal, calculateItemPersonalizationTotal } from "@/utils/quote-calculations";
import type { Product, DiscountType, DeliveryMode } from "@/types/quote-builder";
import { useQuoteProductSearch } from "@/hooks/quote/useQuoteProductSearch";
import { useQuoteInitialization } from "@/hooks/quote/useQuoteInitialization";

export function useQuoteBuilderState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(quoteId);

  const { user, roles: userRoles, isGerentePa } = useAuth();
  const { isSupervisorOrAbove } = useRBAC();
  const { createQuote, updateQuote, fetchQuote, isLoading: quotesLoading } = useQuotes();
  const { templates } = useQuoteTemplates();
  const { myLimit: maxDiscountPercent } = useSellerDiscountLimits();
  const { requestApproval } = useDiscountApproval();

  // ── State ──
  const [clientId, setClientId] = useState("");
  const [contactId, setContactId] = useState("");
  const [companyInfo, setCompanyInfo] = useState<SelectedCompanyInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<SelectedContactInfo | null>(null);
  const [validityDays, setValidityDays] = useState("7");
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [negotiationMarkup, setNegotiationMarkup] = useState(0);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [quoteNumber, setQuoteNumber] = useState("");
  const [currentStatus, setCurrentStatus] = useState("draft");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("prazo");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [shippingType, setShippingType] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null);
  const [templateApplied, setTemplateApplied] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(isEditMode);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<Set<number>>(new Set());

  // ── Modular Hooks ──
  const search = useQuoteProductSearch();
  
  useQuoteInitialization({
    isEditMode, quoteId, fetchQuote, 
    locationState: location.state, 
    searchParams,
    setters: {
      setClientId, setContactId, setValidUntil, setNotes, setInternalNotes,
      setQuoteNumber, setCurrentStatus, setContactInfo, setCompanyInfo,
      setDiscountType, setDiscountValue, setNegotiationMarkup, setPaymentTerms,
      setShippingType, setShippingCost, setDeliveryMode, setDeliveryDate,
      setDeliveryTime, setItems, setTags, setLoadingQuote, setActiveItemIndex, setExpandedItems
    }
  });

  // ── Computeds ──
  const totals = useMemo(() => 
    calculateQuoteTotals(items, negotiationMarkup, discountType, discountValue, shippingCost, shippingType),
    [items, negotiationMarkup, discountType, discountValue, shippingCost, shippingType]
  );

  const completedSteps = useMemo((): QuoteBuilderStep[] => {
    const steps: QuoteBuilderStep[] = [];
    if (clientId) steps.push("client");
    if (items.length > 0) steps.push("items");
    if (paymentTerms && deliveryTime && shippingType) steps.push("conditions");
    if (clientId && items.length > 0 && paymentTerms && deliveryTime && shippingType) steps.push("review");
    return steps;
  }, [clientId, items.length, paymentTerms, deliveryTime, shippingType]);

  const validationErrors = useMemo(() => validateQuoteForm({
    clientId, contactId, paymentTerms, deliveryTime, shippingType, shippingCost, itemsCount: items.length,
  }), [clientId, contactId, paymentTerms, deliveryTime, shippingType, shippingCost, items.length]);

  const isFormValid = validationErrors.length === 0;
  const isDraftValid = !!clientId;

  const isDiscountExceeded = useMemo(() => {
    if (maxDiscountPercent == null) return false;
    const effectivePercent = discountType === "percent" 
      ? discountValue 
      : (totals.subtotal > 0 ? (discountValue / totals.subtotal) * 100 : 0);
    return effectivePercent > maxDiscountPercent;
  }, [maxDiscountPercent, discountType, discountValue, totals.subtotal]);

  const canEdit = useMemo(() => {
    if (!isEditMode) return true;
    if (isSupervisorOrAbove) return true;
    // Agentes só editam rascunhos ou pendentes (não enviados/aprovados)
    return ["draft", "pending"].includes(currentStatus);
  }, [isEditMode, isSupervisorOrAbove, currentStatus]);

  // ── Actions ──
  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems(prev => { const n = new Set(prev); n.has(index) ? n.delete(index) : n.add(index); return n; });
  }, []);

  const handlePersonalizationsChange = useCallback((index: number, personalizations: QuoteItemPersonalization[]) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, personalizations } : item));
  }, []);

  const addProductWithColor = useCallback((product: Product, variant: ExternalVariantStock | null) => {
    const colorName = variant?.color_name || undefined;
    const colorHex = variant?.color_hex || undefined;
    const sizeCode = variant?.size_code || undefined;
    const imageUrl = variant?.selected_thumbnail || (variant?.images?.length ? variant.images[0] : undefined) || (Array.isArray(product.images) && product.images.length > 0 ? (product.images[0] as string) : undefined);
    
    const existingIndex = items.findIndex(i => i.product_id === product.id && i.color_name === colorName && i.size_code === sizeCode);
    
    if (existingIndex >= 0) {
      setItems(prev => prev.map((item, idx) => idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item));
      setActiveItemIndex(existingIndex);
    } else {
      setItems(prev => {
        const newItems = [...prev, {
          product_id: product.id, product_name: product.name, product_sku: product.sku,
          product_image_url: imageUrl, quantity: 1, unit_price: product.price,
          unit_cost: product.costPrice || 0,
          color_name: colorName, color_hex: colorHex, size_code: sizeCode,
          bitrix_product_id: variant?.bitrix_product_id ?? null,
          price_updated_at: product.priceUpdatedAt ?? null,
          price_freshness_threshold_days: product.priceFreshnessThresholdDays ?? null,
          stock_available: variant?.stock ?? product.totalStock ?? null,
          personalizations: [],
        }];
        setActiveItemIndex(newItems.length - 1);
        return newItems;
      });
    }
    setSelectedProductForColor(null); search.setProductSearchOpen(false); search.setProductSearch("");
  }, [items, search]);

  const updateItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, quantity } : item));
  }, []);

  const updateItemPrice = useCallback((index: number, price: number) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, unit_price: price } : item));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
    setSelectedItemIndexes(prev => {
      const n = new Set(prev);
      n.delete(index);
      // Adjust indexes above removed
      const adjusted = new Set<number>();
      prev.forEach(i => {
        if (i < index) adjusted.add(i);
        else if (i > index) adjusted.add(i - 1);
      });
      return adjusted;
    });
  }, []);

  const groupItemsIntoKit = useCallback((indexes: number[], kitName: string) => {
    const groupId = crypto.randomUUID();
    setItems(prev => prev.map((item, idx) => 
      indexes.includes(idx) ? { ...item, kit_group_id: groupId, kit_name: kitName } : item
    ));
    setSelectedItemIndexes(new Set());
    toast.success(`Itens agrupados no kit "${kitName}"`);
  }, []);

  const ungroupItems = useCallback((groupId: string) => {
    setItems(prev => prev.map(item => 
      item.kit_group_id === groupId ? { ...item, kit_group_id: null, kit_name: null } : item
    ));
    toast.success("Itens desagrupados do kit");
  }, []);

  const toggleItemSelection = useCallback((index: number) => {
    setSelectedItemIndexes(prev => {
      const n = new Set(prev);
      if (n.has(index)) n.delete(index);
      else n.add(index);
      return n;
    });
  }, []);

  const applyTemplate = useCallback((template: QuoteTemplate) => {
    const newItems: QuoteItem[] = template.items_data.map((item) => ({
      product_id: item.productId || "", product_name: item.productName,
      product_sku: item.productSku, product_image_url: item.productImageUrl,
      quantity: item.quantity, unit_price: item.unitPrice,
      color_name: item.colorName, color_hex: item.colorHex,
      personalizations: item.personalizations?.map(p => ({
        technique_id: p.techniqueId, technique_name: p.techniqueName,
        colors_count: p.colorsCount, positions_count: p.positionsCount,
        unit_cost: p.unitCost, setup_cost: p.setupCost,
      })),
    }));
    setItems(newItems);
    if (template.discount_percent > 0) { setDiscountType("percent"); setDiscountValue(template.discount_percent); }
    else if (template.discount_amount > 0) { setDiscountType("amount"); setDiscountValue(template.discount_amount); }
    if (template.notes) setNotes(template.notes);
    if (template.internal_notes) setInternalNotes(template.internal_notes);
    if (template.validity_days) setValidUntil(format(addDays(new Date(), template.validity_days), "yyyy-MM-dd"));
    setTemplateApplied(template.name);
    toast.success(`Template "${template.name}" aplicado!`);
  }, []);

  const handleSaveQuote = useCallback(async (status: "draft" | "pending" | "pending_approval" | "pending_singular_approval" = "draft", sellerNotes?: string) => {
    if (status === "draft") {
      if (!isDraftValid) { toast.error("Selecione uma empresa para salvar o rascunho."); return; }
    } else if (!isFormValid) {
      const missing = validationErrors.map(e => QUOTE_FIELD_LABELS[e] || e).join(", ");
      toast.error(`Preencha os campos obrigatórios: ${missing}`); return;
    }

    if (status !== "draft") {
      const staleUnconfirmed = items.filter(item => {
        if (item.price_confirmed_at) return false;
        const f = getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days);
        return f.isStale;
      });
      if (staleUnconfirmed.length > 0) {
        toast.error("Confirme os preços defasados antes de fechar o orçamento");
        return;
      }
    }

    // Budget threshold check for Sicoob PA users (PAC workflow)
    if (status !== "draft" && (isGerentePa || userRoles?.includes("comprador_pac"))) {
      const { data: budget } = await supabase
        .from('pa_budgets')
        .select('*')
        .eq('pa_id', clientId)
        .eq('ano', new Date().getFullYear())
        .eq('mes', new Date().getMonth() + 1)
        .maybeSingle();
      
      if (budget) {
        // 1. Check Alçada (transaction limit)
        if (budget.limite_alcada > 0 && totals.total > budget.limite_alcada) {
          toast.error("Limite de alçada excedido!", {
            description: `Este pedido (R$ ${totals.total.toLocaleString()}) supera seu limite de R$ ${budget.limite_alcada.toLocaleString()}.`
          });
          return;
        }
        
        // 2. Check remaining monthly budget
        const remaining = budget.verba_total - (budget.verba_consumida || 0);
        if (budget.verba_total > 0 && totals.total > remaining) {
          toast.error("Verba insuficiente!", {
            description: `Você possui apenas R$ ${remaining.toLocaleString()} de verba disponível este mês.`
          });
          return;
        }
      }
    }

    // PAC workflow: force status to pending_singular_approval if user is Gerente PA and status is not draft
    let finalStatus = status;
    if (status === "pending" && (user?.isGerentePa || userRoles?.includes("comprador_pac"))) {
      finalStatus = "pending_singular_approval";
    }

    const quoteData = {
      client_id: clientId || undefined, client_name: contactInfo?.name || undefined,
      client_company: companyInfo?.name || undefined, client_cnpj: companyInfo?.cnpj || undefined,
      client_email: contactInfo?.email || undefined, client_phone: contactInfo?.phone || undefined,
      status: finalStatus, 
      tags: tags,
      discount_percent: discountType === "percent" ? discountValue : 0,
      discount_amount: discountType === "amount" ? discountValue : 0,
      negotiation_markup_percent: totals.markup,
      notes: notes || undefined, internal_notes: internalNotes || undefined,
      valid_until: validUntil || undefined, payment_terms: paymentTerms || undefined,
      delivery_time: deliveryTime || undefined, shipping_type: shippingType || undefined,
      shipping_cost: (shippingType === "fob_pre" || shippingType === "fob") ? shippingCost : undefined,
    };

    let result;
    if (isEditMode && quoteId) { 
      const currentQuote = await fetchQuote(quoteId);
      result = await updateQuote(quoteId, { ...quoteData, row_version: currentQuote?.row_version }, items); 
    } else { 
      result = await createQuote(quoteData, items); 
    }

    if (result && finalStatus === "pending_approval" && maxDiscountPercent != null) {
      await requestApproval(result.id, totals.realDiscountPercent, maxDiscountPercent, sellerNotes);
    }

    if (result) {
      if (finalStatus === "pending_singular_approval") {
        toast.success("Solicitação enviada para aprovação da Singular!");
      }
      navigate(`/orcamentos/${result.id}`);
    }
  }, [isDraftValid, isFormValid, validationErrors, clientId, contactInfo, companyInfo, discountType, discountValue, totals, notes, internalNotes, validUntil, paymentTerms, deliveryTime, shippingType, shippingCost, isEditMode, quoteId, items, navigate, updateQuote, createQuote, maxDiscountPercent, requestApproval, user?.isGerentePa, userRoles]);

  return {
    navigate, quoteId, isEditMode, loadingQuote, user,
    clientId, setClientId, contactId, setContactId,
    companyInfo, setCompanyInfo, contactInfo, setContactInfo,
    validityDays, setValidityDays, validUntil, setValidUntil,
    discountType, setDiscountType, discountValue, setDiscountValue,
    negotiationMarkup, setNegotiationMarkup,
    notes, setNotes, internalNotes, setInternalNotes,
    items, setItems, tags, setTags, quoteNumber, currentStatus,
    paymentTerms, setPaymentTerms, deliveryTime, setDeliveryTime,
    deliveryMode, setDeliveryMode, deliveryDate, setDeliveryDate,
    shippingType, setShippingType, shippingCost, setShippingCost,
    ...search,
    selectedProductForColor, setSelectedProductForColor,
    templateApplied, setTemplateApplied,
    expandedItems, setExpandedItems, activeItemIndex, setActiveItemIndex,
    completedSteps, ...totals,
    validationErrors, isFormValid, isDraftValid,
    quotesLoading, templates, 
    maxDiscountPercent, isDiscountExceeded,
    formatCurrency, calculateItemPersonalizationTotal, calculateItemTotal,
    toggleExpanded, handlePersonalizationsChange,
    handleProductClick: search.setProductSearchOpen,
    addProductWithColor, updateItemQuantity, updateItemPrice, removeItem,
    groupItemsIntoKit, ungroupItems, selectedItemIndexes, toggleItemSelection,
    setSelectedItemIndexes,
    confirmItemPrice: (index: number) => {
      const ts = new Date().toISOString();
      setItems(prev => prev.map((item, idx) => idx === index ? { ...item, price_confirmed_at: ts } : item));
    },
    applyTemplate, handleSaveQuote, canEdit, getTemplateItems: () => items.map(i => ({
      productId: i.product_id,
      productName: i.product_name,
      productSku: i.product_sku || "",
      productImageUrl: i.product_image_url || "",
      quantity: i.quantity,
      unitPrice: i.unit_price,
      colorName: i.color_name,
      colorHex: i.color_hex,
      personalizations: i.personalizations?.map(p => ({
        techniqueId: p.technique_id,
        techniqueName: p.technique_name || "",
        colorsCount: p.colors_count,
        positionsCount: p.positions_count,
        unitCost: p.unit_cost,
        setupCost: p.setup_cost,
      }))
    })),
  };
}
