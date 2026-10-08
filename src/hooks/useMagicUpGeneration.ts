/**
 * Generation + download/share/favorite handlers extracted from useMagicUpState
 */
import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json, TablesInsert } from "@/integrations/supabase/types";
import type { VariationItem, MagicUpProduct, Technique, SelectedClient, ProductColor } from "./useMagicUpState";
import type { ScenePrompt } from "@/components/magic-up/PromptBank";
import type { GenerationHistoryItem } from "@/components/magic-up/AdImageResult";
import { buildQualityDiagnosis, type MagicUpBatchVariant, type MagicUpBrandKit, type MagicUpBrief, type MagicUpCampaign, type MagicUpCopyPack, type MagicUpCreativeControls, type MagicUpCurationStatus, type MagicUpQualityDiagnosis, type MagicUpQualityScore, type MagicUpRefinement } from "@/pages/magic-up/magicUpStrategy";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";

const toJson = (value: unknown): Json => value as Json;
const toJsonRecord = (value: Json | null | undefined): Record<string, Json> => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, Json> : {});
const MAGIC_UP_HISTORY_QUERY_KEY = "magic-up-history";

interface GenerationDeps {
  selectedProduct: MagicUpProduct | null;
  currentImage: string | null;
  logoPreview: string | null;
  effectivePrompt: string;
  selectedColor: ProductColor | null;
  selectedTechnique: Technique | null;
  selectedLocationName: string | null;
  selectedScene: ScenePrompt | null;
  selectedClient: SelectedClient | null;
  userId: string | undefined;
  brief: MagicUpBrief;
  creativeControls: MagicUpCreativeControls;
  qualityScore: MagicUpQualityScore;
  copyPack: MagicUpCopyPack;
  fullPromptPreview: string;
  activeCampaign: MagicUpCampaign | null;
  brandKit: MagicUpBrandKit;
  brandNotes: string;
  activeRefinement: MagicUpRefinement | null;
}

interface VariantInputs {
  brief: MagicUpBrief;
  controls: MagicUpCreativeControls;
  prompt: string;
}

interface GeneratedImageResponse {
  imageUrl?: string;
  error?: string;
  model?: string;
  outputChannel?: string;
  aspectRatio?: string;
  qualityMode?: string;
  creativeMode?: string;
  compositionMode?: string;
}

function valueOr<T>(value: T | null | undefined, fallback: T): T {
  return value || fallback;
}

function valueOrNull<T>(value: T | null | undefined): T | null {
  return value || null;
}

function logoFields(logo: string) {
  if (logo.startsWith('http')) return { logoBase64: undefined, logoUrl: logo };
  return { logoBase64: logo, logoUrl: undefined };
}

function generationSubject(deps: GenerationDeps) {
  if (!deps.logoPreview || !deps.selectedProduct) throw new Error("Produto e logomarca são obrigatórios");
  return { logoPreview: deps.logoPreview, selectedProduct: deps.selectedProduct };
}

function scoreRequestBody(
  deps: GenerationDeps,
  imageUrl: string,
  brief: MagicUpBrief,
  controls: MagicUpCreativeControls,
) {
  return {
    imageUrl,
    productName: deps.selectedProduct?.name,
    clientName: valueOr(deps.selectedClient?.name, deps.activeCampaign?.clientName),
    campaignBrief: brief,
    brandKit: deps.brandKit,
    creativeControls: controls,
    promptText: valueOr(deps.fullPromptPreview, deps.effectivePrompt),
    channel: brief.channel,
    aspectRatio: controls.aspectRatio,
  };
}

function variantInputs(deps: GenerationDeps, batch?: MagicUpBatchVariant): VariantInputs {
  const brief = batch
    ? { ...deps.brief, channel: valueOr(batch.channel, deps.brief.channel), tone: valueOr(batch.tone, deps.brief.tone) }
    : deps.brief;
  const controls = batch?.aspectRatio
    ? { ...deps.creativeControls, aspectRatio: batch.aspectRatio }
    : deps.creativeControls;
  const prompt = [
    valueOr(batch?.scenePrompt, deps.effectivePrompt),
    valueOr(batch?.refinementInstruction, deps.activeRefinement?.instruction),
  ].filter(Boolean).join("\n\nREFINEMENT INSTRUCTION: ");
  return { brief, controls, prompt };
}

