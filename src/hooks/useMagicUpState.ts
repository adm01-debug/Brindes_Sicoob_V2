/**
 * useMagicUpState — Extracted logic from MagicUp page.
 * Manages product loading, client search, generation, and history.
 * Generation logic delegated to useMagicUpGeneration.
 */
import { useState, useEffect, useMemo, useCallback, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { useAriaLive } from "@/components/a11y";
import { useProductCustomizationOptionsForMockup } from "@/hooks/useMockupTechniques";
import { searchCrm } from "@/lib/crm-db";
import { getCompanyDisplayName, type CrmCompany } from "@/types/crm";
import type { AreaShape, PrintAreaWithTechniques } from "@/types/gravacao";
import type { ScenePrompt } from "@/components/magic-up/PromptBank";
import type { GenerationHistoryItem } from "@/components/magic-up/AdImageResult";
import { useMagicUpGeneration } from "./useMagicUpGeneration";
import { DEFAULT_BRAND_KIT, DEFAULT_BRIEF, DEFAULT_CAMPAIGN, DEFAULT_CREATIVE_CONTROLS, buildBrandKitNotes, buildCopyPack, buildMagicScore, campaignFromBrief, type MagicUpBatchVariant, type MagicUpBrandKit, type MagicUpBrandLogo, type MagicUpBrief, type MagicUpCampaign, type MagicUpCampaignStatus, type MagicUpCreativeControls, type MagicUpCurationStatus, type MagicUpQualityDiagnosis, type MagicUpRefinement } from "@/pages/magic-up/magicUpStrategy";

const ID_AND_UPDATED_AT_SELECT = "id, updated_at";

// ─── Types ───────────────────────────────────────────────────────────

export interface MagicUpProduct {
  id: string;
  name: string;
  sku: string;
  images: string[] | null;
  primary_image_url?: string | null;
  og_image_url?: string | null;
}

export interface Technique {
  id: string;
  name: string;
  code: string;
}

export interface ProductColor {
  hex: string;
  name: string;
  code: string;
  stock?: number;
}

export interface ProductImage {
  url: string;
  supplierCode: string | null;
  isPrimary: boolean;
  isOgImage: boolean;
}

export interface SelectedClient {
  id: string;
  name: string;
  logo_url?: string | null;
  ramo_atividade?: string | null;
  cor_primaria_hex?: string | null;
  cor_primaria_nome?: string | null;
}

export interface VariationItem {
  id: string | null;
  imageUrl: string;
  isFavorite: boolean;
  qualityScore?: number;
  qualityDiagnosis?: MagicUpQualityDiagnosis;
  curationStatus?: MagicUpCurationStatus;
  isWinner?: boolean;
}

function valueOr<T>(value: T | null | undefined | false | "" | 0, fallback: T): T {
  return value ? value as T : fallback;
}

interface BrandKitRow {
  id: string;
  client_id: string;
  client_name: string;
  logo_urls: unknown;
  primary_color: string | null;
  secondary_color: string | null;
  tone_of_voice: string | null;
  visual_style: string | null;
  required_words: string[] | null;
  forbidden_words: string[] | null;
  notes: string | null;
  updated_at: string;
}

function mapBrandKit(row: BrandKitRow, client: SelectedClient): MagicUpBrandKit {
  const logos = Array.isArray(row.logo_urls) ? row.logo_urls as MagicUpBrandLogo[] : [];
  const primaryLogo = logos.find((logo) => logo.isPrimary);
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    primaryLogoUrl: valueOr(primaryLogo?.url, valueOr(logos[0]?.url, valueOr(client.logo_url, null))),
    logoUrls: logos,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    toneOfVoice: valueOr(row.tone_of_voice, DEFAULT_BRAND_KIT.toneOfVoice),
    visualStyle: valueOr(row.visual_style, DEFAULT_BRAND_KIT.visualStyle),
    requiredWords: valueOr(row.required_words, []),
    forbiddenWords: valueOr(row.forbidden_words, []),
    notes: valueOr(row.notes, ""),
    updatedAt: row.updated_at,
  };
}

