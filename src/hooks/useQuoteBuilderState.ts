
/**
 * useQuoteBuilderState — Estado centralizado do QuoteBuilder (REFATORADO)
 * Extrai toda a lógica de estado, cálculos e ações do QuoteBuilderPage.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useSellerDiscountLimits } from "@/hooks/useSellerDiscountLimits";
import { useDiscountApproval } from "@/hooks/useDiscountApproval";
import { buildQuoteDraftScope } from "@/lib/quotes/quote-draft-scope";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { validateQuoteForm, QUOTE_FIELD_LABELS } from "@/lib/validations";
import { useQuotes, type Quote, type QuoteItem, type QuoteItemPersonalization } from "@/hooks/quotes/useQuotes";
import { useQuoteTemplates, type QuoteTemplate, type QuoteTemplateItem } from "@/hooks/useQuoteTemplates";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPriceFreshness } from "@/utils/price-freshness";
import type { SelectedCompanyInfo, SelectedContactInfo } from "@/components/quotes/CompanyContactSelector";
import type { ExternalVariantStock } from "@/hooks/useExternalVariantStock";
import { getQuoteItemVariantIdentity } from "@/hooks/quotes/quoteVariantIdentity";
import type { QuoteBuilderStep } from "@/components/quotes/QuoteBuilderStepper";
import { calculateQuoteTotals, formatCurrency, calculateItemTotal, calculateItemPersonalizationTotal } from "@/utils/quote-calculations";
import type { Product, DiscountType, DeliveryMode } from "@/types/quote-builder";
import { useQuoteProductSearch } from "@/hooks/quote/useQuoteProductSearch";
import { useQuoteInitialization } from "@/hooks/quote/useQuoteInitialization";
import { isQuoteCommerciallyEditable, quoteStatusRequiresDraftReset } from "@/lib/quote-status-config";
import { useNavigationGuardStore } from "@/stores/useNavigationGuardStore";

export function validateBudgetForSubmission<T>(
  budget: T | null,
  error: unknown,
): { ok: true; budget: T } | { ok: false; message: string } {
  if (error) {
    return { ok: false, message: "Não foi possível validar a verba do PA. Tente novamente antes de enviar." };
  }
  if (!budget) {
    return { ok: false, message: "A verba desta competência ainda não foi configurada para o seu PA." };
  }
  return { ok: true, budget };
}

function truthyOr<T>(value: T | null | undefined | false | "" | 0, fallback: T): T {
  return value ? value as T : fallback;
}

function definedOr<T>(value: T | null | undefined, fallback: T): T {
  return value === undefined || value === null ? fallback : value;
}

function quoteBuilderSteps(
  clientId: string,
  itemCount: number,
  paymentTerms: string,
  ...conditions: [deliveryTime: string, shippingType: string]
): QuoteBuilderStep[] {
  const [deliveryTime, shippingType] = conditions;
  const steps: QuoteBuilderStep[] = [];
  const hasConditions = [paymentTerms, deliveryTime, shippingType].every(Boolean);
  if (clientId) steps.push("client");
  if (itemCount > 0) steps.push("items");
  if (hasConditions) steps.push("conditions");
  if ([clientId, itemCount > 0, hasConditions].every(Boolean)) steps.push("review");
  return steps;
}

function preferredProductImage(product: Product, variant: ExternalVariantStock | null): string | undefined {
  if (variant?.selected_thumbnail) return variant.selected_thumbnail;
  if (variant?.images?.length) return variant.images[0];
  if (Array.isArray(product.images) && product.images.length > 0) return product.images[0] as string;
  return undefined;
}

function buildQuoteItem(product: Product, variant: ExternalVariantStock | null): QuoteItem {
  const selected = truthyOr(variant, {} as Partial<ExternalVariantStock>);
  return {
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    product_image_url: preferredProductImage(product, variant),
    quantity: 1,
    unit_price: product.price,
    unit_cost: truthyOr(product.costPrice, 0),
    color_name: truthyOr(selected.color_name, undefined),
    color_hex: truthyOr(selected.color_hex, undefined),
    size_code: truthyOr(selected.size_code, undefined),
    bitrix_product_id: definedOr(selected.bitrix_product_id, null),
    ...getQuoteItemVariantIdentity(variant),
    price_updated_at: definedOr(product.priceUpdatedAt, null),
    price_freshness_threshold_days: definedOr(product.priceFreshnessThresholdDays, null),
    stock_available: definedOr(selected.stock_quantity, definedOr(product.totalStock, null)),
    personalizations: [],
  };
}

function mapTemplateItem(item: QuoteTemplateItem): QuoteItem {
  return {
    product_id: truthyOr(item.productId, ""),
    product_name: item.productName,
    product_sku: item.productSku,
    product_image_url: item.productImageUrl,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    color_name: item.colorName,
    color_hex: item.colorHex,
    personalizations: item.personalizations?.map((personalization) => ({
      technique_id: truthyOr(personalization.techniqueId, ""),
      technique_name: personalization.techniqueName,
      colors_count: personalization.colorsCount,
      positions_count: personalization.positionsCount,
      unit_cost: personalization.unitCost,
      setup_cost: personalization.setupCost,
    })),
  };
}

function applyTemplateDiscount(
  template: QuoteTemplate,
  setDiscountType: (type: DiscountType) => void,
  setDiscountValue: (value: number) => void,
): void {
  if ((template.discount_percent ?? 0) > 0) {
    setDiscountType("percent");
    setDiscountValue(template.discount_percent ?? 0);
    return;
  }
  if ((template.discount_amount ?? 0) > 0) {
    setDiscountType("amount");
    setDiscountValue(template.discount_amount ?? 0);
  }
}

type SaveStatus = "draft" | "pending" | "pending_approval" | "pending_singular_approval";

function validateSaveForm(
  status: SaveStatus,
  isDraftValid: boolean,
  isFormValid: boolean,
  validationErrors: string[],
): boolean {
  if (status === "draft" && !isDraftValid) {
    toast.error("Selecione uma empresa para salvar o rascunho.");
    return false;
  }
  if (status !== "draft" && !isFormValid) {
    const missing = validationErrors.map((error) => QUOTE_FIELD_LABELS[error] || error).join(", ");
    toast.error(`Preencha os campos obrigatórios: ${missing}`);
    return false;
  }
  return true;
}

function validateFreshPrices(status: SaveStatus, items: QuoteItem[]): boolean {
  if (status === "draft") return true;
  const staleUnconfirmed = items.some((item) => {
    if (item.price_confirmed_at) return false;
    return getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days).isStale;
  });
  if (!staleUnconfirmed) return true;
  toast.error("Confirme os preços defasados antes de fechar o orçamento");
  return false;
}

function isPaPurchaser(isGerentePa: boolean, roles: string[] | undefined): boolean {
  return isGerentePa || Boolean(roles?.includes("comprador_pac"));
}

interface BudgetValidationParams {
  status: SaveStatus;
  isPaUser: boolean;
  paId: string | null | undefined;
  total: number;
}

function validateTransactionLimit(total: number, limit: number): boolean {
  if (limit <= 0 || total <= limit) return true;
  toast.error("Limite de alçada excedido!", {
    description: `Este pedido (R$ ${total.toLocaleString()}) supera seu limite de R$ ${limit.toLocaleString()}.`,
  });
  return false;
}

export function validateMonthlyBudget(total: number, budget: { verba_total: number; verba_consumida: number | null }): boolean {
  const remaining = budget.verba_total - (budget.verba_consumida || 0);
  if (total <= remaining) return true;
  toast.error("Verba insuficiente!", {
    description: `Você possui apenas R$ ${remaining.toLocaleString()} de verba disponível este mês.`,
  });
  return false;
}

async function validatePaBudget(params: BudgetValidationParams): Promise<boolean> {
  const { status, isPaUser, paId, total } = params;
  if (status === "draft" || !isPaUser) return true;
  if (!paId) {
    toast.error("Seu perfil não possui um Ponto de Atendimento vinculado.");
    return false;
  }
  const { data: budget, error } = await supabase
    .from('pa_budgets')
    .select('*')
    .eq('pa_id', paId)
    .eq('ano', new Date().getFullYear())
    .eq('mes', new Date().getMonth() + 1)
    .maybeSingle();
  const validation = validateBudgetForSubmission(budget, error);
  if (!validation.ok) {
    toast.error(validation.message);
    return false;
  }
  const limit = validation.budget.limite_alcada ?? 0;
  return validateTransactionLimit(total, limit) && validateMonthlyBudget(total, validation.budget);
}

function finalQuoteStatus(status: SaveStatus, isPaUser: boolean): SaveStatus {
  return status === "pending" && isPaUser ? "pending_singular_approval" : status;
}

interface QuoteDataParams {
  isEditMode: boolean;
  currentStatus: string;
  clientId: string;
  contactInfo: SelectedContactInfo | null;
  companyInfo: SelectedCompanyInfo | null;
  tags: string[];
  discountType: DiscountType;
  discountValue: number;
  markup: number;
  notes: string;
  internalNotes: string;
  validUntil: string;
  paymentTerms: string;
  deliveryTime: string;
  shippingType: string;
  shippingCost: number;
}

function buildQuoteData(params: QuoteDataParams): Partial<Quote> {
  const persistedStatus = (params.isEditMode ? params.currentStatus : "draft") as Quote["status"];
  const paidShipping = ["fob_pre", "fob"].includes(params.shippingType);
  return {
    client_id: truthyOr(params.clientId, undefined),
    client_name: truthyOr(params.contactInfo?.name, undefined),
    client_company: truthyOr(params.companyInfo?.name, undefined),
    client_cnpj: truthyOr(params.companyInfo?.cnpj, undefined),
    client_email: truthyOr(params.contactInfo?.email, undefined),
    client_phone: truthyOr(params.contactInfo?.phone, undefined),
    status: persistedStatus,
    tags: params.tags,
    discount_percent: params.discountType === "percent" ? params.discountValue : 0,
    discount_amount: params.discountType === "amount" ? params.discountValue : 0,
    negotiation_markup_percent: params.markup,
    notes: truthyOr(params.notes, undefined),
    internal_notes: truthyOr(params.internalNotes, undefined),
    valid_until: truthyOr(params.validUntil, undefined),
    payment_terms: truthyOr(params.paymentTerms, undefined),
    delivery_time: truthyOr(params.deliveryTime, undefined),
    shipping_type: truthyOr(params.shippingType, undefined),
    shipping_cost: paidShipping ? params.shippingCost : undefined,
  };
}

interface PersistQuoteParams {
  isEditMode: boolean;
  quoteId?: string;
  expectedRowVersion: number | null;
  quoteData: Partial<Quote>;
  items: QuoteItem[];
  idempotencyKeyRef: { current: string | null };
  createQuote: (quote: Partial<Quote>, items: QuoteItem[], idempotencyKey: string) => Promise<Quote | null>;
  updateQuote: (quoteId: string, quote: Partial<Quote>, items: QuoteItem[], expectedVersion: number) => Promise<Quote | null>;
}

async function persistQuote(params: PersistQuoteParams): Promise<Quote | null> {
  const { isEditMode, quoteId, expectedRowVersion, quoteData, items } = params;
  if (isEditMode && quoteId && expectedRowVersion !== null) {
    return params.updateQuote(
      quoteId,
      { ...quoteData, row_version: expectedRowVersion },
      items,
      expectedRowVersion,
    );
  }
  params.idempotencyKeyRef.current ??= crypto.randomUUID();
  return params.createQuote(quoteData, items, params.idempotencyKeyRef.current);
}

interface TransitionQuoteParams {
  quote: Quote;
  finalStatus: SaveStatus;
  persistedStatus: Quote["status"];
  maxDiscountPercent: number | null | undefined;
  realDiscountPercent: number;
  sellerNotes?: string;
  requestApproval: (quoteId: string, requested: number, allowed: number, notes?: string) => Promise<boolean>;
  updateQuoteStatus: (quoteId: string, status: Quote["status"]) => Promise<boolean>;
}

async function applyQuoteTransition(params: TransitionQuoteParams): Promise<boolean> {
  const quoteId = params.quote.id;
  if (!quoteId) return false;
  let effectiveStatus = params.persistedStatus;
  if (quoteStatusRequiresDraftReset(effectiveStatus)) {
    const reopened = await params.updateQuoteStatus(quoteId, "draft");
    if (!reopened) return false;
    effectiveStatus = "draft";
  }
  if (params.finalStatus === "pending_approval" && params.maxDiscountPercent !== null && params.maxDiscountPercent !== undefined) {
    return params.requestApproval(
      quoteId,
      params.realDiscountPercent,
      params.maxDiscountPercent,
      params.sellerNotes,
    );
  }
  if (params.finalStatus !== effectiveStatus) {
    return params.updateQuoteStatus(quoteId, params.finalStatus);
  }
  return true;
}

function persistedQuoteStatus(isEditMode: boolean, currentStatus: string): Quote["status"] {
  return (isEditMode ? currentStatus : "draft") as Quote["status"];
}

function canPersistQuoteVersion(isEditMode: boolean, expectedRowVersion: number | null): boolean {
  if (!isEditMode || expectedRowVersion !== null) return true;
  toast.error("Não foi possível confirmar a versão do orçamento. Recarregue a página antes de salvar.");
  return false;
}

export function quoteBuilderCanEdit(options: {
  saving: boolean;
  isEditMode: boolean;
  currentStatus: string;
  isLatestVersion: boolean;
}): boolean {
  if (options.saving) return false;
  return !options.isEditMode || isQuoteCommerciallyEditable(options.currentStatus, options.isLatestVersion);
}

interface CompleteSaveParams {
  result: Quote;
  isEditMode: boolean;
  expectedRowVersion: number | null;
  finalStatus: SaveStatus;
  transitionApplied: boolean;
  setExpectedRowVersion: (version: number | null) => void;
  markSaved: () => void;
  navigate: (path: string) => void;
}

export function completeQuoteSave(params: CompleteSaveParams): void {
  const { result, finalStatus, transitionApplied } = params;
  params.markSaved();
  if (params.isEditMode) {
    params.setExpectedRowVersion(result.row_version ?? params.expectedRowVersion);
  }
  if (!transitionApplied) {
    toast.warning("O orçamento foi salvo, mas não foi possível confirmar o status final. Consulte a tela do orçamento antes de tentar novamente.");
    params.navigate(`/orcamentos/${result.id}`);
    return;
  }
  if (finalStatus === "pending_singular_approval") {
    toast.success("Solicitação enviada para aprovação da Singular!");
  }
  params.navigate(`/orcamentos/${result.id}`);
}

export function useQuoteBuilderState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(quoteId);

  const { user, profile, roles: userRoles, isGerentePa } = useAuth();
  const { createQuote, updateQuote, updateQuoteStatus, fetchQuote, isLoading: quotesLoading } = useQuotes();
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
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  const [expectedRowVersion, setExpectedRowVersion] = useState<number | null>(null);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("prazo");
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [shippingType, setShippingType] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null);
  const [templateApplied, setTemplateApplied] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(isEditMode);
  const [quoteLoadError, setQuoteLoadError] = useState<string | null>(null);
  const [quoteReloadKey, setQuoteReloadKey] = useState(0);
  const [isSavingQuote, setIsSavingQuote] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<Set<number>>(new Set());
  const createIdempotencyKeyRef = useRef<string | null>(null);
  const isSavingQuoteRef = useRef(false);
  const setClientIdIfEmpty = useCallback((suggestedClientId: string) => {
    setClientId((current) => current.trim() ? current : suggestedClientId);
  }, []);
  const setItemsIfEmpty = useCallback((suggestedItems: QuoteItem[]) => {
    setItems((current) => current.length > 0 ? current : suggestedItems);
  }, []);
  const setActiveItemIndexIfUnset = useCallback((index: number) => {
    setActiveItemIndex((current) => current === null ? index : current);
  }, []);

  // ── Modular Hooks ──
  const search = useQuoteProductSearch();
  const { setProductSearch, setProductSearchOpen } = search;
  const initializationSetters = useMemo(() => ({
    setClientId, setClientIdIfEmpty, setContactId, setValidUntil, setNotes, setInternalNotes,
    setQuoteNumber, setCurrentStatus, setIsLatestVersion, setExpectedRowVersion, setContactInfo, setCompanyInfo,
    setDiscountType, setDiscountValue, setNegotiationMarkup, setPaymentTerms,
    setShippingType, setShippingCost, setDeliveryMode, setDeliveryDate,
    setDeliveryTime, setItems, setItemsIfEmpty, setActiveItemIndexIfUnset, setTags, setLoadingQuote, setQuoteLoadError,
    setActiveItemIndex, setExpandedItems,
  }), [setClientIdIfEmpty, setItemsIfEmpty, setActiveItemIndexIfUnset]);
  
  useQuoteInitialization({
    isEditMode, quoteId, reloadKey: quoteReloadKey, fetchQuote,
    locationState: location.state, 
    searchParams,
    setters: initializationSetters,
  });

  // ── Computeds ──
  const totals = useMemo(() => 
    calculateQuoteTotals({
      items,
      negotiationMarkup,
      discountType,
      discountValue,
      shippingCost,
      shippingType,
    }),
    [items, negotiationMarkup, discountType, discountValue, shippingCost, shippingType]
  );

  const completedSteps = useMemo(
    () => quoteBuilderSteps(clientId, items.length, paymentTerms, deliveryTime, shippingType),
    [clientId, items.length, paymentTerms, deliveryTime, shippingType],
  );

  const validationErrors = useMemo(() => validateQuoteForm({
    clientId, contactId, paymentTerms, deliveryTime, shippingType, shippingCost, itemsCount: items.length,
  }), [clientId, contactId, paymentTerms, deliveryTime, shippingType, shippingCost, items.length]);

  const isFormValid = validationErrors.length === 0;
  const isDraftValid = !!clientId;

  const isDiscountExceeded = useMemo(() => {
    if (maxDiscountPercent === null || maxDiscountPercent === undefined) return false;
    const effectivePercent = discountType === "percent" 
      ? discountValue 
      : (totals.subtotal > 0 ? (discountValue / totals.subtotal) * 100 : 0);
    return effectivePercent > maxDiscountPercent;
  }, [maxDiscountPercent, discountType, discountValue, totals.subtotal]);

  const canEdit = useMemo(() => {
    return quoteBuilderCanEdit({
      saving: isSavingQuote,
      isEditMode,
      currentStatus,
      isLatestVersion,
    });
  }, [isEditMode, currentStatus, isLatestVersion, isSavingQuote]);

  useEffect(() => {
    if (canEdit) return;
    setProductSearchOpen(false);
    setProductSearch("");
    setSelectedProductForColor(null);
  }, [canEdit, setProductSearch, setProductSearchOpen]);

  const draftScopeId = useMemo(
    () => buildQuoteDraftScope(user?.id, profile?.cooperativa_id, profile?.pa_id),
    [profile?.cooperativa_id, profile?.pa_id, user?.id],
  );

  const defaultTemplate = useMemo(() => templates.find(t => t.is_default), [templates]);

  // Guarda de "alterações não salvas" (useUnsavedChangesGuard): compara o
  // formulário atual contra um snapshot capturado só depois que o carregamento
  // inicial termina (loadingQuote vira false) — assim, num orçamento existente,
  // os dados que acabaram de ser carregados não contam como "não salvos".
  // formSnapshotRef guarda os valores mais recentes a cada render (sem disparar
  // efeito) só para o efeito abaixo poder ler o estado "no instante em que
  // loadingQuote virou false" sem precisar listá-los como dependências.
  const formSnapshotRef = useRef({
    clientId, contactId, items, notes, internalNotes, tags, validUntil,
    paymentTerms, deliveryTime, deliveryMode, deliveryDate, shippingType, shippingCost,
    discountType, discountValue, negotiationMarkup,
  });
  formSnapshotRef.current = {
    clientId, contactId, items, notes, internalNotes, tags, validUntil,
    paymentTerms, deliveryTime, deliveryMode, deliveryDate, shippingType, shippingCost,
    discountType, discountValue, negotiationMarkup,
  };
  const initialSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    if (!loadingQuote && !quoteLoadError && initialSnapshotRef.current === null) {
      initialSnapshotRef.current = JSON.stringify(formSnapshotRef.current);
    }
  }, [loadingQuote, quoteLoadError]);

  const hasUnsavedData = useMemo(() => {
    if (initialSnapshotRef.current === null) return false;
    const current = JSON.stringify({
      clientId, contactId, items, notes, internalNotes, tags, validUntil,
      paymentTerms, deliveryTime, deliveryMode, deliveryDate, shippingType, shippingCost,
      discountType, discountValue, negotiationMarkup,
    });
    return current !== initialSnapshotRef.current;
  }, [clientId, contactId, items, notes, internalNotes, tags, validUntil, paymentTerms, deliveryTime, deliveryMode, deliveryDate, shippingType, shippingCost, discountType, discountValue, negotiationMarkup]);

  const markSaved = useCallback(() => {
    initialSnapshotRef.current = JSON.stringify(formSnapshotRef.current);
    useNavigationGuardStore.getState().setDirty('quote-builder', false);
  }, []);

  // ── Actions ──
  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handlePersonalizationsChange = useCallback((index: number, personalizations: QuoteItemPersonalization[]) => {
    setItems(prev => prev.map((item, idx) => idx === index ? { ...item, personalizations } : item));
  }, []);

  const addProductWithColor = useCallback((product: Product, variant: ExternalVariantStock | null) => {
    // O diálogo fica fora dos fieldsets do formulário; bloqueia também o callback
    // caso uma seleção já iniciada concorra com o snapshot do salvamento.
    if (isSavingQuoteRef.current) return;
    const newItem = buildQuoteItem(product, variant);
    const { color_name: colorName, size_code: sizeCode } = newItem;
    
    const existingIndex = items.findIndex(i => i.product_id === product.id && i.color_name === colorName && i.size_code === sizeCode);
    
    if (existingIndex >= 0) {
      setItems(prev => prev.map((item, idx) => idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item));
      setActiveItemIndex(existingIndex);
    } else {
      setItems(prev => {
        const newItems = [...prev, newItem];
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
    const newItems = (template.items_data ?? []).map(mapTemplateItem);
    setItems(newItems);
    applyTemplateDiscount(template, setDiscountType, setDiscountValue);
    if (template.notes) setNotes(template.notes);
    if (template.internal_notes) setInternalNotes(template.internal_notes);
    if (template.validity_days) setValidUntil(format(addDays(new Date(), template.validity_days), "yyyy-MM-dd"));
    setTemplateApplied(template.name);
    toast.success(`Template "${template.name}" aplicado!`);
  }, []);

  const handleSaveQuote = useCallback(async (status: SaveStatus = "draft", sellerNotes?: string) => {
    if (!canEdit || isSavingQuoteRef.current) {
      toast.error("Este orçamento está disponível somente para leitura.");
      return;
    }
    if (!validateSaveForm(status, isDraftValid, isFormValid, validationErrors)) return;
    if (!validateFreshPrices(status, items)) return;
    const isPaUser = isPaPurchaser(isGerentePa, userRoles);
    const finalStatus = finalQuoteStatus(status, isPaUser);
    if (!canPersistQuoteVersion(isEditMode, expectedRowVersion)) return;
    isSavingQuoteRef.current = true;
    setIsSavingQuote(true);
    try {
      const validBudget = await validatePaBudget({ status, isPaUser, paId: profile?.pa_id, total: totals.total });
      if (!validBudget) return;

      const persistedStatus = persistedQuoteStatus(isEditMode, currentStatus);
      const quoteData = buildQuoteData({
        isEditMode, currentStatus, clientId, contactInfo, companyInfo, tags,
        discountType, discountValue, markup: totals.markup, notes, internalNotes,
        validUntil, paymentTerms, deliveryTime, shippingType, shippingCost,
      });
      const result = await persistQuote({
        isEditMode, quoteId, expectedRowVersion, quoteData, items,
        idempotencyKeyRef: createIdempotencyKeyRef, createQuote, updateQuote,
      });
      if (!result) return;

      createIdempotencyKeyRef.current = null;
      const transitionApplied = await applyQuoteTransition({
        quote: result, finalStatus, persistedStatus, maxDiscountPercent,
        realDiscountPercent: totals.realDiscountPercent, sellerNotes,
        requestApproval, updateQuoteStatus,
      });
      completeQuoteSave({
        result, isEditMode, expectedRowVersion, finalStatus, transitionApplied,
        setExpectedRowVersion, markSaved, navigate,
      });
    } finally {
      isSavingQuoteRef.current = false;
      setIsSavingQuote(false);
    }
  }, [canEdit, isDraftValid, isFormValid, validationErrors, clientId, contactInfo, companyInfo, discountType, discountValue, totals, notes, internalNotes, tags, validUntil, paymentTerms, deliveryTime, shippingType, shippingCost, isEditMode, quoteId, items, navigate, updateQuote, createQuote, updateQuoteStatus, currentStatus, expectedRowVersion, maxDiscountPercent, requestApproval, isGerentePa, userRoles, profile?.pa_id, markSaved]);

  return {
    navigate, quoteId, isEditMode, loadingQuote, quoteLoadError,
    retryQuoteLoad: () => setQuoteReloadKey((current) => current + 1),
    hasUnsavedData, user, draftScopeId,
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
    quotesLoading, templates, defaultTemplate,
    maxDiscountPercent, isDiscountExceeded,
    formatCurrency, calculateItemPersonalizationTotal, calculateItemTotal,
    toggleExpanded, handlePersonalizationsChange,
    handleProductClick: setSelectedProductForColor,
    addProductWithColor, updateItemQuantity, updateItemPrice, removeItem,
    groupItemsIntoKit, ungroupItems, selectedItemIndexes, toggleItemSelection,
    setSelectedItemIndexes,
    confirmItemPrice: (index: number) => {
      const ts = new Date().toISOString();
      setItems(prev => prev.map((item, idx) => idx === index ? { ...item, price_confirmed_at: ts } : item));
    },
    confirmAllStalePrices: () => {
      const ts = new Date().toISOString();
      setItems(prev => prev.map(item => {
        if (item.price_confirmed_at) return item;
        const freshness = getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days);
        return freshness.shouldWarn ? { ...item, price_confirmed_at: ts } : item;
      }));
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