function generationRequestBody(deps: GenerationDeps, batch: MagicUpBatchVariant | undefined, inputs: VariantInputs) {
  const subject = generationSubject(deps);
  return {
    productImageUrl: deps.currentImage,
    ...logoFields(subject.logoPreview),
    productName: subject.selectedProduct.name,
    productColor: valueOrNull(deps.selectedColor?.name),
    techniqueName: valueOrNull(deps.selectedTechnique?.name),
    locationName: valueOrNull(deps.selectedLocationName),
    scenePrompt: inputs.prompt,
    sceneCategory: valueOr(deps.selectedScene?.category, valueOr(batch?.id, "custom")),
    brandColorHex: valueOrNull(deps.selectedClient?.cor_primaria_hex),
    brandColorName: valueOrNull(deps.selectedClient?.cor_primaria_nome),
    campaignBrief: inputs.brief,
    outputChannel: inputs.brief.channel,
    aspectRatio: inputs.controls.aspectRatio,
    qualityMode: inputs.controls.qualityMode,
    compositionMode: inputs.controls.composition,
    creativeMode: inputs.controls.creativeMode,
    negativePrompt: inputs.controls.negativePrompt,
    brandKit: { ...deps.brandKit, notes: deps.brandNotes },
    refinementInstruction: valueOrNull(valueOr(batch?.refinementInstruction, deps.activeRefinement?.instruction)),
    batchVariant: valueOrNull(batch),
  };
}

function buildGenerationPayload(
  deps: GenerationDeps,
  batch: MagicUpBatchVariant | undefined,
  inputs: VariantInputs,
  ...generation: [
    response: GeneratedImageResponse & { imageUrl: string },
    diagnosis: MagicUpQualityDiagnosis,
  ]
): TablesInsert<"magic_up_generations"> {
  const [response, diagnosis] = generation;
  if (!deps.userId || !deps.selectedProduct) throw new Error("Usuário e produto são obrigatórios");
  return {
    user_id: deps.userId,
    campaign_id: valueOrNull(deps.activeCampaign?.id),
    product_name: deps.selectedProduct.name,
    product_id: deps.selectedProduct.id,
    product_sku: deps.selectedProduct.sku,
    scene_title: valueOrNull(deps.selectedScene?.title),
    scene_category: valueOr(deps.selectedScene?.category, valueOr(batch?.id, "custom")),
    generated_image_url: response.imageUrl,
    client_name: valueOrNull(valueOr(deps.selectedClient?.name, deps.activeCampaign?.clientName)),
    prompt_text: valueOr(deps.fullPromptPreview, deps.effectivePrompt),
    model: valueOr(response.model, "magic-up-pro"),
    channel: valueOr(response.outputChannel, inputs.brief.channel),
    aspect_ratio: valueOr(response.aspectRatio, inputs.controls.aspectRatio),
    quality_score: diagnosis.total,
    status: "draft",
    tags: [inputs.brief.channel, inputs.brief.objective, inputs.brief.tone, batch?.id].filter((tag): tag is string => Boolean(tag)),
    copy_pack: deps.copyPack,
    export_presets: ["png", "jpg-whatsapp", inputs.controls.aspectRatio],
    metadata: { brief: inputs.brief, creativeControls: inputs.controls, qualityScore: diagnosis.total, qualityDiagnosis: diagnosis, qualitySource: diagnosis.source, curation: { status: "draft", selectedAt: new Date().toISOString() }, campaign: deps.activeCampaign, brandKit: deps.brandKit, brandNotes: deps.brandNotes, refinement: deps.activeRefinement, batch: valueOrNull(batch), functionResult: { qualityMode: response.qualityMode, aspectRatio: response.aspectRatio, creativeMode: response.creativeMode, compositionMode: response.compositionMode } },
  };
}

async function saveGeneration(
  deps: GenerationDeps,
  batch: MagicUpBatchVariant | undefined,
  inputs: VariantInputs,
  ...generation: [response: GeneratedImageResponse, diagnosis: MagicUpQualityDiagnosis]
): Promise<string | null> {
  const [response, diagnosis] = generation;
  if (!deps.userId || !response.imageUrl) return null;
  const generationPayload = buildGenerationPayload(
    deps,
    batch,
    inputs,
    response as GeneratedImageResponse & { imageUrl: string },
    diagnosis,
  );
  const { data, error } = await supabase.from("magic_up_generations").insert(generationPayload).select("id").single();
  if (error) {
    toast.warning("Imagem gerada, mas não foi salva no histórico.");
    console.error("Magic Up history insert error:", error);
  }
  return data?.id ?? null;
}

