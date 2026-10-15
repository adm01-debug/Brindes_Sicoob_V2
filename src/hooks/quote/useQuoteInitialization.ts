
import { useEffect } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import type { Quote, QuoteItem, QuoteItemPersonalization } from "@/hooks/quotes/quoteTypes";
import type { SelectedCompanyInfo, SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";

interface InitParams {
  isEditMode: boolean;
  quoteId?: string;
  reloadKey?: number;
  fetchQuote: (id: string) => Promise<Quote | null>;
  locationState: unknown;
  searchParams: URLSearchParams;
  setters: {
    setClientId: (v: string) => void;
    setContactId: (v: string) => void;
    setValidUntil: (v: string) => void;
    setNotes: (v: string) => void;
    setInternalNotes: (v: string) => void;
    setQuoteNumber: (v: string) => void;
    setCurrentStatus: (v: string) => void;
    setIsLatestVersion: (v: boolean) => void;
    setExpectedRowVersion: (v: number | null) => void;
    setContactInfo: (v: SelectedContactInfo | null) => void;
    setCompanyInfo: (v: SelectedCompanyInfo | null) => void;
    setDiscountType: (v: "percent" | "amount") => void;
    setDiscountValue: (v: number) => void;
    setNegotiationMarkup: (v: number) => void;
    setPaymentTerms: (v: string) => void;
    setShippingType: (v: string) => void;
    setShippingCost: (v: number) => void;
    setDeliveryMode: (v: "prazo" | "data") => void;
    setDeliveryDate: (v: Date | undefined) => void;
    setDeliveryTime: (v: string) => void;
    setItems: (v: QuoteItem[]) => void;
    setTags: (v: string[]) => void;
    setLoadingQuote: (v: boolean) => void;
    setQuoteLoadError: (v: string | null) => void;
    setActiveItemIndex: (v: number | null) => void;
    setExpandedItems: (v: Set<number>) => void;
  };
}

export interface SimulatorPersonalization {
  technique?: { id?: string; name?: string };
  specs?: { colors?: number; width?: number; height?: number; locationName?: string; locationCode?: string; composedCode?: string; techniqueCode?: string };
  pricing?: { setupPrice?: number; handlingPrice?: number; unitPrice?: number; totalPrice?: number };
  notes?: string;
}

interface SimulatorImportData {
  product?: { id: string; name: string; sku?: string; imageUrl?: string; price?: number };
  quantity?: number;
  personalizations?: SimulatorPersonalization[];
}

interface CartImportItem {
  product_id: string;
  product_name: string;
  product_sku?: string;
  product_image_url?: string | null;
  quantity: number;
  unit_price: number;
  color_name?: string | null;
  color_hex?: string | null;
}

interface TemplateImportItem {
  product_id?: string;
  productId?: string;
  product_name?: string;
  productName?: string;
  product_sku?: string;
  productSku?: string;
  product_image_url?: string;
  productImageUrl?: string;
  quantity?: number;
  unit_price?: number;
  unitPrice?: number;
  color_name?: string;
  colorName?: string;
  color_hex?: string;
  colorHex?: string;
  personalizations?: QuoteItemPersonalization[];
}

type QuoteSetters = InitParams["setters"];

function fallback<T>(value: T | null | undefined | false | "" | 0, defaultValue: T): T {
  return value ? value as T : defaultValue;
}

function validRowVersion(value: number | null | undefined): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

function applyQuoteIdentity(quote: Quote, setters: QuoteSetters): void {
  setters.setClientId(fallback(quote.client_id, ""));
  // O modelo legado não persiste contact_id. O client_id identifica a empresa
  // e nunca pode ser usado para satisfazer artificialmente a seleção do contato.
  setters.setContactId("");
  setters.setValidUntil(fallback(quote.valid_until, format(addDays(new Date(), 30), "yyyy-MM-dd")));
  setters.setNotes(fallback(quote.notes, ""));
  setters.setInternalNotes(fallback(quote.internal_notes, ""));
  setters.setQuoteNumber(fallback(quote.quote_number, ""));
  setters.setCurrentStatus(quote.status);
  setters.setIsLatestVersion(quote.is_latest_version !== false);
  setters.setExpectedRowVersion(validRowVersion(quote.row_version));
}

function applyQuoteClient(quote: Quote, setters: QuoteSetters): void {
  if (quote.client_name) {
    setters.setContactInfo({
      id: "",
      name: quote.client_name,
      email: quote.client_email || undefined,
      phone: quote.client_phone || undefined,
    });
  }
  if (quote.client_company) {
    setters.setCompanyInfo({
      id: quote.client_id || "",
      name: quote.client_company,
      cnpj: quote.client_cnpj || undefined,
      ramo_atividade: undefined,
    });
  }
}

function applyQuoteDiscount(quote: Quote, setters: QuoteSetters): void {
  if (quote.discount_percent && quote.discount_percent > 0) {
    setters.setDiscountType("percent");
    setters.setDiscountValue(quote.discount_percent);
    return;
  }
  if (quote.discount_amount && quote.discount_amount > 0) {
    setters.setDiscountType("amount");
    setters.setDiscountValue(quote.discount_amount);
  }
}

function applyQuoteConditions(quote: Quote, setters: QuoteSetters): void {
  if (typeof quote.negotiation_markup_percent === "number") setters.setNegotiationMarkup(quote.negotiation_markup_percent);
  if (quote.payment_terms) setters.setPaymentTerms(quote.payment_terms);
  if (quote.shipping_type) setters.setShippingType(quote.shipping_type);
  if (quote.shipping_cost) setters.setShippingCost(quote.shipping_cost);
  if (quote.items) setters.setItems(quote.items);
  if (quote.tags) setters.setTags(quote.tags);
}

function applyQuoteDelivery(quote: Quote, setters: QuoteSetters): void {
  if (!quote.delivery_time) return;
  if (quote.delivery_time.startsWith("date:")) {
    setters.setDeliveryMode("data");
    setters.setDeliveryDate(new Date(`${quote.delivery_time.slice(5)}T12:00:00`));
  } else {
    setters.setDeliveryMode("prazo");
  }
  setters.setDeliveryTime(quote.delivery_time);
}

function applyExistingQuote(quote: Quote, setters: QuoteSetters): void {
  applyQuoteIdentity(quote, setters);
  applyQuoteClient(quote, setters);
  applyQuoteDiscount(quote, setters);
  applyQuoteConditions(quote, setters);
  applyQuoteDelivery(quote, setters);
}

export function mapSimulatorPersonalization(item: SimulatorPersonalization): QuoteItemPersonalization {
  const { technique = {}, specs = {}, pricing = {} } = item;
  const width = fallback(specs.width, 0);
  const height = fallback(specs.height, 0);
  const location = specs.locationName
    ? `Local: ${specs.locationName}${specs.locationCode ? ` (${specs.locationCode})` : ''}`
    : undefined;
  const code = specs.composedCode || specs.techniqueCode
    ? `Código: ${specs.composedCode || specs.techniqueCode}`
    : undefined;
  return {
    technique_id: fallback(technique.id, ""),
    technique_name: fallback(technique.name, ""),
    colors_count: fallback(specs.colors, 1),
    positions_count: 1,
    width_cm: fallback(specs.width, undefined),
    height_cm: fallback(specs.height, undefined),
    area_cm2: width * height,
    // O esquema de personalização não tem coluna própria para manuseio;
    // mantenha o custo fixo completo no campo existente, usado pelos cálculos e RPCs.
    setup_cost: fallback(pricing.setupPrice, 0) + fallback(pricing.handlingPrice, 0),
    unit_cost: fallback(pricing.unitPrice, 0),
    total_cost: fallback(pricing.totalPrice, 0),
    notes: [item.notes, location, code].filter(Boolean).join(' · ') || undefined,
  };
}

function mapTemplateItem(item: TemplateImportItem): QuoteItem {
  return {
    product_id: fallback(item.product_id, fallback(item.productId, "")),
    product_name: fallback(item.product_name, fallback(item.productName, "")),
    product_sku: fallback(item.product_sku, fallback(item.productSku, "")),
    product_image_url: fallback(item.product_image_url, item.productImageUrl),
    quantity: fallback(item.quantity, 1),
    unit_price: fallback(item.unit_price, fallback(item.unitPrice, 0)),
    color_name: fallback(item.color_name, item.colorName),
    color_hex: fallback(item.color_hex, item.colorHex),
    personalizations: fallback(item.personalizations, []),
  };
}

export function useQuoteInitialization({ isEditMode, quoteId, reloadKey = 0, fetchQuote, locationState, searchParams, setters }: InitParams) {
  // 1. Load existing quote
  useEffect(() => {
    if (!isEditMode || !quoteId) return;
    let cancelled = false;
    setters.setLoadingQuote(true);
    setters.setQuoteLoadError(null);
    void fetchQuote(quoteId)
      .then((quote) => {
        if (cancelled) return;
        if (!quote) {
          setters.setQuoteLoadError("Orçamento não encontrado.");
          return;
        }
        applyExistingQuote(quote, setters);
      })
      .catch(() => {
        if (!cancelled) {
          setters.setQuoteLoadError("Não foi possível carregar o orçamento.");
        }
      })
      .finally(() => {
        if (!cancelled) setters.setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchQuote, isEditMode, quoteId, reloadKey, setters]);

  // 2. Pre-fill from simulator
  useEffect(() => {
    const state = locationState as { fromSimulator?: boolean; simulationData?: SimulatorImportData } | null;
    if (!state?.fromSimulator || !state.simulationData) return;
    const { product, quantity, personalizations } = state.simulationData;
    if (!product) return;
    const quotePersonalizations = fallback(personalizations, []).map(mapSimulatorPersonalization);
    const newItem: QuoteItem = {
      product_id: product.id, product_name: product.name, product_sku: product.sku || '',
      product_image_url: product.imageUrl || undefined, quantity: quantity || 1,
      unit_price: product.price || 0, personalizations: quotePersonalizations,
    };
    setters.setItems([newItem]); setters.setActiveItemIndex(0);
    if (quotePersonalizations.length > 0) setters.setExpandedItems(new Set([0]));
    toast.success(`Produto "${product.name}" importado do simulador`);
    window.history.replaceState({}, document.title);
  }, [locationState, setters]);

  // 3. Pre-fill from cart
  useEffect(() => {
    const state = locationState as { fromCart?: boolean; companyId?: string; companyName?: string; items?: CartImportItem[] } | null;
    if (!state?.fromCart || !state.items?.length) return;
    if (state.companyId) setters.setClientId(state.companyId);
    const cartItems: QuoteItem[] = state.items.map((i) => ({
      product_id: i.product_id, product_name: i.product_name, product_sku: i.product_sku || '',
      product_image_url: i.product_image_url || undefined, quantity: i.quantity,
      unit_price: i.unit_price, color_name: i.color_name || undefined,
      color_hex: i.color_hex || undefined, personalizations: [],
    }));
    setters.setItems(cartItems);
    toast.success(`${cartItems.length} item(ns) importado(s) do carrinho`);
    window.history.replaceState({}, document.title);
  }, [locationState, setters]);

  // 4. Pre-fill from URL params
  useEffect(() => {
    if (isEditMode) return;
    const rawItems = searchParams.getAll("items[]");
    if (rawItems.length > 0) {
      try {
        const parsedItems: QuoteItem[] = rawItems.map(raw => {
          const p = JSON.parse(raw);
          return {
            product_id: p.product_id || "", product_name: p.product_name || "",
            product_sku: p.product_sku || "", product_image_url: p.product_image || undefined,
            quantity: Math.max(1, p.quantity || 1), unit_price: parseFloat(p.product_price || "0"),
            color_name: p.color_name || undefined, color_hex: p.color_hex || undefined,
            personalizations: [],
          };
        });
        if (parsedItems.length > 0) {
          setters.setItems(parsedItems); setters.setActiveItemIndex(0);
          toast.success(`${parsedItems.length} produto(s) adicionado(s) ao orçamento`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (e) { console.warn("Failed to parse items[]", e); }
    }
  }, [isEditMode, searchParams, setters]);

  // 5. Pre-fill from template (passed via state)
  useEffect(() => {
    const state = locationState as { templateItems?: TemplateImportItem[] } | null;
    if (!state?.templateItems?.length) return;
    
    const templateItems = state.templateItems.map(mapTemplateItem);
    
    setters.setItems(templateItems);
    toast.success(`${templateItems.length} item(ns) importado(s) do template`);
    window.history.replaceState({}, document.title);
  }, [locationState, setters]);
}
