/**
 * MockupLayoutButtons — "Gerar Layout" buttons for the mockup result panel.
 * Two modes: AI (uses existing generated mockup) and Static (high-res composition).
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, ImageIcon, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { detectProductBounds } from "@/lib/product-bounds-detector";
import { MockupApprovalPreview } from "./MockupApprovalPreview";
import type { MockupApprovalData } from "@/types/mockup-approval";
import type { MockupClient } from "@/components/mockup/MockupConfigPanel";
import type { DetectedColor } from "@/hooks/useLogoColorAnalysis";

interface MockupLayoutButtonsProps {
  /** The AI-generated mockup URL */
  generatedMockup: string | null;
  /** Product info */
  product: {
    name: string;
    sku?: string;
    imageUrl?: string;
    color?: string;
    colorHex?: string;
    material?: string;
    heightCm?: number | null;
    widthCm?: number | null;
    diameterCm?: number | null;
    depthCm?: number | null;
    capacityMl?: number | null;
    weightG?: number | null;
  } | null;
  /** Selected technique */
  technique: {
    name: string;
    code?: string | null;
    maxWidth?: number | null;
    maxHeight?: number | null;
    locationName?: string | null;
  } | null;
  /** Selected client */
  client: MockupClient | null;
  /** Seller info */
  seller: {
    name: string;
    email?: string;
  } | null;
  /** Active personalization area dimensions */
  activeArea: {
    logoWidth: number;
    logoHeight: number;
    logoPreview?: string | null;
    positionX: number;
    positionY: number;
    logoRotation?: number;
    logoScale?: number;
    name: string;
  } | null;
  /** Physical product dimensions in cm */
  productHeightCm?: number | null;
  productWidthCm?: number | null;
  /** Pantone colors from logo analysis */
  pantoneColors?: DetectedColor[];
  /** Number of colors from technique config */
  colorsCount?: number;
  /** Callback to save the generated static mockup to history */
  onStaticGenerated?: (dataUrl: string, extra?: { locationName?: string; colorsCount?: number }) => void;
  /** Callback when layout image is captured from the approval template */
  onLayoutCaptured?: (layoutDataUrl: string) => void;
  /** Trigger AI mockup generation (async) */
  onGenerateMockup?: () => Promise<void>;
  /** Whether AI mockup is currently being generated */
  isGeneratingMockup?: boolean;
}

type LayoutMode = "ai" | "static";
type MockupProduct = NonNullable<MockupLayoutButtonsProps["product"]>;
type MockupTechnique = NonNullable<MockupLayoutButtonsProps["technique"]>;
type ActiveArea = NonNullable<MockupLayoutButtonsProps["activeArea"]>;

function firstText(values: Array<string | null | undefined>, fallback = "—") {
  return values.find(Boolean) ?? fallback;
}

function approvalClient(client: MockupLayoutButtonsProps["client"]) {
  return { name: firstText([client?.nome_fantasia, client?.razao_social, client?.name]), cnpj: client?.cnpj, logoUrl: client?.logo_url || undefined };
}

function approvalProduct(product: MockupLayoutButtonsProps["product"]) {
  if (!product) return { name: "—" };
  return { name: product.name, sku: product.sku, imageUrl: product.imageUrl, color: product.color, colorHex: product.colorHex, material: product.material,
    heightCm: product.heightCm, widthCm: product.widthCm, diameterCm: product.diameterCm, depthCm: product.depthCm, capacityMl: product.capacityMl, weightG: product.weightG };
}

function approvalTechnique(technique: MockupLayoutButtonsProps["technique"]) {
  if (!technique) return { name: "—", code: undefined, location: undefined, width: undefined, height: undefined };
  return { name: technique.name, code: technique.code || undefined, location: technique.locationName, width: technique.maxWidth, height: technique.maxHeight };
}

function approvalArea(area: MockupLayoutButtonsProps["activeArea"]) {
  if (!area) return { name: undefined, width: undefined, height: undefined };
  return { name: area.name, width: area.logoWidth, height: area.logoHeight };
}

function approvalPersonalization(technique: MockupLayoutButtonsProps["technique"], area: MockupLayoutButtonsProps["activeArea"], colorsCount?: number) {
  const techniqueData = approvalTechnique(technique);
  const areaData = approvalArea(area);
  return { techniqueName: techniqueData.name, techniqueCode: techniqueData.code,
    locationName: firstText([techniqueData.location, areaData.name], "Frente"), widthCm: [areaData.width, techniqueData.width].find(Boolean) ?? 0,
    heightCm: [areaData.height, techniqueData.height].find(Boolean) ?? 0, colorsCount };
}

function approvalColors(colors?: DetectedColor[]) {
  return (colors ?? []).map(color => ({ name: firstText([color.selectedPantone, color.pantoneMatch?.pantoneCode, color.name]), hex: color.hex }));
}