async function generateVariation(
  deps: GenerationDeps,
  batch: MagicUpBatchVariant | undefined,
  analyzeQuality: (imageUrl: string, brief: MagicUpBrief, controls: MagicUpCreativeControls) => Promise<MagicUpQualityDiagnosis>,
): Promise<{ variation: VariationItem; diagnosis: MagicUpQualityDiagnosis }> {
  const inputs = variantInputs(deps, batch);
  const log = createClientLogger('magicUp.generate', { base: { productId: deps.selectedProduct?.id, channel: deps.brief.channel } });
  log.info('generate_start', { batch: batch?.id ?? null });
  const { data, error } = await supabase.functions.invoke<GeneratedImageResponse>("generate-ad-image", {
    headers: log.headers(),
    body: generationRequestBody(deps, batch, inputs),
  });
  if (error) throw error;
  if (!data?.imageUrl) throw new Error(data?.error || "Nenhuma imagem retornada");
  const diagnosis = await analyzeQuality(data.imageUrl, inputs.brief, inputs.controls);
  const id = await saveGeneration(deps, batch, inputs, data, diagnosis);
  log.info('generate_ok', { qualityScore: diagnosis.total, hasGenId: !!id });
  return {
    diagnosis,
    variation: { id, imageUrl: data.imageUrl, isFavorite: false, qualityScore: diagnosis.total, qualityDiagnosis: diagnosis, curationStatus: "draft" },
  };
}

