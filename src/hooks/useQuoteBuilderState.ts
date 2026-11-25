/**
 * useQuoteBuilderState — Estado centralizado do QuoteBuilder (REFATORADO)
 * Extrai toda a lógica de estado, cálculos e ações do QuoteBuilderPage.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useSellerDiscountLimits } from "@/hooks/useSellerDiscountLimits";
import { useDiscountApproval } from "@/hooks/useDiscountApproval";
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
import { findMergeableQuoteItemIndex, getQuoteItemVariantIdentity } from "@/hooks/quotes/quoteVariantIdentity";
import { buildQuoteDraftScope } from "@/lib/quotes/quote-draft-scope";
import type { QuoteBuilderStep } from "@/components/quotes/QuoteBuilderStepper";
import { calculateQuoteTotals, formatCurrency, calculateItemTotal, calculateItemPersonalizationTotal } from "@/utils/quote-calculations";
import type { Product, DiscountType, DeliveryMode } from "@/types/quote-builder";
import { useQuoteProductSearch } from "@/hooks/quote/useQuoteProductSearch";
import { useQuoteInitialization } from "@/hooks/quote/useQuoteInitialization";
import { useProductsContextSafe } from "@/contexts/ProductsContext";
import { isQuoteCommerciallyEditable, quoteStatusRequiresDraftReset } from "@/lib/quote-status-config";
import { autorizarSaida } from "@/lib/navigation/dirty-registry";

export function validateBudgetForSubmission<T>(
  budget: T | null,
  error: unknown,
): { ok: true; budget: T } | { ok: false; message: string } {
  if (error) {
    return {
      ok: false,
      message: 'Não foi possível validar a verba do PA. Tente novamente antes de enviar.',
    };
  }
  if (!budget) {
    return {
      ok: false,
      message: 'A verba desta competência ainda não foi configurada para o seu PA.',
    };
  }
  return { ok: true, budget };
}

function truthyOr<T>(value: T | null | undefined | false | '' | 0, fallback: T): T {
  return value ? (value as T) : fallback;
}

function definedOr<T>(value: T | null | undefined, fallback: T): T {
  return value === undefined || value === null ? fallback : value;
}

/**
 * Remove os campos de frescor do catálogo (não persistidos em `quote_items`)
 * da representação usada no dirty-check: a hidratação tardia preenche esses
 * campos depois do snapshot inicial e isso não pode contar como "alteração
 * não salva".
 */
function stripCatalogFreshness(items: QuoteItem[]): QuoteItem[] {
  return items.map((item) => ({
    ...item,
    price_updated_at: undefined,
    price_freshness_threshold_days: undefined,
  }));
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
  if (clientId) steps.push('client');
  if (itemCount > 0) steps.push('items');
  if (hasConditions) steps.push('conditions');
  if ([clientId, itemCount > 0, hasConditions].every(Boolean)) steps.push('review');
  return steps;
}

