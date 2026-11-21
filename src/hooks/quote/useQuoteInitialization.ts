
import { useCallback, useEffect } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import type { Quote, QuoteItem, QuoteItemPersonalization } from "@/hooks/quotes/quoteTypes";
import type { SelectedCompanyInfo, SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";
import { useProductsContextSafe } from "@/contexts/ProductsContext";
import { useQuoteUrlPrefill } from "./useQuoteUrlPrefill";
import type { Product } from "@/types/quote-builder";
import { loadQuoteProductsByIds } from "@/hooks/quote/useQuoteProductSearch";

interface InitParams {
  isEditMode: boolean;
  quoteId?: string;
  fetchQuote: (id: string) => Promise<Quote | null>;
  locationState: unknown;
  searchParams: URLSearchParams;
  setters: {
    setClientId: (v: string) => void;
    setClientIdIfEmpty?: (v: string) => void;
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
    setItemsIfEmpty?: (v: QuoteItem[]) => void;
    setTags: (v: string[]) => void;
    setLoadingQuote: (v: boolean) => void;
    setActiveItemIndex: (v: number | null) => void;
    setActiveItemIndexIfUnset?: (v: number) => void;
    setExpandedItems: (v: Set<number>) => void;
  };
}

interface SimulatorPersonalization {
  technique?: { id?: string; name?: string };
  specs?: { colors?: number; width?: number; height?: number };
  pricing?: { setupPrice?: number; unitPrice?: number; totalPrice?: number };
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

interface CollectionImportItem {
  product_id?: string;
  productId?: string;
  product_name?: string;
  productName?: string;
  product_sku?: string;
  productSku?: string;
  product_image_url?: string | null;
  productImageUrl?: string | null;
  quantity?: number;
  unit_price?: number;
  unitPrice?: number;
  color_name?: string | null;
  colorName?: string | null;
  color_hex?: string | null;
  colorHex?: string | null;
  size_code?: string | null;
  price_updated_at?: string | null;
  price_freshness_threshold_days?: number | null;
}

type QuoteSetters = InitParams["setters"];

const MAX_SUGGESTED_PRODUCTS = 20;

export interface QuoteSuggestionParams {
  clientId: string | null;
  productIds: string[];
}

function safeIdentifier(value: string | null): string | null {
  const normalized = value?.trim();
  const hasControlCharacter = normalized
    ? Array.from(normalized).some((character) => character.charCodeAt(0) < 32)
    : false;
  if (!normalized || normalized.length > 128 || hasControlCharacter) return null;
  return normalized;
}

export function parseQuoteSuggestionParams(searchParams: URLSearchParams): QuoteSuggestionParams | null {
  if (searchParams.get("source") !== "bi-suggestions") return null;
  const productIds = [...new Set(
    (searchParams.get("productIds") ?? "")
      .split(",")
      .map((id) => safeIdentifier(id))
      .filter((id): id is string => Boolean(id)),
  )].slice(0, MAX_SUGGESTED_PRODUCTS);
  return { clientId: safeIdentifier(searchParams.get("clientId")), productIds };
}

export function mapSuggestedProduct(product: Product): QuoteItem {
  return {
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    product_image_url: product.images?.[0],
    quantity: 1,
    unit_price: product.price,
    unit_cost: product.costPrice ?? 0,
    price_updated_at: product.priceUpdatedAt ?? null,
    price_freshness_threshold_days: product.priceFreshnessThresholdDays ?? null,
    stock_available: product.totalStock ?? null,
    personalizations: [],
  };
}

function fallback<T>(value: T | null | undefined | false | "" | 0, defaultValue: T): T {
  return value ? value as T : defaultValue;
}

function validRowVersion(value: number | null | undefined): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

function applyQuoteIdentity(quote: Quote, setters: QuoteSetters): void {
  setters.setClientId(fallback(quote.client_id, ""));
  setters.setContactId(fallback(quote.client_id, ""));
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

function mapSimulatorPersonalization(item: SimulatorPersonalization): QuoteItemPersonalization {
  const { technique = {}, specs = {}, pricing = {} } = item;
  const width = fallback(specs.width, 0);
  const height = fallback(specs.height, 0);
  return {
    technique_id: fallback(technique.id, ""),
    technique_name: fallback(technique.name, ""),
    colors_count: fallback(specs.colors, 1),
    positions_count: 1,
    width_cm: fallback(specs.width, undefined),
    height_cm: fallback(specs.height, undefined),
    area_cm2: width * height,
    setup_cost: fallback(pricing.setupPrice, 0),
    unit_cost: fallback(pricing.unitPrice, 0),
    total_cost: fallback(pricing.totalPrice, 0),
  };
}

function mapTemplateItem(item: TemplateImportItem, getProductCost?: (id: string) => number | undefined): QuoteItem {
  return {
    product_id: fallback(item.product_id, fallback(item.productId, "")),
    product_name: fallback(item.product_name, fallback(item.productName, "")),
    product_sku: fallback(item.product_sku, fallback(item.productSku, "")),
    product_image_url: fallback(item.product_image_url, item.productImageUrl),
    quantity: fallback(item.quantity, 1),
    unit_price: fallback(item.unit_price, fallback(item.unitPrice, 0)),
    unit_cost: getProductCost?.(fallback(item.product_id, fallback(item.productId, ""))),
    color_name: fallback(item.color_name, item.colorName),
    color_hex: fallback(item.color_hex, item.colorHex),
    personalizations: fallback(item.personalizations, []),
  };
}

function isCollectionImportItem(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && "product_id" in value && "product_name" in value);
}

function mapCollectionItem(item: CollectionImportItem, getProductCost?: (id: string) => number | undefined): QuoteItem {
  const productId = fallback(item.product_id, fallback(item.productId, ""));
  return {
    product_id: productId,
    product_name: fallback(item.product_name, fallback(item.productName, "Produto")),
    product_sku: fallback(item.product_sku, fallback(item.productSku, "")),
    product_image_url: fallback(item.product_image_url, item.productImageUrl) ?? undefined,
    quantity: fallback(item.quantity, 1),
    unit_price: fallback(item.unit_price, fallback(item.unitPrice, 0)),
    unit_cost: getProductCost?.(productId) ?? 0,
    color_name: fallback(item.color_name, item.colorName) ?? undefined,
    color_hex: fallback(item.color_hex, item.colorHex) ?? undefined,
    size_code: fallback(item.size_code, undefined),
    price_updated_at: fallback(item.price_updated_at, null),
    price_freshness_threshold_days: fallback(item.price_freshness_threshold_days, null),
    personalizations: [],
  };
}

export function useQuoteInitialization({ isEditMode, quoteId, fetchQuote, locationState, searchParams, setters }: InitParams) {
  const productsContext = useProductsContextSafe();
  const getProductById = productsContext?.getProductById;
  const getProductCost = useCallback(
    (productId: string): number | undefined => getProductById?.(productId)?.costPrice,
    [getProductById]
  );

  // 1. Load existing quote
  useEffect(() => {
    if (!isEditMode || !quoteId) return;
    setters.setLoadingQuote(true);
    fetchQuote(quoteId).then((quote) => {
      if (quote) applyExistingQuote(quote, setters);
      setters.setLoadingQuote(false);
    });
  }, [fetchQuote, isEditMode, quoteId, setters, getProductCost]);

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
      unit_price: product.price || 0, unit_cost: getProductCost(product.id), personalizations: quotePersonalizations,
    };
    setters.setItems([newItem]); setters.setActiveItemIndex(0);
    if (quotePersonalizations.length > 0) setters.setExpandedItems(new Set([0]));
    toast.success(`Produto "${product.name}" importado do simulador`);
    window.history.replaceState({}, document.title);
  }, [locationState, setters, getProductCost]);

  // 3. Pre-fill from cart
  useEffect(() => {
    const state = locationState as { fromCart?: boolean; companyId?: string; companyName?: string; items?: CartImportItem[] } | null;
    if (!state?.fromCart || !state.items?.length) return;
    if (state.companyId) setters.setClientId(state.companyId);
    const cartItems: QuoteItem[] = state.items.map((i) => ({
      product_id: i.product_id, product_name: i.product_name, product_sku: i.product_sku || '',
      product_image_url: i.product_image_url || undefined, quantity: i.quantity,
      unit_price: i.unit_price, unit_cost: getProductCost(i.product_id), color_name: i.color_name || undefined,
      color_hex: i.color_hex || undefined, personalizations: [],
    }));
    setters.setItems(cartItems);
    toast.success(`${cartItems.length} item(ns) importado(s) do carrinho`);
    window.history.replaceState({}, document.title);
  }, [locationState, setters, getProductCost]);

  // 4. Pre-fill from URL params
  useQuoteUrlPrefill({
    isEditMode,
    searchParams,
    setClientId: setters.setClientId,
    setItems: setters.setItems,
    setActiveItemIndex: setters.setActiveItemIndex,
  });

  // 5. Preserva a seleção vinda das sugestões comerciais do BI.
  useEffect(() => {
    if (isEditMode) return;
    const suggestion = parseQuoteSuggestionParams(searchParams);
    if (!suggestion) return;
    let cancelled = false;
    if (suggestion.clientId) {
      (setters.setClientIdIfEmpty ?? setters.setClientId)(suggestion.clientId);
    }
    if (suggestion.productIds.length === 0) {
      toast.error("Nenhum produto válido foi recebido das sugestões do BI.");
      return;
    }
    void loadQuoteProductsByIds(suggestion.productIds)
      .then((products) => {
        if (cancelled) return;
        const items = products.map(mapSuggestedProduct);
        if (items.length === 0) {
          toast.error("Os produtos sugeridos não estão mais disponíveis no catálogo.");
          return;
        }
        (setters.setItemsIfEmpty ?? setters.setItems)(items);
        (setters.setActiveItemIndexIfUnset ?? setters.setActiveItemIndex)(0);
        toast.success(`${items.length} produto(s) sugerido(s) adicionado(s) ao orçamento`);
        const missing = suggestion.productIds.length - items.length;
        if (missing > 0) {
          toast.warning(`${missing} produto(s) não estão mais disponíveis e foram ignorados.`);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar os produtos sugeridos.");
      });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, searchParams, setters]);

  // 6. Pre-fill from template (passed via state)
  useEffect(() => {
    const state = locationState as { templateItems?: TemplateImportItem[] } | null;
    if (!state?.templateItems?.length) return;
    
    const templateItems = state.templateItems.map((item) => mapTemplateItem(item, getProductCost));
    
    setters.setItems(templateItems);
    toast.success(`${templateItems.length} item(ns) importado(s) do template`);
    window.history.replaceState({}, document.title);
  }, [locationState, setters, getProductCost]);

  // 7. Pre-fill from collection (passed via state)
  useEffect(() => {
    const state = locationState as { fromCollection?: string; clientId?: string | null; clientName?: string | null; preloadProducts?: CollectionImportItem[] } | null;
    const preloadProducts = Array.isArray(state?.preloadProducts) ? state.preloadProducts.filter(isCollectionImportItem) : [];
    if (!state?.fromCollection || preloadProducts.length === 0) return;
    const source = state.fromCollection;
    if (state.clientId) setters.setClientId(state.clientId);
    if (state.clientName) {
      setters.setCompanyInfo({ id: state.clientId || "", name: state.clientName, cnpj: undefined });
    }
    const collectionItems = preloadProducts.map((item) => mapCollectionItem(item, getProductCost));
    setters.setItems(collectionItems);
    setters.setActiveItemIndex(0);
    toast.success(`${collectionItems.length} produto(s) importado(s) da coleção "${source}"`);
    window.history.replaceState({}, document.title);
  }, [locationState, setters, getProductCost]);
}