export function useMagicUpGeneration(deps: GenerationDeps) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<VariationItem[]>([]);
  const [activeVariation, setActiveVariation] = useState(0);
  const [qualityDiagnosis, setQualityDiagnosis] = useState<MagicUpQualityDiagnosis>(() => buildQualityDiagnosis(deps.qualityScore));
  const [curationStatus, setCurationStatus] = useState<MagicUpCurationStatus>("draft");

  const canGenerate = !!(deps.selectedProduct && deps.currentImage && deps.logoPreview && deps.effectivePrompt);
  const currentVariation = variations[activeVariation] || null;

  const analyzeQuality = useCallback(async (imageUrl: string, variantBrief: MagicUpBrief, variantControls: MagicUpCreativeControls): Promise<MagicUpQualityDiagnosis> => {
    const fallback = buildQualityDiagnosis(deps.qualityScore);
    const log = createClientLogger('magicUp.score');
    log.info('score_start', { channel: variantBrief.channel });
    try {
      const { data, error } = await supabase.functions.invoke<MagicUpQualityDiagnosis>("magic-up-score", {
        body: scoreRequestBody(deps, imageUrl, variantBrief, variantControls),
        headers: log.headers(),
      });
      if (error || !data) throw error || new Error("Score indisponível");
      log.info('score_ok', { total: data.total, source: data.source });
      return { ...data, source: data.source || "ai" };
    } catch (error) {
      log.warn('score_fallback', { err: error });
      return fallback;
    }
  }, [deps]);

  const handleGenerate = useCallback(async (batchVariant?: MagicUpBatchVariant) => {
    if (!canGenerate) return;
    setGenerating(true);
    try {
      const { variation, diagnosis } = await generateVariation(deps, batchVariant, analyzeQuality);
      setQualityDiagnosis(diagnosis);
      setCurationStatus("draft");
      setVariations(previous => {
        setActiveVariation(previous.length);
        return [...previous, variation];
      });
      queryClient.invalidateQueries({ queryKey: [MAGIC_UP_HISTORY_QUERY_KEY] });
      toast.success("🎉 Imagem publicitária gerada com sucesso!");
    } catch (err: unknown) {
      createClientLogger('magicUp.generate').error('generate_failed', { err });
      toast.error(err instanceof Error ? err.message : "Erro ao gerar imagem");
    } finally {
      setGenerating(false);
    }
  }, [analyzeQuality, canGenerate, deps, queryClient]);

  const handleRunQualityScore = useCallback(async () => {
    if (!currentVariation?.imageUrl) return;
    const diagnosis = await analyzeQuality(currentVariation.imageUrl, deps.brief, deps.creativeControls);
    setQualityDiagnosis(diagnosis);
    setVariations(prev => prev.map((variation, index) => index === activeVariation ? { ...variation, qualityScore: diagnosis.total, qualityDiagnosis: diagnosis } : variation));
    if (currentVariation.id) {
      const { data: existing } = await supabase.from("magic_up_generations").select("metadata,status").eq("id", currentVariation.id).maybeSingle();
      const metadata = toJsonRecord(existing?.metadata);
      const status = (existing?.status as MagicUpCurationStatus | null) || curationStatus;
      await supabase.from("magic_up_generations").update({
        quality_score: diagnosis.total,
        metadata: {
          ...metadata,
          qualityScore: diagnosis.total,
          qualityDiagnosis: toJson(diagnosis),
          qualitySource: diagnosis.source,
          curation: toJson({ ...toJsonRecord(metadata.curation), status, scoreUpdatedAt: new Date().toISOString() }),
        },
      }).eq("id", currentVariation.id);
      queryClient.invalidateQueries({ queryKey: [MAGIC_UP_HISTORY_QUERY_KEY] });
    }
    toast.success("Magic Score atualizado");
  }, [activeVariation, analyzeQuality, currentVariation, curationStatus, deps.brief, deps.creativeControls, queryClient]);

  const handleSetCurationStatus = useCallback(async (status: MagicUpCurationStatus) => {
    setCurationStatus(status);
    setVariations(prev => prev.map((variation, index) => index === activeVariation ? { ...variation, curationStatus: status } : variation));
    if (currentVariation?.id) {
      const { data: existing } = await supabase.from("magic_up_generations").select("metadata").eq("id", currentVariation.id).maybeSingle();
      const metadata = toJsonRecord(existing?.metadata);
      await supabase.from("magic_up_generations").update({
        status,
        metadata: {
          ...metadata,
          curation: toJson({ ...toJsonRecord(metadata.curation), status, updatedAt: new Date().toISOString() }),
        },
      }).eq("id", currentVariation.id);
      queryClient.invalidateQueries({ queryKey: [MAGIC_UP_HISTORY_QUERY_KEY] });
    }
  }, [activeVariation, currentVariation?.id, queryClient]);

  const handleSelectWinningVariation = useCallback((index: number) => {
    setActiveVariation(index);
    const selected = variations[index];
    if (selected?.qualityDiagnosis) setQualityDiagnosis(selected.qualityDiagnosis);
    if (selected?.curationStatus) setCurationStatus(selected.curationStatus);
    setVariations(prev => prev.map((variation, i) => ({ ...variation, isWinner: i === index })));
    toast.success(`Variação ${index + 1} marcada como vencedora`);
  }, [variations]);

  const handleDownload = useCallback(async (format: "png" | "jpg" = "png") => {
    if (!currentVariation?.imageUrl) return;
    try {
      const resp = await fetch(currentVariation.imageUrl);
      const blob = await resp.blob();
      let finalBlob = blob;
      if (format === "jpg" && blob.type !== "image/jpeg") {
        const canvas = document.createElement("canvas");
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) { resolve(); return; }
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((b) => { if (b) finalBlob = b; resolve(); }, "image/jpeg", 0.85);
          };
          img.src = URL.createObjectURL(blob);
        });
      }
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `magic-up-${deps.selectedProduct?.sku || "ad"}-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar imagem");
    }
  }, [currentVariation, deps.selectedProduct]);

  const handleShare = useCallback(() => {
    if (!currentVariation?.imageUrl) return;
    const clientGreeting = deps.selectedClient ? `Olá ${deps.selectedClient.name}! ` : "";
    const text = deps.copyPack.whatsapp || `${clientGreeting}✨ Confira a imagem publicitária: ${deps.selectedProduct?.name}${deps.selectedColor ? ` (${deps.selectedColor.name})` : ""} com ${deps.selectedTechnique?.name || "personalização"}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + currentVariation.imageUrl)}`, "_blank");
  }, [currentVariation, deps]);

  const handleToggleFavorite = useCallback(async () => {
    if (!currentVariation?.id) return;
    const newVal = !currentVariation.isFavorite;
    setVariations(prev => prev.map((v, i) => i === activeVariation ? { ...v, isFavorite: newVal } : v));
    await supabase.from("magic_up_generations").update({ is_favorite: newVal }).eq("id", currentVariation.id);
    queryClient.invalidateQueries({ queryKey: [MAGIC_UP_HISTORY_QUERY_KEY] });
  }, [currentVariation, activeVariation, queryClient]);

  const handleToggleHistoryFavorite = useCallback(async (id: string, current: boolean) => {
    await supabase.from("magic_up_generations").update({ is_favorite: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: [MAGIC_UP_HISTORY_QUERY_KEY] });
  }, [queryClient]);

  const handleDeleteHistory = useCallback(async (id: string) => {
    await supabase.from("magic_up_generations").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: [MAGIC_UP_HISTORY_QUERY_KEY] });
    toast.success("Imagem removida do histórico");
  }, [queryClient]);

  const handleSelectHistory = useCallback((item: GenerationHistoryItem) => {
    const diagnosis = item.metadata?.qualityDiagnosis;
    const newVar: VariationItem = { id: item.id, imageUrl: item.generated_image_url, isFavorite: item.is_favorite, qualityScore: item.quality_score || undefined, qualityDiagnosis: diagnosis, curationStatus: item.status as MagicUpCurationStatus };
    setVariations([newVar]);
    setActiveVariation(0);
    if (diagnosis) setQualityDiagnosis(diagnosis);
    if (item.status) setCurationStatus(item.status as MagicUpCurationStatus);
  }, []);

  return {
    generating, variations, activeVariation, setActiveVariation,
    currentVariation, canGenerate, setVariations, qualityDiagnosis, curationStatus,
    handleGenerate, handleDownload, handleShare,
    handleRunQualityScore, handleSetCurationStatus, handleSelectWinningVariation,
    handleToggleFavorite, handleToggleHistoryFavorite,
    handleDeleteHistory, handleSelectHistory,
  };
}