async function fetchBrandKit(
  userId: string | undefined,
  client: SelectedClient | null,
): Promise<MagicUpBrandKit | null> {
  if (!userId || !client) return null;
  const { data, error } = await supabase
    .from("magic_up_brand_kits")
    .select("id, client_id, client_name, logo_urls, primary_color, secondary_color, tone_of_voice, visual_style, required_words, forbidden_words, notes, updated_at")
    .eq("user_id", userId)
    .eq("client_id", client.id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBrandKit(data as BrandKitRow, client) : null;
}

function selectCurrentImage(
  images: ProductImage[],
  color: ProductColor | null,
  product: MagicUpProduct | null,
): string | null {
  if (images.length === 0) return valueOr(product?.primary_image_url, null);
  if (color?.code) {
    const match = images.find((image) => image.supplierCode === color.code);
    if (match) return match.url;
  }
  const preferred = images.find((image) => image.isOgImage) || images.find((image) => image.isPrimary);
  return valueOr(preferred?.url, valueOr(images[0]?.url, null));
}

interface PromptPreviewParams {
  product: MagicUpProduct;
  effectivePrompt: string;
  brief: MagicUpBrief;
  creativeControls: MagicUpCreativeControls;
  activeRefinement: MagicUpRefinement | null;
  brandNotes: string;
  selectedColor: ProductColor | null;
  selectedTechnique: Technique | null;
  selectedLocationName: string | null;
  selectedClient: SelectedClient | null;
}

function clientPromptLine(client: SelectedClient | null): string {
  if (!client) return "";
  const industry = client.ramo_atividade ? ` (${client.ramo_atividade})` : "";
  return `CLIENTE: ${client.name}${industry}`;
}

function brandColorPromptLine(client: SelectedClient | null): string {
  if (!client?.cor_primaria_hex) return "";
  return `COR DA MARCA: ${valueOr(client.cor_primaria_nome, client.cor_primaria_hex)}`;
}

function buildFullPromptPreview(params: PromptPreviewParams): string {
  const { product, brief, creativeControls } = params;
  const refinement = valueOr(params.activeRefinement?.instruction, "Nenhum");
  const brand = params.brandNotes ? `DIRETRIZES DA MARCA: ${params.brandNotes}` : "";
  const color = params.selectedColor ? ` (${params.selectedColor.name})` : "";
  const technique = valueOr(params.selectedTechnique?.name, "Não especificada");
  const location = valueOr(params.selectedLocationName, "Não especificado");
  return `BRIEFING: objetivo=${brief.objective}; canal=${brief.channel}; público=${brief.audience}; tom=${brief.tone}; CTA=${brief.cta}; ocasião=${brief.occasion}
CONTROLE CRIATIVO: modo=${creativeControls.creativeMode}; composição=${creativeControls.composition}; formato=${creativeControls.aspectRatio}; qualidade=${creativeControls.qualityMode}; evitar=${creativeControls.negativePrompt.join(", ")}
REFINAMENTO: ${refinement}
${brand}
PRODUTO: ${product.name}${color}
TÉCNICA: ${technique} @ ${location}
${clientPromptLine(params.selectedClient)}
${brandColorPromptLine(params.selectedClient)}
CENÁRIO: ${params.effectivePrompt}`;
}

function resolveCampaignDraft(
  campaign: MagicUpCampaign | null,
  brief: MagicUpBrief,
  client: SelectedClient | null,
  product: MagicUpProduct | null,
): MagicUpCampaign {
  if (campaign) return campaign;
  return campaignFromBrief({
    brief,
    clientId: client?.id,
    clientName: client?.name,
    productName: product?.name,
  });
}

function campaignPayload(
  draft: MagicUpCampaign,
  client: SelectedClient | null,
  product: MagicUpProduct | null,
  brandNotes: string,
) {
  return {
    title: valueOr(draft.title, DEFAULT_CAMPAIGN.title),
    client_id: valueOr(client?.id, draft.clientId),
    client_name: valueOr(client?.name, draft.clientName),
    objective: draft.objective,
    channel: draft.channel,
    audience: draft.audience,
    tone: draft.tone,
    cta: draft.cta,
    occasion: draft.occasion,
    status: draft.status,
    metadata: { source: "magic-up", brand_notes: brandNotes, product_id: valueOr(product?.id, null) },
  };
}

function entityId(entity: { id: string } | null): string | undefined {
  return entity ? entity.id : undefined;
}

function arrayOrEmpty<T>(items: T[] | undefined): T[] {
  return items || [];
}

function magicUpStep(product: MagicUpProduct | null, logo: string | null, prompt: string): number {
  if (!product) return 1;
  if (!logo) return 2;
  if (!prompt) return 3;
  return 4;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useMagicUpState() {
  const { user } = useAuth();
  const userId = entityId(user);
  const { announceStatus, announceAlert } = useAriaLive();
  const queryClient = useQueryClient();

  // Product
  const [products, setProducts] = useState<MagicUpProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<MagicUpProduct | null>(null);
  const selectedProductId = entityId(selectedProduct);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [loadingColors, setLoadingColors] = useState(false);

  // Technique & Location
  const { data: customizationData, isLoading: loadingCustomization } = useProductCustomizationOptionsForMockup(selectedProductId);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  // Scene
  const [selectedScene, setSelectedScene] = useState<ScenePrompt | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [sceneTab, setSceneTab] = useState<"ai" | "bank">("ai");
  const [brief, setBrief] = useState<MagicUpBrief>(DEFAULT_BRIEF);
  const [activeCampaign, setActiveCampaign] = useState<MagicUpCampaign | null>(null);
  const [creativeControls, setCreativeControls] = useState<MagicUpCreativeControls>(DEFAULT_CREATIVE_CONTROLS);
  const [brandNotes, setBrandNotes] = useState("");
  const [brandKit, setBrandKit] = useState<MagicUpBrandKit>(DEFAULT_BRAND_KIT);
  const [activeRefinement, setActiveRefinement] = useState<MagicUpRefinement | null>(null);
  const [batchQueue, setBatchQueue] = useState<MagicUpBatchVariant[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);

  // Client (CRM externo)
  const [selectedClient, setSelectedClient] = useState<SelectedClient | null>(null);
  const selectedClientId = entityId(selectedClient);
  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  // ─── Client search debounce ──────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedClientSearch(clientSearch), 300);
    return () => clearTimeout(t);
  }, [clientSearch]);

  const clientQuery = useQuery({
    queryKey: ["magic-up-clients", debouncedClientSearch],
    queryFn: async () => {
      if (debouncedClientSearch.length < 3) return [];
      const [byRazao, byNomeFantasia] = await Promise.all([
        searchCrm<CrmCompany>("companies", "razao_social", debouncedClientSearch, { select: "id, razao_social, nome_fantasia, ramo_atividade, logo_url", limit: 20 }),
        searchCrm<CrmCompany>("companies", "nome_fantasia", debouncedClientSearch, { select: "id, razao_social, nome_fantasia, ramo_atividade, logo_url", limit: 20 }),
      ]);
      const map = new Map<string, CrmCompany>();
      [...byRazao, ...byNomeFantasia].forEach(c => map.set(c.id, c));
      return Array.from(map.values()).slice(0, 20);
    },
    enabled: debouncedClientSearch.length >= 3,
  });
  const clientResults = arrayOrEmpty(clientQuery.data);
  const loadingClients = clientQuery.isLoading;

  // ─── Load History ──────────────────────────────────────────────
  const historyQuery = useQuery<GenerationHistoryItem[]>({
    queryKey: ["magic-up-history", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase.from("magic_up_generations").select("id, generated_image_url, product_name, scene_title, scene_category, is_favorite, created_at, client_name, quality_score, status, channel, aspect_ratio, metadata, copy_pack").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
      return (data || []) as GenerationHistoryItem[];
    },
    enabled: Boolean(userId),
  });
  const history = arrayOrEmpty(historyQuery.data);

  const campaignsQuery = useQuery<MagicUpCampaign[]>({
    queryKey: ["magic-up-campaigns", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("magic_up_campaigns")
        .select("id, title, status, client_id, client_name, objective, channel, audience, tone, cta, occasion, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status as MagicUpCampaignStatus,
        clientId: row.client_id,
        clientName: row.client_name,
        objective: row.objective || DEFAULT_BRIEF.objective,
        channel: row.channel || DEFAULT_BRIEF.channel,
        audience: row.audience || DEFAULT_BRIEF.audience,
        tone: row.tone || DEFAULT_BRIEF.tone,
        cta: row.cta || DEFAULT_BRIEF.cta,
        occasion: row.occasion || DEFAULT_BRIEF.occasion,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    },
    enabled: Boolean(userId),
  });
  const campaigns = arrayOrEmpty(campaignsQuery.data);

  const { data: loadedBrandKit, isFetching: loadingBrandKit } = useQuery<MagicUpBrandKit | null>({
    queryKey: ["magic-up-brand-kit", userId, selectedClientId],
    queryFn: () => fetchBrandKit(userId, selectedClient),
    enabled: Boolean(userId) && Boolean(selectedClientId),
  });

  // ─── Load Products ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try {
        const { fetchPromobrindProducts } = await import("@/lib/external-db");
        const data = await fetchPromobrindProducts();
        setProducts(data.map(p => ({ id: p.id, name: p.name, sku: p.sku, images: p.images || [], primary_image_url: p.primary_image_url || p.image_url || null, og_image_url: p.og_image_url || null })));
      } catch { toast.error("Erro ao carregar produtos"); }
      finally { setLoadingProducts(false); }
    })();
  }, []);

  // ─── Load Colors & Images on Product Change ──────────────────────
  useEffect(() => {
    if (!selectedProduct) { setColors([]); setProductImages([]); setSelectedColor(null); setSelectedLocationId(null); setSelectedTechnique(null); return; }
    (async () => {
      setLoadingColors(true);
      try {
        const { invokeExternalDb } = await import("@/lib/external-db");
        const [variantsResult, imagesResult] = await Promise.all([
          invokeExternalDb<Record<string, unknown>>({ table: "product_variants", operation: "select", filters: { product_id: selectedProduct.id }, orderBy: { column: "color_name", ascending: true }, limit: 100 }),
          invokeExternalDb<Record<string, unknown>>({ table: "product_images", operation: "select", filters: { product_id: selectedProduct.id }, orderBy: { column: "display_order", ascending: true }, limit: 100 }),
        ]);
        const images = (imagesResult.records || [])
          .filter((img: Record<string, unknown>) => img.image_type !== "box")
          .map((img: Record<string, unknown>): ProductImage => ({
            url: String(img.url_cdn || img.url_original || ""),
            supplierCode: (img.supplier_code as string) || null,
            isPrimary: Boolean(img.is_primary),
            isOgImage: Boolean(img.is_og_image),
          }))
          .filter((img) => img.url);
        setProductImages(images);
        const uniqueColors = new Map<string, ProductColor>();
        (variantsResult.records || []).forEach((v: Record<string, unknown>) => {
          const colorName = v.color_name as string | undefined;
          if (!colorName || uniqueColors.has(colorName)) return;
          uniqueColors.set(colorName, {
            hex: (v.color_hex as string) || "#CCCCCC",
            name: colorName,
            code: (v.color_code as string) || "",
            stock: (v.stock_quantity as number) ?? 0,
          });
        });
        setColors(Array.from(uniqueColors.values()));
      } catch { setColors([]); setProductImages([]); }
      finally { setLoadingColors(false); }
    })();
  }, [selectedProduct, selectedProductId]);

  // ─── Print Areas from customization data ───────────────────────
  const printAreas = useMemo((): PrintAreaWithTechniques[] => {
    if (!customizationData?.locations) return [];
    return customizationData.locations.map((loc, idx) => ({
      area_id: loc.location_code, area_code: loc.location_code, area_name: loc.location_name,
      component_name: null, location_name: loc.location_name,
      max_width: Math.max(...loc.options.map(o => o.efetiva_largura_max || 0), 0),
      max_height: Math.max(...loc.options.map(o => o.efetiva_altura_max || 0), 0),
      unit: "cm", shape: (loc.options[0]?.shape || "rectangle") as AreaShape,
      is_curved: loc.options.some(o => o.is_curved), is_primary: idx === 0, display_order: loc.location_order,
      techniques: loc.options.map(o => ({ id: o.technique_id, nome: o.tecnica_nome, codigo: o.codigo_tabela })),
    }));
  }, [customizationData]);

  const loadingPrintAreas = loadingCustomization;

  useEffect(() => {
    if (!selectedClient) {
      setBrandKit(DEFAULT_BRAND_KIT);
      setBrandNotes("");
      return;
    }
    if (loadedBrandKit) {
      setBrandKit(loadedBrandKit);
      setBrandNotes(buildBrandKitNotes(loadedBrandKit));
      if (loadedBrandKit.primaryLogoUrl && !logoPreview) setLogoPreview(loadedBrandKit.primaryLogoUrl);
      return;
    }
    setBrandKit({ ...DEFAULT_BRAND_KIT, clientId: selectedClient.id, clientName: selectedClient.name, primaryLogoUrl: selectedClient.logo_url || null, logoUrls: selectedClient.logo_url ? [{ id: "crm-logo", label: "Logo CRM", url: selectedClient.logo_url, variant: "principal", isPrimary: true }] : [], primaryColor: selectedClient.cor_primaria_hex || null });
  }, [loadedBrandKit, logoPreview, selectedClient]);

  // ─── Derived: Techniques from print areas ───────────────────────
  const availableTechniques = useMemo((): Technique[] => {
    if (!printAreas?.length) return [];
    const techMap = new Map<string, Technique>();
    const source = selectedLocationId ? printAreas.filter(a => a.area_id === selectedLocationId) : printAreas;
    for (const area of source) { for (const t of area.techniques || []) { if (!techMap.has(t.id)) techMap.set(t.id, { id: t.id, name: t.nome, code: t.codigo }); } }
    return [...techMap.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [printAreas, selectedLocationId]);

  useEffect(() => {
    if (selectedTechnique && availableTechniques.length > 0 && !availableTechniques.some(t => t.id === selectedTechnique.id)) setSelectedTechnique(null);
  }, [availableTechniques, selectedTechnique]);

  // ─── Current preview image ─────────────────────────────────────
  const currentImage = useMemo(() => {
    return selectCurrentImage(productImages, selectedColor, selectedProduct);
  }, [productImages, selectedColor, selectedProduct]);

  const selectedLocationName = useMemo(() => {
    if (!selectedLocationId || !printAreas) return null;
    const area = printAreas.find(a => a.area_id === selectedLocationId);
    return area ? [area.component_name, area.location_name].filter(Boolean).join(" — ") : null;
  }, [selectedLocationId, printAreas]);

  // ─── Effective prompt ─────────────────────────────────────────
  const effectivePrompt = useMemo(() => {
    const base = selectedScene?.prompt || "";
    const extra = additionalDetails.trim();
    if (base && extra) return `${base}\n\nADDITIONAL DETAILS: ${extra}`;
    return extra || base;
  }, [selectedScene, additionalDetails]);

  const fullPromptPreview = useMemo(() => {
    if (!selectedProduct || !effectivePrompt) return "";
    return buildFullPromptPreview({
      product: selectedProduct, effectivePrompt, brief, creativeControls,
      activeRefinement, brandNotes, selectedColor, selectedTechnique,
      selectedLocationName, selectedClient,
    });
  }, [brief, creativeControls, activeRefinement, brandNotes, selectedProduct, selectedColor, selectedTechnique, selectedLocationName, effectivePrompt, selectedClient]);

  const qualityScore = useMemo(() => buildMagicScore({
    hasProduct: !!selectedProduct,
    hasLogo: !!logoPreview,
    hasClient: !!selectedClient,
    hasTechnique: !!selectedTechnique,
    hasBrief: !!brief.objective && !!brief.channel,
    channel: brief.channel,
  }), [selectedProduct, logoPreview, selectedClient, selectedTechnique, brief]);

  const copyPack = useMemo(() => buildCopyPack({
    productName: selectedProduct?.name,
    clientName: selectedClient?.name,
    cta: brief.cta,
    tone: brief.tone,
    channel: brief.channel,
  }), [selectedProduct?.name, selectedClient?.name, brief]);

  const handleSetBrief = useCallback((next: MagicUpBrief) => {
    setBrief(next);
    setActiveCampaign((current) => current ? { ...current, ...next } : current);
  }, []);

  const handleSelectCampaign = useCallback((campaign: MagicUpCampaign) => {
    setActiveCampaign(campaign);
    setBrief({ objective: campaign.objective, channel: campaign.channel, audience: campaign.audience, tone: campaign.tone, cta: campaign.cta, occasion: campaign.occasion });
    announceStatus(`Campanha ${campaign.title} selecionada`);
  }, [announceStatus]);

  const handleDuplicateCampaign = useCallback((campaign: MagicUpCampaign) => {
    const copy = { ...campaign, id: null, title: `${campaign.title} · cópia`, status: "draft" as MagicUpCampaignStatus };
    setActiveCampaign(copy);
    setBrief({ objective: copy.objective, channel: copy.channel, audience: copy.audience, tone: copy.tone, cta: copy.cta, occasion: copy.occasion });
    announceStatus("Campanha duplicada como rascunho");
  }, [announceStatus]);

  const handleSaveCampaign = useCallback(async () => {
    if (!userId) { toast.error("Faça login para salvar campanhas"); announceAlert("Login necessário para salvar campanha"); return; }
    const draft = resolveCampaignDraft(activeCampaign, brief, selectedClient, selectedProduct);
    const basePayload = campaignPayload(draft, selectedClient, selectedProduct, brandNotes);
    const result = draft.id
      ? await supabase.from("magic_up_campaigns").update(basePayload satisfies TablesUpdate<"magic_up_campaigns">).eq("id", draft.id).select(ID_AND_UPDATED_AT_SELECT).single()
      : await supabase.from("magic_up_campaigns").insert({ ...basePayload, user_id: userId } satisfies TablesInsert<"magic_up_campaigns">).select("id, created_at, updated_at").single();
    if (result.error) { toast.error("Erro ao salvar campanha"); announceAlert("Erro ao salvar campanha"); return; }
    setActiveCampaign({ ...draft, id: result.data.id, clientId: valueOr(basePayload.client_id, null), clientName: valueOr(basePayload.client_name, null), updatedAt: result.data.updated_at });
    queryClient.invalidateQueries({ queryKey: ["magic-up-campaigns"] });
    toast.success("Campanha salva");
    announceStatus("Campanha salva com sucesso");
  }, [activeCampaign, announceAlert, announceStatus, brandNotes, brief, queryClient, selectedClient, selectedProduct, userId]);

  const handleUpdateBrandKit = useCallback((patch: Partial<MagicUpBrandKit>) => {
    setBrandKit((current) => {
      const next = { ...current, ...patch };
      setBrandNotes(buildBrandKitNotes(next));
      return next;
    });
  }, []);

  const handleUseBrandLogo = useCallback((logo: MagicUpBrandLogo) => {
    setLogoPreview(logo.url);
    setBrandKit((current) => ({ ...current, primaryLogoUrl: logo.url, logoUrls: current.logoUrls.map((item) => ({ ...item, isPrimary: item.id === logo.id })) }));
    announceStatus("Logo do Brand Kit aplicado");
  }, [announceStatus]);

  const handleAddCurrentLogoToBrandKit = useCallback(() => {
    if (!logoPreview) return;
    const nextLogo: MagicUpBrandLogo = { id: crypto.randomUUID(), label: `Logo ${brandKit.logoUrls.length + 1}`, url: logoPreview, variant: brandKit.logoUrls.length ? "colorida" : "principal", isPrimary: brandKit.logoUrls.length === 0 };
    handleUpdateBrandKit({ logoUrls: [...brandKit.logoUrls, nextLogo], primaryLogoUrl: brandKit.primaryLogoUrl || logoPreview });
  }, [brandKit.logoUrls, brandKit.primaryLogoUrl, handleUpdateBrandKit, logoPreview]);

  const handleSaveBrandKit = useCallback(async () => {
    if (!userId) { toast.error("Faça login para salvar Brand Kit"); announceAlert("Login necessário para salvar Brand Kit"); return; }
    if (!selectedClient) { toast.error("Selecione uma empresa para salvar o Brand Kit"); announceAlert("Selecione uma empresa para salvar Brand Kit"); return; }
    const logos = brandKit.logoUrls.length ? brandKit.logoUrls : logoPreview ? [{ id: "current-logo", label: "Logo atual", url: logoPreview, variant: "principal" as const, isPrimary: true }] : [];
    const payload = { client_id: selectedClient.id, client_name: selectedClient.name, logo_urls: logos, primary_color: brandKit.primaryColor, secondary_color: brandKit.secondaryColor, tone_of_voice: brandKit.toneOfVoice, visual_style: brandKit.visualStyle, required_words: brandKit.requiredWords, forbidden_words: brandKit.forbiddenWords, notes: brandKit.notes, metadata: { source: "magic-up" } };
    const result = brandKit.id
      ? await supabase.from("magic_up_brand_kits").update(payload satisfies TablesUpdate<"magic_up_brand_kits">).eq("id", brandKit.id).select(ID_AND_UPDATED_AT_SELECT).single()
      : await supabase.from("magic_up_brand_kits").insert({ ...payload, user_id: userId } satisfies TablesInsert<"magic_up_brand_kits">).select(ID_AND_UPDATED_AT_SELECT).single();
    if (result.error) { toast.error("Erro ao salvar Brand Kit"); announceAlert("Erro ao salvar Brand Kit"); return; }
    setBrandKit((current) => ({ ...current, ...payload, id: result.data.id, clientId: selectedClient.id, clientName: selectedClient.name, primaryLogoUrl: logos.find((logo) => logo.isPrimary)?.url || logos[0]?.url || null, logoUrls: logos, updatedAt: result.data.updated_at }));
    queryClient.invalidateQueries({ queryKey: ["magic-up-brand-kit"] });
    toast.success("Brand Kit salvo");
    announceStatus("Brand Kit salvo com sucesso");
  }, [announceAlert, announceStatus, brandKit, logoPreview, queryClient, selectedClient, userId]);

  const handleApplyRefinement = useCallback((refinement: MagicUpRefinement) => {
    setActiveRefinement(refinement);
    if (refinement.creativePatch) {
      setCreativeControls((current) => ({ ...current, ...refinement.creativePatch, negativePrompt: refinement.creativePatch?.negativePrompt || current.negativePrompt }));
    }
    setAdditionalDetails((current) => current.includes(refinement.instruction) ? current : [current.trim(), refinement.instruction].filter(Boolean).join("\n"));
    announceStatus(`Refinamento aplicado: ${refinement.label}`);
  }, [announceStatus]);

  // ─── Generation (delegated) ────────────────────────────────────
  const generation = useMagicUpGeneration({
    selectedProduct, currentImage, logoPreview, effectivePrompt,
    selectedColor, selectedTechnique, selectedLocationName, selectedScene, selectedClient, userId,
    brief, creativeControls, qualityScore, copyPack, fullPromptPreview, activeCampaign, brandKit, brandNotes, activeRefinement,
  });

  useEffect(() => {
    if (generation.generating) announceStatus("Geração do Magic Up iniciada");
  }, [announceStatus, generation.generating]);

  const handleSetBatchQueue = useCallback((queue: MagicUpBatchVariant[]) => {
    setBatchQueue(queue);
    announceStatus(`${queue.length} variações adicionadas à fila`);
  }, [announceStatus]);

  const handleClearBatchQueue = useCallback(() => {
    setBatchQueue([]);
    announceStatus("Fila de variações limpa");
  }, [announceStatus]);

  const handleRunBatchQueue = useCallback(async () => {
    if (!batchQueue.length || batchRunning || !generation.canGenerate) return;
    setBatchRunning(true);
    announceStatus("Geração em lote iniciada");
    try {
      for (const variant of batchQueue) {
        await generation.handleGenerate(variant);
        announceStatus(`Variação gerada: ${variant.label}`);
      }
      toast.success("Fila de variações concluída");
    } catch {
      announceAlert("Erro ao executar fila de variações");
    } finally {
      setBatchRunning(false);
    }
  }, [announceAlert, announceStatus, batchQueue, batchRunning, generation]);

  const handleSetCurationStatus = useCallback(async (status: MagicUpCurationStatus) => {
    await generation.handleSetCurationStatus(status);
    announceStatus(`Status de curadoria atualizado: ${status}`);
  }, [announceStatus, generation]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handleLogoUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem válida"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Imagem muito grande (máx. 10MB)"); return; }
    setLogoUploading(true);
    try { const reader = new FileReader(); reader.onload = (ev) => { setLogoPreview(ev.target?.result as string); setLogoUploading(false); }; reader.readAsDataURL(file); }
    catch { setLogoUploading(false); toast.error("Erro ao carregar logo"); }
  }, []);

  const handleSelectClient = useCallback((company: CrmCompany) => {
    const client: SelectedClient = { id: company.id, name: getCompanyDisplayName(company), logo_url: company.logo_url || null, ramo_atividade: company.ramo_atividade || null, cor_primaria_hex: null, cor_primaria_nome: null };
    setSelectedClient(client); setClientSearch(""); setShowClientResults(false);
    if (company.logo_url && !logoPreview) setLogoPreview(company.logo_url);
  }, [logoPreview]);

  const { setActiveVariation, setVariations } = generation;
  const handleSelectProduct = useCallback((p: MagicUpProduct | null) => {
    setSelectedProduct(p); setSelectedColor(null); setVariations([]); setActiveVariation(0);
  }, [setActiveVariation, setVariations]);

  const handleClearClient = useCallback(() => { setSelectedClient(null); setLogoPreview(null); }, []);

  const step = magicUpStep(selectedProduct, logoPreview, effectivePrompt);

  return {
    products, loadingProducts, selectedProduct, colors, productImages,
    selectedColor, setSelectedColor, loadingColors, handleSelectProduct,
    printAreas, loadingPrintAreas, availableTechniques,
    selectedLocationId, setSelectedLocationId, selectedTechnique, setSelectedTechnique,
    logoPreview, logoUploading, handleLogoUpload,
    selectedScene, setSelectedScene, additionalDetails, setAdditionalDetails,
    showPromptPreview, setShowPromptPreview, sceneTab, setSceneTab,
    brief, setBrief: handleSetBrief, activeCampaign, setActiveCampaign, campaigns,
    handleSaveCampaign, handleSelectCampaign, handleDuplicateCampaign,
    creativeControls, setCreativeControls, brandNotes, setBrandNotes,
    brandKit, loadingBrandKit, handleUpdateBrandKit, handleUseBrandLogo, handleAddCurrentLogoToBrandKit, handleSaveBrandKit,
    activeRefinement, handleApplyRefinement, batchQueue, batchRunning, handleSetBatchQueue, handleRunBatchQueue, handleClearBatchQueue,
    qualityScore, copyPack,
    effectivePrompt, fullPromptPreview,
    selectedClient, clientSearch, setClientSearch, showClientResults,
    setShowClientResults, clientResults, loadingClients,
    handleSelectClient, handleClearClient,
    ...generation, handleSetCurationStatus,
    currentImage, selectedLocationName, history, step,
  };
}
