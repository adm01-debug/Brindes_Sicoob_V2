/**
 * useMockupGenerator — Core business logic hook for MockupGenerator page
 * 
 * Refactored: generation/history/download logic extracted to mockup/mockupGenerationService.ts
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { needsConversion, ensureSupportedFormat } from "@/lib/image-converter";
import { useAuth } from "@/contexts/AuthContext";
import { useMockupDraft, type MockupDraftData } from "@/hooks/useMockupDraft";
import { useFilteredTechniques, useProductCustomizationOptionsForMockup, type TechniqueWithLimits } from "@/hooks/useMockupTechniques";
import { usePositionHistory } from "@/hooks/usePositionHistory";
import { useProductsContext } from "@/contexts/ProductsContext";
import { getMockupWizardStep } from "@/components/mockup/mockupWizardStep";
import { useLogoColorAnalysis } from "@/hooks/useLogoColorAnalysis";
import { showMockupSuccessToast } from "@/components/mockup/MockupSuccessToast";
import {  type TechniqueColorConfig } from "@/components/mockup/techniqueColorUtils";
import { invokeWithRetry, extractFunctionErrorMessage } from "@/lib/external-db/invoke";
import { adaptTabelaPrecoRows } from "@/lib/personalization/adapters";
import type { PersonalizationArea } from "@/components/mockup/MultiAreaManager";
import type { MockupProductSelection } from "@/components/mockup/MockupProductSelector";
import type { MockupClient } from "@/components/mockup/MockupConfigPanel";
import type { Product } from "@/types/product-catalog";
import {
  type Technique, type GeneratedMockup, type GenerateMockupResult,
  createDefaultArea, fetchMockupHistory, saveMockupToDb,
  generateMockupApi, downloadMockupAsPdf, deleteMockupFromDb,
} from "./mockup/mockupGenerationService";

// Re-export types for consumers
export type { Technique, GeneratedMockup };

interface MockupCustomizationOption {
  efetiva_largura_max?: number | null;
  max_width?: number | null;
  efetiva_altura_max?: number | null;
  max_height?: number | null;
  max_cores?: number | null;
  is_curved?: boolean | null;
}

const INCOMPLETE_SELECTION_MESSAGE = "Selecione empresa, produto, técnica e faça upload de pelo menos um logo";

function positiveLimit(value: number | null | undefined): number | null {
  return value && value > 0 ? value : null;
}

function effectiveLimit(techniqueLimit: number | null, areaLimit: number | null): number | null {
  if (techniqueLimit && areaLimit) return Math.min(techniqueLimit, areaLimit);
  return techniqueLimit || areaLimit;
}

function clampAreaToTechnique(
  area: PersonalizationArea,
  maxWidth: number | null,
  maxHeight: number | null,
): PersonalizationArea {
  const width = effectiveLimit(maxWidth, positiveLimit(area.maxWidthCm));
  const height = effectiveLimit(maxHeight, positiveLimit(area.maxHeightCm));
  if (!width || !height) return area;
  const logoWidth = Math.min(area.logoWidth, width);
  const logoHeight = Math.min(area.logoHeight, height);
  if (logoWidth === area.logoWidth && logoHeight === area.logoHeight) return area;
  return { ...area, logoWidth, logoHeight };
}

function draftHasContent(draft: MockupDraftData | null): draft is MockupDraftData {
  return Boolean(draft && (draft.productId || draft.techniqueId || draft.personalizationAreas.some(area => area.logoPreview)));
}

function nullable<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function canRestoreDraft(isLoading: boolean, restored: boolean, restoring: boolean): boolean {
  return !isLoading && !restored && !restoring;
}

interface RestoredDraft {
  productSelection: MockupProductSelection | null;
  technique: Technique | undefined;
  client: MockupClient | null;
  areas: PersonalizationArea[];
}

function resolveDraft(
  draft: MockupDraftData,
  getProductById: (id: string) => Product | null | undefined,
  techniques: Technique[],
): RestoredDraft {
  const product = draft.productId ? getProductById(draft.productId) : undefined;
  return {
    productSelection: product ? { product, variant: null, imageUrl: product.images[0] || '/placeholder.svg' } : null,
    technique: draft.techniqueId ? techniques.find(item => item.id === draft.techniqueId) : undefined,
    client: draft.clientId && draft.clientName ? { id: draft.clientId, name: draft.clientName } : null,
    areas: draft.personalizationAreas,
  };
}

function buildDraftData(
  productSelection: MockupProductSelection | null,
  technique: Technique | TechniqueWithLimits | null,
  client: MockupClient | null,
  areas: PersonalizationArea[],
): MockupDraftData {
  return {
    productId: nullable(productSelection?.product.id),
    productName: nullable(productSelection?.product.name),
    techniqueId: nullable(technique?.id),
    techniqueName: nullable(technique?.name),
    clientId: nullable(client?.id),
    clientName: nullable(client?.name),
    personalizationAreas: areas,
    updatedAt: new Date().toISOString(),
  };
}

const POSITION_FIELDS = ['positionX', 'positionY', 'logoWidth', 'logoHeight', 'logoRotation', 'logoScale'] as const;

function updatesPosition(updates: Partial<PersonalizationArea>): boolean {
  return POSITION_FIELDS.some(field => field in updates);
}

function positionState(area: PersonalizationArea, updates: Partial<PersonalizationArea>) {
  return {
    positionX: updates.positionX ?? area.positionX,
    positionY: updates.positionY ?? area.positionY,
    logoWidth: updates.logoWidth ?? area.logoWidth,
    logoHeight: updates.logoHeight ?? area.logoHeight,
    logoRotation: updates.logoRotation ?? area.logoRotation ?? 0,
    logoScale: updates.logoScale ?? area.logoScale ?? 100,
  };
}

function historyProductSelection(product: Product | undefined): MockupProductSelection | null {
  return product ? { product, variant: null, imageUrl: product.images[0] || '/placeholder.svg' } : null;
}

function restoredHistoryArea(mockup: GeneratedMockup): PersonalizationArea {
  return {
    id: crypto.randomUUID(),
    name: "Frente",
    positionX: mockup.position_x ?? 50,
    positionY: mockup.position_y ?? 50,
    logoWidth: mockup.logo_width_cm ?? 5,
    logoHeight: mockup.logo_height_cm ?? 3,
    logoRotation: 0,
    logoScale: 100,
    logoPreview: mockup.logo_url,
  };
}

function resolveUrlPreselection(
  params: URLSearchParams,
  product: Product | undefined,
  techniques: Technique[],
): { productSelection: MockupProductSelection | null; technique: Technique | undefined } | null {
  const productId = params.get('product_id');
  if (!productId || !product) return null;
  const techniqueName = params.get('technique');
  return {
    productSelection: historyProductSelection(product),
    technique: techniqueName
      ? techniques.find(item => item.name.toLowerCase() === techniqueName.toLowerCase())
      : undefined,
  };
}

function resolveUrlProduct({
  productId,
  products,
  isLoadingProducts,
  requestedProductId,
  getProductById,
}: {
  productId: string | null;
  products: Product[];
  isLoadingProducts: boolean;
  requestedProductId: { current: string | null };
  getProductById: (id: string) => Product | undefined;
}): Product | undefined {
  if (!productId) return undefined;
  const cached = products.find(product => product.id === productId);
  if (cached || isLoadingProducts || requestedProductId.current === productId) return cached;
  requestedProductId.current = productId;
  return getProductById(productId);
}

export function useMockupGenerator() {
  const { user } = useAuth();
  const { saveDraft, loadDraft, clearDraft, isSaving: isDraftSaving, lastSaved, error: draftError } = useMockupDraft();
  const { getProductById, products, isLoading: isLoadingProducts } = useProductsContext();

  // Data state
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Selection state
  const [productSelection, setProductSelection] = useState<MockupProductSelection | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | TechniqueWithLimits | null>(null);
  const [selectedClient, setSelectedClient] = useState<MockupClient | null>(null);

  // Multi-area
  const [personalizationAreas, setPersonalizationAreas] = useState<PersonalizationArea[]>([createDefaultArea()]);
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null);

  // Generation
  const [generatedMockup, setGeneratedMockup] = useState<string | null>(null);
  const [generatedBatchMockups, setGeneratedBatchMockups] = useState<{areaName: string; url: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [mockupAnnotations, setMockupAnnotations] = useState<{id: string; x: number; y: number; text: string}[]>([]);
  const [beforeImage, setBeforeImage] = useState<string | null>(null);

  // Technique color configuration
  const [techniqueColorConfig, setTechniqueColorConfig] = useState<TechniqueColorConfig | null>(null);

  // History
  const [mockupHistory, setMockupHistory] = useState<GeneratedMockup[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mockupToDelete, setMockupToDelete] = useState<string | null>(null);
  const [lastSavedRecordId, setLastSavedRecordId] = useState<string | null>(null);
  const [lastSavedMockupUrl, setLastSavedMockupUrl] = useState<string | null>(null);
  const [lastSavedLayoutMode, setLastSavedLayoutMode] = useState<'ai' | 'static'>('ai');

  // Draft
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [showDraftRestoredNotice, setShowDraftRestoredNotice] = useState(false);
  const isRestoringDraft = useRef(false);

  // Tab & positioning
  const [activeTab, setActiveTab] = useState("generator");
  const [hasUserInteractedPosition, setHasUserInteractedPosition] = useState(false);

  // Logo color analysis
  const logoColorAnalysis = useLogoColorAnalysis();

  // ─── Undo/Redo ───────────────────────────────────────────────────────
  const positionHistory = usePositionHistory({ enabled: true });

  const fetchHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const data = await fetchMockupHistory(user?.id);
      setMockupHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [user?.id]);

  useEffect(() => {
    positionHistory.setOnApply((state) => {
      if (!activeAreaId) return;
      setPersonalizationAreas(prev =>
        prev.map(area => area.id === activeAreaId ? { ...area, ...state } : area)
      );
      toast.info(positionHistory.canRedo ? "↩️ Desfazer" : "↪️ Refazer", { duration: 1000 });
    });
  }, [activeAreaId, positionHistory]);

  // ─── Derived state ──────────────────────────────────────────────────

  const activeArea = personalizationAreas.find(a => a.id === activeAreaId) || personalizationAreas[0];
  const selectedProduct = productSelection?.product ?? null;
  const filteredTechniques = useFilteredTechniques(techniques, selectedProduct);
  const { data: customizationOptions } = useProductCustomizationOptionsForMockup(selectedProduct?.id);
  const hasLogo = personalizationAreas.some(a => !!a.logoPreview);

  const historyClients = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    mockupHistory.forEach(m => {
      const clientKey = m.client_id || m.client_name;
      if (clientKey && m.client_name) map.set(clientKey, { id: m.client_id || m.client_name, name: m.client_name });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [mockupHistory]);

  const productLocations = useMemo(() => {
    if (!customizationOptions?.locations?.length) return null;
    return customizationOptions.locations.map(loc => {
      const opts: MockupCustomizationOption[] = loc.options || [];
      const widths = opts.map((o) => o.efetiva_largura_max || o.max_width || 0).filter(Boolean);
      const heights = opts.map((o) => o.efetiva_altura_max || o.max_height || 0).filter(Boolean);
      const colors = opts.map((o) => o.max_cores || 0).filter(Boolean);
      return {
        code: loc.location_code,
        name: loc.location_name,
        order: loc.location_order,
        maxWidthCm: widths.length ? Math.max(...widths) : null,
        maxHeightCm: heights.length ? Math.max(...heights) : null,
        maxColors: colors.length ? Math.max(...colors) : null,
        isCurved: opts.some((o) => o.is_curved === true),
        techniquesAvailable: opts.length,
      };
    });
  }, [customizationOptions]);

  // ─── Effects ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!productLocations || isRestoringDraft.current) return;
    const newAreas: PersonalizationArea[] = productLocations
      .sort((a, b) => a.order - b.order)
      .map(loc => ({
        id: crypto.randomUUID(), name: loc.name,
        positionX: 50, positionY: 50, logoWidth: 5, logoHeight: 3,
        logoScale: 100, logoPreview: null,
        maxWidthCm: loc.maxWidthCm,
        maxHeightCm: loc.maxHeightCm,
        maxColors: loc.maxColors,
        isCurved: loc.isCurved,
        techniquesAvailable: loc.techniquesAvailable,
      }));
    if (newAreas.length > 0) { setPersonalizationAreas(newAreas); setActiveAreaId(newAreas[0]?.id ?? null); }
  }, [productLocations]);

  useEffect(() => {
    if (!activeAreaId && personalizationAreas.length > 0) setActiveAreaId(personalizationAreas[0]?.id ?? null);
  }, [activeAreaId, personalizationAreas]);

  useEffect(() => { fetchData(); fetchHistory(); }, [fetchHistory]);

  useEffect(() => {
    if (selectedTechnique && filteredTechniques.length > 0) {
      if (!filteredTechniques.some(t => t.id === selectedTechnique.id)) setSelectedTechnique(null);
    }
  }, [filteredTechniques, selectedTechnique]);

  useEffect(() => {
    if (!selectedTechnique) return;
    const mw = 'maxWidth' in selectedTechnique ? (selectedTechnique as TechniqueWithLimits).maxWidth : null;
    const mh = 'maxHeight' in selectedTechnique ? (selectedTechnique as TechniqueWithLimits).maxHeight : null;
    if ((!mw || mw <= 0) && (!mh || mh <= 0)) return;
    setPersonalizationAreas(prev => prev.map(area => clampAreaToTechnique(area, mw, mh)));
  }, [selectedTechnique]);

  // Draft restoration
  useEffect(() => {
    const restoreDraft = async () => {
      if (!canRestoreDraft(isLoadingData, hasDraftRestored, isRestoringDraft.current)) return;
      isRestoringDraft.current = true;
      try {
        const draft = await loadDraft();
        if (!draftHasContent(draft)) return;
        const restored = resolveDraft(draft, getProductById, techniques);
        if (restored.productSelection) setProductSelection(restored.productSelection);
        if (restored.technique) setSelectedTechnique(restored.technique);
        if (restored.client) setSelectedClient(restored.client);
        if (restored.areas.length) {
          setPersonalizationAreas(restored.areas);
          setActiveAreaId(restored.areas[0]?.id ?? null);
        }
        setShowDraftRestoredNotice(true);
        setTimeout(() => setShowDraftRestoredNotice(false), 5000);
      } catch (err) {
        console.error("Erro ao restaurar rascunho:", err);
      } finally { setHasDraftRestored(true); isRestoringDraft.current = false; }
    };
    restoreDraft();
  }, [isLoadingData, techniques, loadDraft, hasDraftRestored, getProductById]);

  // URL param pre-selection
  const urlParamsApplied = useRef(false);
  const requestedUrlProductId = useRef<string | null>(null);
  useEffect(() => {
    if (urlParamsApplied.current || isLoadingData || !hasDraftRestored) return;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product_id');
    const product = resolveUrlProduct({ productId, products, isLoadingProducts, requestedProductId: requestedUrlProductId, getProductById });
    if (!product) return;
    const selection = resolveUrlPreselection(params, product, techniques);
    if (!selection) return;
    urlParamsApplied.current = true;
    if (selection.productSelection) setProductSelection(selection.productSelection);
    if (selection.technique) setSelectedTechnique(selection.technique);
    window.history.replaceState({}, '', window.location.pathname);
  }, [isLoadingData, hasDraftRestored, techniques, getProductById, products, isLoadingProducts]);

  // Auto-save
  useEffect(() => {
    if (!hasDraftRestored || isRestoringDraft.current) return;
    saveDraft(buildDraftData(productSelection, selectedTechnique, selectedClient, personalizationAreas));
  }, [productSelection, selectedTechnique, selectedClient, personalizationAreas, saveDraft, hasDraftRestored]);

  useEffect(() => { if (user?.id) fetchHistory(); }, [user?.id, fetchHistory]);

  // ─── Data fetching ──────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      const { data: techniquesRes, error: techniquesErr } = await invokeWithRetry({
        table: "tabela_preco_gravacao_oficial", operation: "select",
        filters: { ativo: true }, limit: 100, countMode: "none",
      });
      if (techniquesErr) {
        const msg = await extractFunctionErrorMessage(techniquesErr);
        console.error("Error fetching techniques:", msg);
        toast.error("Erro ao carregar técnicas. Tente recarregar a página.");
        return;
      }
      const techniquesResObj = (techniquesRes ?? {}) as { data?: { records?: Record<string, unknown>[] }; records?: Record<string, unknown>[] };
      const records = adaptTabelaPrecoRows(techniquesResObj.data?.records || techniquesResObj.records || []);
      const techniquesData = records.map((r) => ({
        id: r.id,
        name: r.name ?? r.nome ?? '',
        code: r.codigo_curto ?? r.codigo_tabela ?? r.code ?? r.codigo ?? null,
      }));
      techniquesData.sort((a: Technique, b: Technique) => (a.name || '').localeCompare(b.name || ''));
      setTechniques(techniquesData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados. Tente novamente.");
    } finally { setIsLoadingData(false); }
  };

  // ─── Handlers ───────────────────────────────────────────────────────

  const updateActiveArea = useCallback((updates: Partial<PersonalizationArea>) => {
    if (!activeAreaId) return;
    setPersonalizationAreas(prev => prev.map(area => area.id === activeAreaId ? { ...area, ...updates } : area));
    if (!updatesPosition(updates)) return;
    setHasUserInteractedPosition(true);
    const current = personalizationAreas.find(area => area.id === activeAreaId);
    if (current) positionHistory.pushState(positionState(current, updates));
  }, [activeAreaId, personalizationAreas, positionHistory]);

  const handleAreaLogoUpload = useCallback(async (areaId: string, file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Por favor, selecione uma imagem válida"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 5MB"); return; }

    let processedFile = file;
    if (needsConversion(file)) {
      try {
        toast.info(`Convertendo ${file.name} para PNG...`);
        processedFile = await ensureSupportedFormat(file);
        toast.success("Imagem convertida para PNG com sucesso!");
      } catch (err) { console.error("Conversion error:", err); toast.error("Erro ao converter imagem. Tente usar PNG ou JPG."); return; }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const logoData = e.target?.result as string;
      setPersonalizationAreas(prev => prev.map(area => area.id === areaId ? { ...area, logoPreview: logoData } : area));
      logoColorAnalysis.analyzeImage(logoData);
    };
    reader.readAsDataURL(processedFile);
  }, [logoColorAnalysis]);

  const getProductImage = (): string | null => {
    if (productSelection?.imageUrl) {
      const url = productSelection.imageUrl;
      return url.endsWith('/thumbnail') ? url.replace('/thumbnail', '') : url;
    }
    return selectedProduct?.images?.[0] || null;
  };

  const saveMockupToHistory = async (mockupUrl: string, area: PersonalizationArea, extra?: { layoutUrl?: string; locationName?: string; colorsCount?: number }): Promise<string | null> => {
    if (!user || !selectedProduct || !selectedTechnique || !area.logoPreview) return null;
    return saveMockupToDb({
      userId: user.id, product: selectedProduct, technique: selectedTechnique,
      client: selectedClient, area, mockupUrl, annotations: mockupAnnotations, extra,
    });
  };

  const rememberSavedMockup = (url: string, recordId: string): void => {
    setLastSavedMockupUrl(url);
    setLastSavedLayoutMode('ai');
    setLastSavedRecordId(recordId);
  };

  const handleSingleGeneratedMockup = async (
    result: GenerateMockupResult,
    areasWithLogos: PersonalizationArea[],
  ): Promise<void> => {
    if (!result.singleUrl || !selectedProduct || !selectedTechnique) return;
    setGeneratedMockup(result.singleUrl);
    const firstArea = areasWithLogos[0];
    if (!firstArea) return;
    const recordId = await saveMockupToHistory(result.singleUrl, firstArea);
    if (recordId) rememberSavedMockup(result.singleUrl, recordId);
    showMockupSuccessToast({
      mockupUrl: result.singleUrl,
      productName: selectedProduct.name,
      techniqueName: selectedTechnique.name,
      onDownload: () => downloadMockup(result.singleUrl as string),
    });
  };

  const handleBatchGeneratedMockups = async (
    result: GenerateMockupResult,
    areasWithLogos: PersonalizationArea[],
  ): Promise<void> => {
    for (let index = 0; index < result.batchResults.length; index++) {
      const batch = result.batchResults[index];
      if (!batch) continue;
      const area = areasWithLogos.find(candidate => candidate.name === batch.areaName) || areasWithLogos[index];
      if (!area) continue;
      const recordId = await saveMockupToHistory(batch.url, area);
      if (recordId && index === result.batchResults.length - 1) rememberSavedMockup(batch.url, recordId);
    }
    setGeneratedMockup(result.batchResults[0]?.url || result.singleUrl);
    setGeneratedBatchMockups(result.batchResults);
    toast.success(`${result.batchResults.length} mockups gerados com sucesso!`);
  };

  const generateMockup = async () => {
    const areasWithLogos = personalizationAreas.filter(a => a.logoPreview);
    if (!selectedClient) {
      toast.error(INCOMPLETE_SELECTION_MESSAGE);
      return;
    }
    if (!productSelection) {
      toast.error(INCOMPLETE_SELECTION_MESSAGE);
      return;
    }
    if (!selectedTechnique) {
      toast.error(INCOMPLETE_SELECTION_MESSAGE);
      return;
    }
    if (!areasWithLogos.length) {
      toast.error(INCOMPLETE_SELECTION_MESSAGE);
      return;
    }
    const productImage = getProductImage();
    if (!productImage) { toast.error("O produto selecionado não possui imagem"); return; }

    setIsLoading(true);
    setGeneratedMockup(null); setGeneratedBatchMockups([]); setGenerationError(null); setMockupAnnotations([]);
    setBeforeImage(productImage);

    try {
      const result = await generateMockupApi({
        productImage, productName: productSelection.product.name,
        technique: selectedTechnique, areas: personalizationAreas,
      });

      if (result.singleUrl && result.batchResults.length === 0) {
        await handleSingleGeneratedMockup(result, areasWithLogos);
      } else {
        await handleBatchGeneratedMockups(result, areasWithLogos);
      }
    } catch (error: unknown) {
      console.error("Error generating mockup:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao gerar mockup";
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally { setIsLoading(false); }
  };

  const downloadMockup = async (url?: string) => {
    const mockupUrl = url || generatedMockup;
    if (!mockupUrl) return;
    await downloadMockupAsPdf(mockupUrl, selectedProduct?.sku, selectedTechnique?.name);
  };

  const deleteMockup = async () => {
    if (!mockupToDelete) return;
    try {
      await deleteMockupFromDb(mockupToDelete);
      setMockupHistory(prev => prev.filter(m => m.id !== mockupToDelete));
      toast.success("Mockup excluído");
    } catch (error) { console.error("Error deleting mockup:", error); toast.error("Erro ao excluir mockup"); }
    finally { setDeleteDialogOpen(false); setMockupToDelete(null); }
  };

  const resetForm = () => {
    setProductSelection(null); setSelectedTechnique(null); setSelectedClient(null);
    setPersonalizationAreas([createDefaultArea()]); setActiveAreaId(null);
    setGeneratedMockup(null); setGeneratedBatchMockups([]); setGenerationError(null);
    setMockupAnnotations([]); setBeforeImage(null); setHasUserInteractedPosition(false);
    setTechniqueColorConfig(null); setLastSavedRecordId(null); setLastSavedMockupUrl(null);
    setLastSavedLayoutMode('ai'); positionHistory.clear(); clearDraft();
    logoColorAnalysis.clearAnalysis();
  };

  const handleShareMockup = (mockup: GeneratedMockup) => {
    const text = `Confira o mockup: ${mockup.product_name} com ${mockup.technique_name}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + mockup.mockup_url)}`, "_blank");
  };

  const loadFromHistory = (mockup: GeneratedMockup) => {
    const product = mockup.product_id ? getProductById(mockup.product_id) : undefined;
    const technique = mockup.technique_id ? techniques.find(t => t.id === mockup.technique_id) : null;
    setProductSelection(historyProductSelection(product || undefined));
    setSelectedTechnique(technique || null);
    setSelectedClient(mockup.client_id ? { id: mockup.client_id, name: mockup.client_name || "Cliente" } : null);
    const restoredArea = restoredHistoryArea(mockup);
    setPersonalizationAreas([restoredArea]); setActiveAreaId(restoredArea.id);
    setGeneratedMockup(null); setHasUserInteractedPosition(true);
    positionHistory.clear(); setActiveTab("generator");
    if (mockup.logo_url) logoColorAnalysis.analyzeImage(mockup.logo_url);
    toast.success("Configurações carregadas!");
  };

  const wizardStep = getMockupWizardStep({
    hasClient: !!selectedClient, hasProduct: !!selectedProduct,
    hasTechnique: !!selectedTechnique, hasLogo, hasPositioned: hasUserInteractedPosition,
    hasGenerated: !!generatedMockup,
  });

  return {
    user, techniques, isLoadingData,
    productSelection, setProductSelection, selectedProduct, selectedTechnique, setSelectedTechnique,
    selectedClient, setSelectedClient,
    personalizationAreas, setPersonalizationAreas, activeAreaId, setActiveAreaId,
    activeArea, updateActiveArea, handleAreaLogoUpload, productLocations,
    generatedMockup, setGeneratedMockup, generatedBatchMockups, isLoading,
    generationError, setGenerationError, generateMockup, downloadMockup,
    mockupAnnotations, setMockupAnnotations, beforeImage,
    mockupHistory, isLoadingHistory, deleteDialogOpen, setDeleteDialogOpen,
    mockupToDelete, setMockupToDelete, deleteMockup, loadFromHistory,
    handleShareMockup, historyClients,
    lastSavedRecordId, setLastSavedRecordId, lastSavedMockupUrl, setLastSavedMockupUrl,
    lastSavedLayoutMode, setLastSavedLayoutMode,
    isDraftSaving, lastSaved, draftError, showDraftRestoredNotice,
    activeTab, setActiveTab, wizardStep, hasLogo, hasUserInteractedPosition,
    positionHistory, logoColorAnalysis, techniqueColorConfig, setTechniqueColorConfig,
    filteredTechniques, getProductImage, resetForm, saveMockupToHistory, fetchHistory,
  };
}