function preferredProductImage(
  product: Product,
  variant: ExternalVariantStock | null,
): string | undefined {
  if (variant?.selected_thumbnail) return variant.selected_thumbnail;
  if (variant?.images?.length) return variant.images[0];
  if (Array.isArray(product.images) && product.images.length > 0)
    return product.images[0] as string;
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
    unit_price: definedOr(selected.sale_price, product.price),
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
    product_id: truthyOr(item.productId, ''),
    product_name: item.productName,
    product_sku: item.productSku,
    product_image_url: item.productImageUrl,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    color_name: item.colorName,
    color_hex: item.colorHex,
    personalizations: item.personalizations?.map((personalization) => ({
      technique_id: truthyOr(personalization.techniqueId, ''),
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
    setDiscountType('percent');
    setDiscountValue(template.discount_percent ?? 0);
    return;
  }
  if ((template.discount_amount ?? 0) > 0) {
    setDiscountType('amount');
    setDiscountValue(template.discount_amount ?? 0);
  }
}

type SaveStatus = 'draft' | 'pending' | 'pending_approval' | 'pending_singular_approval';

function validateSaveForm(
  status: SaveStatus,
  isDraftValid: boolean,
  isFormValid: boolean,
  validationErrors: string[],
): boolean {
  if (status === 'draft' && !isDraftValid) {
    toast.error('Selecione uma empresa para salvar o rascunho.');
    return false;
  }
  if (status !== 'draft' && !isFormValid) {
    const missing = validationErrors.map((error) => QUOTE_FIELD_LABELS[error] || error).join(', ');
    toast.error(`Preencha os campos obrigatórios: ${missing}`);
    return false;
  }
  return true;
}

function validateFreshPrices(status: SaveStatus, items: QuoteItem[]): boolean {
  if (status === 'draft') return true;
  const staleUnconfirmed = items.some((item) => {
    if (item.price_confirmed_at) return false;
    return getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days).isStale;
  });
  if (!staleUnconfirmed) return true;
  toast.error('Confirme os preços defasados antes de fechar o orçamento');
  return false;
}

function isPaPurchaser(isGerentePa: boolean, roles: string[] | undefined): boolean {
  return isGerentePa || Boolean(roles?.includes('comprador_pac'));
}

interface BudgetValidationParams {
  status: SaveStatus;
  isPaUser: boolean;
  paId: string | null | undefined;
  total: number;
}

function validateTransactionLimit(total: number, limit: number): boolean {
  if (limit <= 0 || total <= limit) return true;
  toast.error('Limite de alçada excedido!', {
    description: `Este pedido (R$ ${total.toLocaleString()}) supera seu limite de R$ ${limit.toLocaleString()}.`,
  });
  return false;
}

function validateMonthlyBudget(
  total: number,
  budget: { verba_total: number; verba_consumida: number | null },
): boolean {
  const remaining = budget.verba_total - (budget.verba_consumida || 0);
  if (budget.verba_total <= 0 || total <= remaining) return true;
  toast.error('Verba insuficiente!', {
    description: `Você possui apenas R$ ${remaining.toLocaleString()} de verba disponível este mês.`,
  });
  return false;
}

async function validatePaBudget(params: BudgetValidationParams): Promise<boolean> {
  const { status, isPaUser, paId, total } = params;
  if (status === 'draft' || !isPaUser) return true;
  if (!paId) {
    toast.error('Seu perfil não possui um Ponto de Atendimento vinculado.');
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
  return status === 'pending' && isPaUser ? 'pending_singular_approval' : status;
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
  const persistedStatus = (params.isEditMode ? params.currentStatus : 'draft') as Quote['status'];
  const paidShipping = ['fob_pre', 'fob'].includes(params.shippingType);
  return {
    client_id: truthyOr(params.clientId, undefined),
    client_name: truthyOr(params.contactInfo?.name, undefined),
    client_company: truthyOr(params.companyInfo?.name, undefined),
    client_cnpj: truthyOr(params.companyInfo?.cnpj, undefined),
    client_email: truthyOr(params.contactInfo?.email, undefined),
    client_phone: truthyOr(params.contactInfo?.phone, undefined),
    status: persistedStatus,
    tags: params.tags,
    discount_percent: params.discountType === 'percent' ? params.discountValue : 0,
    discount_amount: params.discountType === 'amount' ? params.discountValue : 0,
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
  createQuote: (
    quote: Partial<Quote>,
    items: QuoteItem[],
    idempotencyKey: string,
  ) => Promise<Quote | null>;
  updateQuote: (
    quoteId: string,
    quote: Partial<Quote>,
    items: QuoteItem[],
    expectedVersion: number,
  ) => Promise<Quote | null>;
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
  persistedStatus: Quote['status'];
  maxDiscountPercent: number | null | undefined;
  realDiscountPercent: number;
  sellerNotes?: string;
  requestApproval: (
    quoteId: string,
    requested: number,
    allowed: number,
    notes?: string,
  ) => Promise<boolean>;
  updateQuoteStatus: (quoteId: string, status: Quote['status']) => Promise<boolean>;
}

interface TransicaoAplicada {
  aplicada: boolean;
  /**
   * Quantas vezes a versão da linha subiu na transição. As RPCs de status
   * (`bulk_update_quote_status_atomic`, `request_discount_approval_atomic`)
   * fazem `row_version = row_version + 1`, então quem permanece na tela depois
   * de salvar precisa somar esses saltos: sem isso o próximo salvamento sairia
   * com versão defasada e seria recusado pelo lock otimista.
   */
  saltosDeVersao: number;
  /**
   * Status que a tela deve passar a considerar vigente, ou `null` quando nada
   * mudou no banco. A gravação seguinte envia o status da tela
   * (`buildQuoteData`), e a RPC recusa divergência com
   * `42501 / Use o fluxo formal para alterar o status`: quem fica na tela
   * depois de salvar precisa acompanhar a reabertura e o pedido de aprovação.
   */
  statusVigente: string | null;
}

type AcaoDaTransicao =
  | { tipo: "aprovar"; requested: number; allowed: number; notes?: string }
  | { tipo: "status"; status: Quote["status"] }
  | { tipo: "nada" };

function decidirAcaoDaTransicao(
  params: TransitionQuoteParams,
  effectiveStatus: string,
): AcaoDaTransicao {
  if (
    params.finalStatus === "pending_approval" &&
    params.maxDiscountPercent !== null &&
    params.maxDiscountPercent !== undefined
  ) {
    return {
      tipo: "aprovar",
      requested: params.realDiscountPercent,
      allowed: params.maxDiscountPercent,
      notes: params.sellerNotes,
    };
  }
  if (params.finalStatus !== effectiveStatus) {
    return { tipo: "status", status: params.finalStatus };
  }
  return { tipo: "nada" };
}

export async function applyQuoteTransition(
  params: TransitionQuoteParams,
): Promise<TransicaoAplicada> {
  const quoteId = params.quote.id;
  if (!quoteId) return { aplicada: false, saltosDeVersao: 0, statusVigente: null };

  let saltosDeVersao = 0;
  let statusVigente: string | null = null;
  let effectiveStatus = params.persistedStatus;
  if (quoteStatusRequiresDraftReset(effectiveStatus)) {
    const reopened = await params.updateQuoteStatus(quoteId, "draft");
    if (!reopened) return { aplicada: false, saltosDeVersao, statusVigente };
    effectiveStatus = "draft";
    saltosDeVersao = 1;
    statusVigente = "draft";
  }

  const acao = decidirAcaoDaTransicao(params, effectiveStatus);
  if (acao.tipo === "nada") return { aplicada: true, saltosDeVersao, statusVigente };

  const aplicada =
    acao.tipo === "aprovar"
      ? await params.requestApproval(quoteId, acao.requested, acao.allowed, acao.notes)
      : await params.updateQuoteStatus(quoteId, acao.status);

  const statusAlcancado = acao.tipo === "aprovar" ? "pending_approval" : acao.status;
  return {
    aplicada,
    saltosDeVersao: aplicada ? saltosDeVersao + 1 : saltosDeVersao,
    statusVigente: aplicada ? statusAlcancado : statusVigente,
  };
}

function persistedQuoteStatus(isEditMode: boolean, currentStatus: string): Quote['status'] {
  return (isEditMode ? currentStatus : 'draft') as Quote['status'];
}

function canPersistQuoteVersion(isEditMode: boolean, expectedRowVersion: number | null): boolean {
  if (!isEditMode || expectedRowVersion !== null) return true;
  toast.error(
    'Não foi possível confirmar a versão do orçamento. Recarregue a página antes de salvar.',
  );
  return false;
}

interface CompleteSaveParams {
  result: Quote;
  isEditMode: boolean;
  expectedRowVersion: number | null;
  finalStatus: SaveStatus;
  transitionApplied: boolean;
  saltosDeVersao: number;
  statusVigente: string | null;
  setExpectedRowVersion: (version: number | null) => void;
  setStatusDaTela: (status: string) => void;
  /**
   * Alguém editou a tela enquanto o servidor gravava? O snapshot enviado é a
   * referência do que está salvo, então edição posterior a ele continua sendo
   * trabalho não salvo e não pode ser levada embora na saída para o detalhe.
   */
  haEdicaoPosteriorAoEnvio: () => boolean;
  navigate: (path: string) => void;
}

export function completeQuoteSave(params: CompleteSaveParams): void {
  const { result, finalStatus, transitionApplied } = params;
  if (params.isEditMode) {
    const versaoDoServidor = result.row_version ?? params.expectedRowVersion;
    // Soma os saltos da transição de status: quem edita durante a gravação fica
    // na tela e salvaria de novo com a versão de antes da reabertura.
    params.setExpectedRowVersion(
      typeof versaoDoServidor === 'number'
        ? versaoDoServidor + params.saltosDeVersao
        : versaoDoServidor,
    );
  }
  if (params.statusVigente) {
    // A reabertura e o pedido de aprovação mudam o status no banco. A tela
    // continua enviando `currentStatus`, então sem acompanhar aqui a próxima
    // gravação é recusada com "use o fluxo formal para alterar o status".
    params.setStatusDaTela(params.statusVigente);
  }
  if (!transitionApplied) {
    toast.warning(
      'O orçamento foi salvo, mas não foi possível confirmar o status final. Consulte a tela do orçamento antes de tentar novamente.',
    );
    // O orcamento ja esta gravado: ir para o detalhe nao perde nada e nao pode
    // cair no aviso de "alteracoes nao salvas" (o snapshot limpo chega um
    // render depois da navegacao). Edicao feita durante a chamada fica de fora
    // da autorizacao: ela nao esta no orcamento gravado.
    if (!params.haEdicaoPosteriorAoEnvio()) autorizarSaida();
    params.navigate(`/orcamentos/${result.id}`);
    return;
  }
  if (finalStatus === 'pending_singular_approval') {
    toast.success('Solicitação enviada para aprovação da Singular!');
  }
  if (!params.haEdicaoPosteriorAoEnvio()) autorizarSaida();
  params.navigate(`/orcamentos/${result.id}`);
}

// eslint-disable-next-line max-lines-per-function -- hook agregador preexistente; divisao fora do escopo desta recuperacao
export function useQuoteBuilderState() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: quoteId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditMode = Boolean(quoteId);

  const { user, profile, roles: userRoles, isGerentePa } = useAuth();
  const {
    createQuote,
    updateQuote,
    updateQuoteStatus,
    fetchQuote,
    isLoading: quotesLoading,
  } = useQuotes();
  const { templates } = useQuoteTemplates();
  const { myLimit: maxDiscountPercent } = useSellerDiscountLimits();
  const { requestApproval } = useDiscountApproval();

  // ── State ──
  const [clientId, setClientId] = useState('');
  const [contactId, setContactId] = useState('');
  const [companyInfo, setCompanyInfo] = useState<SelectedCompanyInfo | null>(null);
  const [contactInfo, setContactInfo] = useState<SelectedContactInfo | null>(null);
  const [validityDays, setValidityDays] = useState('7');
  const [validUntil, setValidUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [discountType, setDiscountType] = useState<DiscountType>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [negotiationMarkup, setNegotiationMarkup] = useState(0);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [quoteNumber, setQuoteNumber] = useState('');
  const [currentStatus, setCurrentStatus] = useState('draft');
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  const [expectedRowVersion, setExpectedRowVersion] = useState<number | null>(null);
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('prazo');
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  const [shippingType, setShippingType] = useState('');
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedProductForColor, setSelectedProductForColor] = useState<Product | null>(null);
  const [templateApplied, setTemplateApplied] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(isEditMode);
  const [quoteLoadError, setQuoteLoadError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [selectedItemIndexes, setSelectedItemIndexes] = useState<Set<number>>(new Set());
  const createIdempotencyKeyRef = useRef<string | null>(null);
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
  const initializationSetters = useMemo(
    () => ({
      setClientId,
      setClientIdIfEmpty,
      setContactId,
      setValidUntil,
      setNotes,
      setInternalNotes,
      setQuoteNumber,
      setCurrentStatus,
      setIsLatestVersion,
      setExpectedRowVersion,
      setContactInfo,
      setCompanyInfo,
      setDiscountType,
      setDiscountValue,
      setNegotiationMarkup,
      setPaymentTerms,
      setShippingType,
      setShippingCost,
      setDeliveryMode,
      setDeliveryDate,
      setDeliveryTime,
      setItems,
      setItemsIfEmpty,
      setTags,
      setLoadingQuote,
      setQuoteLoadError,
      setActiveItemIndex,
      setActiveItemIndexIfUnset,
      setExpandedItems,
    }),
    [setClientIdIfEmpty, setItemsIfEmpty, setActiveItemIndexIfUnset],
  );

  useQuoteInitialization({
    isEditMode,
    quoteId,
    fetchQuote,
    locationState: location.state,
    searchParams,
    setters: initializationSetters,
  });

  // Hidratação tardia de preço: quote_items não persiste price_updated_at e
  // price_freshness_threshold_days; getProductById retorna undefined quando o
  // produto ainda não está no cache (busca lazy). Quando o catálogo termina a
  // busca e popular o cache, mescla apenas os campos de preço nos itens — sem
  // reaplicar dados salvos nem sobrescrever edições do usuário.
  //
  // Agendamento (uma vez) separado da leitura reativa: getProductById reagenda
  // a busca em cada chamada, e um produto inativo (fora do cache para sempre)
  // faria o catálogo publicar um mapa novo a cada resposta vazia → loop infinito.
  // getProductsByIds faz o mesmo agendamento por conjunto, chamado uma só vez
  // por itens/cache; a leitura usa `products` (reativo) sem reagendar.
  const productsCtx = useProductsContextSafe();
  const catalogProducts = productsCtx?.products;
  const hydrationQueuedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!productsCtx || items.length === 0) return;
    const pendingIds = items
      .filter((item) => !item.price_updated_at || !item.price_freshness_threshold_days)
      .map((item) => item.product_id)
      .filter((id) => id && !hydrationQueuedRef.current.has(id));
    if (pendingIds.length > 0) {
      pendingIds.forEach((id) => hydrationQueuedRef.current.add(id));
      productsCtx.getProductsByIds(pendingIds);
    }
  }, [items, catalogProducts, productsCtx]);
  // Leitura reativa: só mescla quando a resposta chegou ao cache. Lê do mapa
  // mutável sem chamar getProductById (que reagendaria busca para IDs ausentes).
  useEffect(() => {
    if (!productsCtx || items.length === 0 || catalogProducts === undefined) return;
    const byId = new Map(catalogProducts.map((p) => [p.id, p]));
    const refreshed = items.map((item) => {
      if (item.price_updated_at && item.price_freshness_threshold_days) return item;
      const product = byId.get(item.product_id);
      if (!product) return item;
      const next = {
        ...item,
        price_updated_at: product.priceUpdatedAt ?? item.price_updated_at ?? null,
        price_freshness_threshold_days:
          product.priceFreshnessThresholdDays ?? item.price_freshness_threshold_days ?? null,
      };
      return next.price_updated_at === item.price_updated_at &&
        next.price_freshness_threshold_days === item.price_freshness_threshold_days
        ? item
        : next;
    });
    const changed = refreshed.some((item, idx) => item !== items[idx]);
    if (changed) setItems(refreshed);
  }, [items, catalogProducts, productsCtx]);

  // ── Computeds ──
  const totals = useMemo(
    () =>
      calculateQuoteTotals({
        items,
        negotiationMarkup,
        discountType,
        discountValue,
        shippingCost,
        shippingType,
      }),
    [items, negotiationMarkup, discountType, discountValue, shippingCost, shippingType],
  );

  const completedSteps = useMemo(
    () => quoteBuilderSteps(clientId, items.length, paymentTerms, deliveryTime, shippingType),
    [clientId, items.length, paymentTerms, deliveryTime, shippingType],
  );

  const validationErrors = useMemo(
    () =>
      validateQuoteForm({
        clientId,
        contactId,
        paymentTerms,
        deliveryTime,
        shippingType,
        shippingCost,
        itemsCount: items.length,
      }),
    [clientId, contactId, paymentTerms, deliveryTime, shippingType, shippingCost, items.length],
  );

  const isFormValid = validationErrors.length === 0;
  const isDraftValid = !!clientId;

  const isDiscountExceeded = useMemo(() => {
    if (maxDiscountPercent === null || maxDiscountPercent === undefined) return false;
    const effectivePercent =
      discountType === 'percent'
        ? discountValue
        : totals.subtotal > 0
          ? (discountValue / totals.subtotal) * 100
          : 0;
    return effectivePercent > maxDiscountPercent;
  }, [maxDiscountPercent, discountType, discountValue, totals.subtotal]);

  const canEdit = useMemo(() => {
    if (!isEditMode) return true;
    return isQuoteCommerciallyEditable(currentStatus, isLatestVersion);
  }, [isEditMode, currentStatus, isLatestVersion]);

  const defaultTemplate = useMemo(() => templates.find((t) => t.is_default), [templates]);

  // Guarda de "alterações não salvas" (useUnsavedChangesGuard): compara o
  // formulário atual contra um snapshot capturado só depois que o carregamento
  // inicial termina (loadingQuote vira false) — assim, num orçamento existente,
  // os dados que acabaram de ser carregados não contam como "não salvos".
  // formSnapshotRef guarda os valores mais recentes a cada render (sem disparar
  // efeito) só para o efeito abaixo poder ler o estado "no instante em que
  // loadingQuote virou false" sem precisar listá-los como dependências.
  const formSnapshotRef = useRef({
    clientId,
    contactId,
    items: stripCatalogFreshness(items),
    notes,
    internalNotes,
    tags,
    validUntil,
    paymentTerms,
    deliveryTime,
    deliveryMode,
    deliveryDate,
    shippingType,
    shippingCost,
    discountType,
    discountValue,
    negotiationMarkup,
  });
  formSnapshotRef.current = {
    clientId,
    contactId,
    items: stripCatalogFreshness(items),
    notes,
    internalNotes,
    tags,
    validUntil,
    paymentTerms,
    deliveryTime,
    deliveryMode,
    deliveryDate,
    shippingType,
    shippingCost,
    discountType,
    discountValue,
    negotiationMarkup,
  };
  // Estado, não ref: `hasUnsavedData` é um useMemo sobre os campos do
  // formulário. Escrever num ref não muda dependência nenhuma, então o valor
  // memorizado continuaria `true` depois do salvamento e o guarda de saída
  // seguiria avisando "alterações não salvas" num orçamento recém-salvo.
  const [baselineSalvo, setBaselineSalvo] = useState<string | null>(null);
  useEffect(() => {
    if (!loadingQuote && baselineSalvo === null) {
      setBaselineSalvo(JSON.stringify(formSnapshotRef.current));
    }
  }, [loadingQuote, baselineSalvo]);

  const hasUnsavedData = useMemo(() => {
    if (baselineSalvo === null) return false;
    const current = JSON.stringify({
      clientId,
      contactId,
      items: stripCatalogFreshness(items),
      notes,
      internalNotes,
      tags,
      validUntil,
      paymentTerms,
      deliveryTime,
      deliveryMode,
      deliveryDate,
      shippingType,
      shippingCost,
      discountType,
      discountValue,
      negotiationMarkup,
    });
    return current !== baselineSalvo;
  }, [
    baselineSalvo,
    clientId,
    contactId,
    items,
    notes,
    internalNotes,
    tags,
    validUntil,
    paymentTerms,
    deliveryTime,
    deliveryMode,
    deliveryDate,
    shippingType,
    shippingCost,
    discountType,
    discountValue,
    negotiationMarkup,
  ]);

  // ── Actions ──
  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handlePersonalizationsChange = useCallback(
    (index: number, personalizations: QuoteItemPersonalization[]) => {
      setItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, personalizations } : item)),
      );
    },
    [],
  );

  const addProductWithColor = useCallback(
    (product: Product, variant: ExternalVariantStock | null) => {
      const newItem = buildQuoteItem(product, variant);

      const existingIndex = findMergeableQuoteItemIndex(items, newItem);

      if (existingIndex >= 0) {
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        );
        setActiveItemIndex(existingIndex);
      } else {
        setItems((prev) => {
          const newItems = [...prev, newItem];
          setActiveItemIndex(newItems.length - 1);
          return newItems;
        });
      }
      setSelectedProductForColor(null);
      search.setProductSearchOpen(false);
      search.setProductSearch('');
    },
    [items, search],
  );

  const updateItemQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) return;
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, quantity } : item)));
  }, []);

  const updateItemPrice = useCallback((index: number, price: number) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, unit_price: price } : item)),
    );
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setSelectedItemIndexes((prev) => {
      const n = new Set(prev);
      n.delete(index);
      // Adjust indexes above removed
      const adjusted = new Set<number>();
      prev.forEach((i) => {
        if (i < index) adjusted.add(i);
        else if (i > index) adjusted.add(i - 1);
      });
      return adjusted;
    });
  }, []);

  const groupItemsIntoKit = useCallback((indexes: number[], kitName: string) => {
    const groupId = crypto.randomUUID();
    setItems((prev) =>
      prev.map((item, idx) =>
        indexes.includes(idx) ? { ...item, kit_group_id: groupId, kit_name: kitName } : item,
      ),
    );
    setSelectedItemIndexes(new Set());
    toast.success(`Itens agrupados no kit "${kitName}"`);
  }, []);

  const ungroupItems = useCallback((groupId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.kit_group_id === groupId ? { ...item, kit_group_id: null, kit_name: null } : item,
      ),
    );
    toast.success('Itens desagrupados do kit');
  }, []);

  const toggleItemSelection = useCallback((index: number) => {
    setSelectedItemIndexes((prev) => {
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
    if (template.validity_days)
      setValidUntil(format(addDays(new Date(), template.validity_days), 'yyyy-MM-dd'));
    setTemplateApplied(template.name);
    toast.success(`Template "${template.name}" aplicado!`);
  }, []);

  const handleSaveQuote = useCallback(
    // eslint-disable-next-line max-lines-per-function -- formatacao do prettier elevou a contagem; divisao fora do escopo desta recuperacao
    async (status: SaveStatus = 'draft', sellerNotes?: string) => {
      if (!canEdit) {
        toast.error('Este orçamento está disponível somente para leitura.');
        return;
      }
      if (!validateSaveForm(status, isDraftValid, isFormValid, validationErrors)) return;
      if (!validateFreshPrices(status, items)) return;
      // Fotografa o formulário antes de qualquer espera: o que vai ao servidor
      // são os valores desta closure (os do clique), então a referência de
      // "está gravado" precisa ser a mesma foto. Lendo depois do await da verba
      // de PA, uma edição feita durante a espera entraria na foto sem ter sido
      // enviada e seria dada como salva.
      const submittedFormSnapshot = JSON.stringify(formSnapshotRef.current);
      const isPaUser = isPaPurchaser(isGerentePa, userRoles);
      const validBudget = await validatePaBudget({
        status,
        isPaUser,
        paId: profile?.pa_id,
        total: totals.total,
      });
      if (!validBudget) return;
      const finalStatus = finalQuoteStatus(status, isPaUser);
      if (!canPersistQuoteVersion(isEditMode, expectedRowVersion)) return;

      const persistedStatus = persistedQuoteStatus(isEditMode, currentStatus);
      const quoteData = buildQuoteData({
        isEditMode,
        currentStatus,
        clientId,
        contactInfo,
        companyInfo,
        tags,
        discountType,
        discountValue,
        markup: totals.markup,
        notes,
        internalNotes,
        validUntil,
        paymentTerms,
        deliveryTime,
        shippingType,
        shippingCost,
      });
      const result = await persistQuote({
        isEditMode,
        quoteId,
        expectedRowVersion,
        quoteData,
        items,
        idempotencyKeyRef: createIdempotencyKeyRef,
        createQuote,
        updateQuote,
      });
      if (!result) return;

      // O servidor confirmou. A referência do guarda de saída passa a ser o que
      // foi enviado — e não o estado atual, para não marcar como salva uma edição
      // feita durante a chamada. Sem isto, `hasUnsavedData` ficava true para
      // sempre depois do primeiro salvamento e o vendedor era avisado de
      // "alterações não salvas" ao sair de um orçamento que acabara de salvar.
      setBaselineSalvo(submittedFormSnapshot);
      createIdempotencyKeyRef.current = null;
      const transicao = await applyQuoteTransition({
        quote: result,
        finalStatus,
        persistedStatus,
        maxDiscountPercent,
        realDiscountPercent: totals.realDiscountPercent,
        sellerNotes,
        requestApproval,
        updateQuoteStatus,
      });
      completeQuoteSave({
        haEdicaoPosteriorAoEnvio: () => JSON.stringify(formSnapshotRef.current) !== submittedFormSnapshot,
        result,
        isEditMode,
        expectedRowVersion,
        finalStatus,
        transitionApplied: transicao.aplicada,
        saltosDeVersao: transicao.saltosDeVersao,
        statusVigente: transicao.statusVigente,
        setExpectedRowVersion,
        setStatusDaTela: setCurrentStatus,
        navigate,
      });
    },
    [
      canEdit,
      isDraftValid,
      isFormValid,
      validationErrors,
      clientId,
      contactInfo,
      companyInfo,
      discountType,
      discountValue,
      totals,
      notes,
      internalNotes,
      tags,
      validUntil,
      paymentTerms,
      deliveryTime,
      shippingType,
      shippingCost,
      isEditMode,
      quoteId,
      items,
      navigate,
      updateQuote,
      createQuote,
      updateQuoteStatus,
      currentStatus,
      expectedRowVersion,
      maxDiscountPercent,
      requestApproval,
      isGerentePa,
      userRoles,
      profile?.pa_id,
    ],
  );

  const draftScopeId = useMemo(
    () => buildQuoteDraftScope(user?.id, profile?.cooperativa_id, profile?.pa_id),
    [profile?.cooperativa_id, profile?.pa_id, user?.id],
  );

  return {
    navigate, quoteId, isEditMode, loadingQuote, quoteLoadError, hasUnsavedData, user, draftScopeId,
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
    selectedProductForColor,
    setSelectedProductForColor,
    templateApplied,
    setTemplateApplied,
    expandedItems,
    setExpandedItems,
    activeItemIndex,
    setActiveItemIndex,
    completedSteps,
    ...totals,
    validationErrors,
    isFormValid,
    isDraftValid,
    quotesLoading,
    templates,
    defaultTemplate,
    maxDiscountPercent,
    isDiscountExceeded,
    formatCurrency,
    calculateItemPersonalizationTotal,
    calculateItemTotal,
    toggleExpanded,
    handlePersonalizationsChange,
    handleProductClick: setSelectedProductForColor,
    addProductWithColor,
    updateItemQuantity,
    updateItemPrice,
    removeItem,
    groupItemsIntoKit,
    ungroupItems,
    selectedItemIndexes,
    toggleItemSelection,
    setSelectedItemIndexes,
    confirmItemPrice: (index: number) => {
      const ts = new Date().toISOString();
      setItems((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, price_confirmed_at: ts } : item)),
      );
    },
    confirmAllStalePrices: () => {
      const ts = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) => {
          if (item.price_confirmed_at) return item;
          const freshness = getPriceFreshness(
            item.price_updated_at,
            item.price_freshness_threshold_days,
          );
          return freshness.shouldWarn ? { ...item, price_confirmed_at: ts } : item;
        }),
      );
    },
    applyTemplate,
    handleSaveQuote,
    canEdit,
    getTemplateItems: () =>
      items.map((i) => ({
        productId: i.product_id,
        productName: i.product_name,
        productSku: i.product_sku || '',
        productImageUrl: i.product_image_url || '',
        quantity: i.quantity,
        unitPrice: i.unit_price,
        colorName: i.color_name,
        colorHex: i.color_hex,
        personalizations: i.personalizations?.map((p) => ({
          techniqueId: p.technique_id,
          techniqueName: p.technique_name || '',
          colorsCount: p.colors_count,
          positionsCount: p.positions_count,
          unitCost: p.unit_cost,
          setupCost: p.setup_cost,
        })),
      })),
  };
}