function createApprovalData(props: MockupLayoutButtonsProps, mockupUrl: string, mode: LayoutMode): MockupApprovalData {
  const { client, seller, product, technique, activeArea, pantoneColors, colorsCount } = props;
  const now = new Date();
  const date = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const documentNumber = `MK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return {
    documentNumber, date,
    client: approvalClient(client),
    seller: { name: firstText([seller?.name]), email: seller?.email },
    product: approvalProduct(product),
    personalization: approvalPersonalization(technique, activeArea, colorsCount),
    pantoneColors: approvalColors(pantoneColors),
    mockupImageUrl: mockupUrl, layoutMode: mode,
  };
}

function containedSize(width: number, height: number, containerWidth: number, containerHeight: number) {
  const ratio = width / height;
  const containerRatio = containerWidth / containerHeight;
  return ratio > containerRatio
    ? { width: containerWidth, height: containerWidth / ratio }
    : { width: containerHeight * ratio, height: containerHeight };
}

function positive(value?: number | null) {
  return value && value > 0 ? value : null;
}

function physicalDimensions(productHeightCm: number | null | undefined, productWidthCm: number | null | undefined, technique: MockupTechnique) {
  const maxWidth = positive(technique.maxWidth);
  const maxHeight = positive(technique.maxHeight);
  const height = positive(productHeightCm);
  const width = positive(productWidthCm);
  return {
    width: width || (height ? height * 0.4 : (maxWidth ? maxWidth * 2 : 8)),
    height: height || (width ? width * 2.5 : (maxHeight ? maxHeight * 2.5 : 20)),
  };
}

function scaledAreaSize(area: ActiveArea, cmToPx: number) {
  let width = area.logoWidth * cmToPx;
  let height = area.logoHeight * cmToPx;
  if (width < 40 && height < 40) {
    const boost = 40 / Math.max(width, height);
    width *= boost;
    height *= boost;
  }
  return { width, height };
}

interface DrawLogoOptions { ctx: CanvasRenderingContext2D; logo: HTMLImageElement; area: ActiveArea; canvasSize: number; areaSize: { width: number; height: number } }

function drawLogo({ ctx, logo, area, canvasSize, areaSize }: DrawLogoOptions) {
  const x = (area.positionX / 100) * canvasSize - areaSize.width / 2;
  const y = (area.positionY / 100) * canvasSize - areaSize.height / 2;
  const contained = containedSize(logo.naturalWidth, logo.naturalHeight, areaSize.width, areaSize.height);
  const offsetX = (areaSize.width - contained.width) / 2;
  const offsetY = (areaSize.height - contained.height) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, areaSize.width, areaSize.height);
  ctx.clip();
  ctx.translate(x + areaSize.width / 2, y + areaSize.height / 2);
  ctx.rotate(((area.logoRotation || 0) * Math.PI) / 180);
  ctx.scale((area.logoScale ?? 100) / 100, (area.logoScale ?? 100) / 100);
  ctx.drawImage(logo, -areaSize.width / 2 + offsetX, -areaSize.height / 2 + offsetY, contained.width, contained.height);
  ctx.restore();
}

interface StaticCompositionOptions { product: MockupProduct; technique: MockupTechnique; area: ActiveArea; productHeightCm?: number | null; productWidthCm?: number | null }

async function composeStaticMockup({ product, technique, area, productHeightCm, productWidthCm }: StaticCompositionOptions) {
  const canvasSize = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const ctx = canvas.getContext("2d");
  if (!ctx || !product.imageUrl || !area.logoPreview) throw new Error("Dados insuficientes para compor o layout estático");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasSize, canvasSize);
  const [productImage, logoImage, bounds] = await Promise.all([loadImageWithFallback(product.imageUrl), loadImageWithFallback(area.logoPreview), detectProductBounds(product.imageUrl)]);
  const rendered = containedSize(productImage.naturalWidth, productImage.naturalHeight, canvasSize, canvasSize);
  ctx.drawImage(productImage, (canvasSize - rendered.width) / 2, (canvasSize - rendered.height) / 2, rendered.width, rendered.height);
  const physical = physicalDimensions(productHeightCm, productWidthCm, technique);
  const cmToPx = Math.min((rendered.width * bounds.fractionX) / physical.width, (rendered.height * bounds.fractionY) / physical.height);
  drawLogo({ ctx, logo: logoImage, area, canvasSize, areaSize: scaledAreaSize(area, cmToPx) });
  return canvas.toDataURL("image/png");
}

function useApprovalPreview(props: MockupLayoutButtonsProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [approvalData, setApprovalData] = useState<MockupApprovalData | null>(null);
  const pendingLayoutAI = useRef(false);
  const openApproval = useCallback((url: string, mode: LayoutMode) => {
    setApprovalData(createApprovalData(props, url, mode));
    setPreviewOpen(true);
  }, [props]);
  useEffect(() => {
    if (pendingLayoutAI.current && props.generatedMockup) {
      pendingLayoutAI.current = false;
      openApproval(props.generatedMockup, "ai");
    }
  }, [props.generatedMockup, openApproval]);
  return { previewOpen, setPreviewOpen, approvalData, pendingLayoutAI, openApproval };
}

type ApprovalPreviewState = ReturnType<typeof useApprovalPreview>;

function useLayoutActions(props: MockupLayoutButtonsProps, preview: ApprovalPreviewState) {
  const [isGeneratingStatic, setIsGeneratingStatic] = useState(false);
  const { generatedMockup, onGenerateMockup } = props;
  const handleLayoutAI = useCallback(async () => {
    if (generatedMockup) {
      preview.openApproval(generatedMockup, "ai");
      return;
    }
    if (onGenerateMockup) {
      preview.pendingLayoutAI.current = true;
      await onGenerateMockup();
    } else {
      toast.error("Configure o gerador de mockup primeiro.");
    }
  }, [generatedMockup, onGenerateMockup, preview]);

  const handleLayoutStatic = useCallback(async () => {
    if (!props.product?.imageUrl || !props.activeArea?.logoPreview || !props.technique) {
      toast.error("Selecione um produto e faça upload do logo primeiro.");
      return;
    }
    setIsGeneratingStatic(true);
    try {
      const dataUrl = await composeStaticMockup({ product: props.product, technique: props.technique, area: props.activeArea, productHeightCm: props.productHeightCm, productWidthCm: props.productWidthCm });
      props.onStaticGenerated?.(dataUrl, { locationName: props.technique.locationName || props.activeArea.name || undefined, colorsCount: props.colorsCount });
      preview.openApproval(dataUrl, "static");
    } catch (err) {
      console.error("Static composition error:", err);
      toast.error("Erro ao gerar composição estática. Verifique se as imagens estão acessíveis.");
    } finally {
      setIsGeneratingStatic(false);
    }
  }, [props, preview]);
  return { isGeneratingStatic, handleLayoutAI, handleLayoutStatic };
}

function StaticLayoutButton({ disabled, loading, onClick }: { disabled: boolean; loading: boolean; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><span className="flex-1"><Button size="sm" onClick={onClick} disabled={disabled || loading} className="w-full gap-1.5 !bg-primary hover:!bg-primary/80 !text-primary-foreground font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:!opacity-40 disabled:cursor-not-allowed">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}Gerar Layout</Button></span></TooltipTrigger>
    {disabled && <TooltipContent side="bottom"><p>Faça upload do logo primeiro</p></TooltipContent>}
  </Tooltip>;
}

function AiLayoutButton({ disabled, loading, onClick }: { disabled: boolean; loading: boolean; onClick: () => void }) {
  return <Tooltip><TooltipTrigger asChild><span className="flex-1"><Button size="sm" onClick={onClick} disabled={disabled || loading} className="w-full gap-1.5 !bg-primary hover:!bg-primary/80 !text-primary-foreground font-semibold shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all disabled:!opacity-40 disabled:cursor-not-allowed">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}Gerar Layout - IA</Button></span></TooltipTrigger>
    {disabled && <TooltipContent side="bottom"><p>Faça upload do logo primeiro</p></TooltipContent>}
  </Tooltip>;
}

export function MockupLayoutButtons(props: MockupLayoutButtonsProps) {
  const preview = useApprovalPreview(props);
  const actions = useLayoutActions(props, preview);
  if (!props.product || !props.technique || !props.activeArea) return null;
  const missingLogo = !props.activeArea.logoPreview;

  return <><div className="flex items-center gap-2"><StaticLayoutButton disabled={missingLogo} loading={actions.isGeneratingStatic} onClick={actions.handleLayoutStatic} />
    <AiLayoutButton disabled={missingLogo} loading={Boolean(props.isGeneratingMockup)} onClick={actions.handleLayoutAI} /></div>
    {preview.approvalData && <MockupApprovalPreview data={preview.approvalData} open={preview.previewOpen} onOpenChange={preview.setPreviewOpen} onLayoutCaptured={props.onLayoutCaptured} />}
  </>;
}

/* ─── Util: Load image with CORS fallback ─── */
async function loadImageWithFallback(src: string): Promise<HTMLImageElement> {
  // Try with CORS first
  try {
    return await loadImage(src, true);
  } catch {
    // Fallback: fetch as blob to bypass CORS
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const img = await loadImage(blobUrl, false);
      URL.revokeObjectURL(blobUrl);
      return img;
    } catch {
      // Last resort: try without CORS attribute (will taint canvas but at least renders)
      return loadImage(src, false);
    }
  }
}

function loadImage(src: string, useCors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}
