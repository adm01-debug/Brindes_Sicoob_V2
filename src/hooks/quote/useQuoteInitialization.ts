
import { useEffect } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import type { Quote, QuoteItem, QuoteItemPersonalization } from "@/hooks/quotes/quoteTypes";
import type { SelectedCompanyInfo, SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";

interface InitParams {
  isEditMode: boolean;
  quoteId?: string;
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
    setLoadingQuote: (v: boolean) => void;
    setActiveItemIndex: (v: number | null) => void;
    setExpandedItems: (v: Set<number>) => void;
  };
}

export function useQuoteInitialization({ isEditMode, quoteId, fetchQuote, locationState, searchParams, setters }: InitParams) {
  // 1. Load existing quote
  useEffect(() => {
    if (!isEditMode || !quoteId) return;
    setters.setLoadingQuote(true);
    fetchQuote(quoteId).then((quote) => {
      if (quote) {
        setters.setClientId(quote.client_id || "");
        setters.setContactId(quote.client_id || "");
        setters.setValidUntil(quote.valid_until || format(addDays(new Date(), 30), "yyyy-MM-dd"));
        setters.setNotes(quote.notes || "");
        setters.setInternalNotes(quote.internal_notes || "");
        setters.setQuoteNumber(quote.quote_number || "");
        setters.setCurrentStatus(quote.status);
        if (quote.client_name) {
          setters.setContactInfo({ id: "", name: quote.client_name, email: quote.client_email || undefined, phone: quote.client_phone || undefined });
        }
        if (quote.client_company) {
          setters.setCompanyInfo({ id: quote.client_id || "", name: quote.client_company, cnpj: quote.client_cnpj || undefined, ramo_atividade: undefined });
        }
        if (quote.discount_percent && quote.discount_percent > 0) { setters.setDiscountType("percent"); setters.setDiscountValue(quote.discount_percent); }
        else if (quote.discount_amount && quote.discount_amount > 0) { setters.setDiscountType("amount"); setters.setDiscountValue(quote.discount_amount); }
        if (typeof quote.negotiation_markup_percent === "number") setters.setNegotiationMarkup(quote.negotiation_markup_percent);
        if (quote.payment_terms) setters.setPaymentTerms(quote.payment_terms);
        if (quote.shipping_type) setters.setShippingType(quote.shipping_type);
        if (quote.shipping_cost) setters.setShippingCost(quote.shipping_cost);
        if (quote.delivery_time) {
          if (quote.delivery_time.startsWith("date:")) {
            setters.setDeliveryMode("data");
            setters.setDeliveryDate(new Date(quote.delivery_time.slice(5) + "T12:00:00"));
          } else {
            setters.setDeliveryMode("prazo");
          }
          setters.setDeliveryTime(quote.delivery_time);
        }
        if (quote.items) setters.setItems(quote.items);
      }
      setters.setLoadingQuote(false);
    });
  }, [isEditMode, quoteId]);

  // 2. Pre-fill from simulator
  useEffect(() => {
    const state = locationState as { fromSimulator?: boolean; simulationData?: any } | null;
    if (!state?.fromSimulator || !state.simulationData) return;
    const { product, quantity, personalizations } = state.simulationData;
    if (!product) return;
    const quotePersonalizations: QuoteItemPersonalization[] = (personalizations || []).map((p: any) => ({
      technique_id: p.technique?.id || '', technique_name: p.technique?.name || '',
      colors_count: p.specs?.colors || 1, positions_count: 1,
      width_cm: p.specs?.width || undefined, height_cm: p.specs?.height || undefined,
      area_cm2: (p.specs?.width || 0) * (p.specs?.height || 0),
      setup_cost: p.pricing?.setupPrice || 0, unit_cost: p.pricing?.unitPrice || 0,
      total_cost: p.pricing?.totalPrice || 0,
    }));
    const newItem: QuoteItem = {
      product_id: product.id, product_name: product.name, product_sku: product.sku || '',
      product_image_url: product.imageUrl || undefined, quantity: quantity || 1,
      unit_price: product.price || 0, personalizations: quotePersonalizations,
    };
    setters.setItems([newItem]); setters.setActiveItemIndex(0);
    if (quotePersonalizations.length > 0) setters.setExpandedItems(new Set([0]));
    toast.success(`Produto "${product.name}" importado do simulador`);
    window.history.replaceState({}, document.title);
  }, [locationState]);

  // 3. Pre-fill from cart
  useEffect(() => {
    const state = locationState as { fromCart?: boolean; companyId?: string; companyName?: string; items?: any[] } | null;
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
  }, [locationState]);

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
  }, []);

  // 5. Pre-fill from template (passed via state)
  useEffect(() => {
    const state = locationState as { templateItems?: any[] } | null;
    if (!state?.templateItems?.length) return;
    
    const templateItems: QuoteItem[] = state.templateItems.map((i) => ({
      product_id: i.product_id || i.productId || "",
      product_name: i.product_name || i.productName || "",
      product_sku: i.product_sku || i.productSku || "",
      product_image_url: i.product_image_url || i.productImageUrl || undefined,
      quantity: i.quantity || 1,
      unit_price: i.unit_price || i.unitPrice || 0,
      color_name: i.color_name || i.colorName || undefined,
      color_hex: i.color_hex || i.colorHex || undefined,
      personalizations: i.personalizations || [],
    }));
    
    setters.setItems(templateItems);
    toast.success(`${templateItems.length} item(ns) importado(s) do template`);
    window.history.replaceState({}, document.title);
  }, [locationState]);
}
