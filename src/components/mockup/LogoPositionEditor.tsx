import { type ReactNode, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Move } from "lucide-react";
import { useProductBounds } from "@/hooks/useProductBounds";
import { logger } from "@/lib/logger";
import type { TechniqueColorConfig } from "./techniqueColorUtils";
import { getTechniqueFilter } from "./logo-editor/logoTechniqueFilters";
import { useElementSize } from "./logo-editor/useElementSize";
import { useLogoProcessing } from "./logo-editor/useLogoProcessing";
import { useLogoDrag } from "./logo-editor/useLogoDrag";
import { LogoPreviewCanvas } from "./logo-editor/LogoPreviewCanvas";
import { LogoQuickActions } from "./logo-editor/LogoQuickActions";
import { LogoSizeControls } from "./logo-editor/LogoSizeControls";

interface LogoPositionEditorProps {
  productImageUrl: string;
  logoPreview: string | null;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoRotation?: number;
  logoScale?: number;
  techniqueCode?: string | null;
  techniqueName?: string;
  maxWidth?: number | null;
  maxHeight?: number | null;
  productHeightCm?: number | null;
  productWidthCm?: number | null;
  techniqueColorConfig?: TechniqueColorConfig | null;
  onColorConfigClick?: () => void;
  onPositionChange: (x: number, y: number) => void;
  onRotationChange?: (rotation: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onLogoScaleChange?: (scale: number) => void;
  headerActions?: ReactNode;
}

function getColorConfigFilter(config?: TechniqueColorConfig | null) {
  if (!config) return null;
  if (config.category === "laser") {
    return config.laserTone === "claro"
      ? { filter: "grayscale(1) brightness(1.4)", opacity: 0.75 }
      : { filter: "grayscale(1) brightness(0.6)", opacity: 0.88 };
  }
  if (config.category === "serigrafia") return { filter: "contrast(1.2)", opacity: 0.92 };
  return null;
}

type ProductBounds = ReturnType<typeof useProductBounds>;

function renderedImageSize(containerWidth: number, containerHeight: number, imageAspectRatio: number) {
  const containerAspectRatio = containerWidth / containerHeight;
  if (imageAspectRatio > containerAspectRatio) return { width: containerWidth, height: containerWidth / imageAspectRatio };
  return { width: containerHeight * imageAspectRatio, height: containerHeight };
}

function positive(value?: number | null) {
  return value && value > 0 ? value : null;
}

function physicalDimensions(props: LogoPositionEditorProps) {
  const productHeight = positive(props.productHeightCm);
  const productWidth = positive(props.productWidthCm);
  const maxWidth = positive(props.maxWidth);
  const maxHeight = positive(props.maxHeight);
  const widthFallback = maxWidth ? maxWidth * 2 : 8;
  const heightFallback = maxHeight ? maxHeight * 2.5 : 20;
  const width = productWidth || (productHeight ? productHeight * 0.4 : widthFallback);
  const height = productHeight || (productWidth ? productWidth * 2.5 : heightFallback);
  if (!productHeight && !productWidth) logger.warn("[LogoPositionEditor] Product physical dims missing — using estimates:", { physW: width, physH: height });
  return { width, height };
}

function calculateLogoDisplay(props: LogoPositionEditorProps, containerSize: { width: number; height: number }, bounds: ProductBounds) {
  if (!bounds.detected) return null;
  const containerWidth = containerSize.width || 400;
  const containerHeight = containerSize.height || containerWidth;
  const rendered = renderedImageSize(containerWidth, containerHeight, bounds.imageAspectRatio || 1);
  const physical = physicalDimensions(props);
  const cmToPx = Math.min((rendered.width * bounds.fractionX) / physical.width, (rendered.height * bounds.fractionY) / physical.height);
  const widthPx = props.logoWidth * cmToPx;
  const heightPx = props.logoHeight * cmToPx;
  if (widthPx >= 40 || heightPx >= 40) return { widthPx, heightPx };
  const boost = 40 / Math.max(widthPx, heightPx);
  return { widthPx: widthPx * boost, heightPx: heightPx * boost };
}

function useEditorState(props: LogoPositionEditorProps) {
  const { ref: containerRef, size: containerSize } = useElementSize<HTMLDivElement>();
  const productBounds = useProductBounds(props.productImageUrl);
  const { processedLogoUrl } = useLogoProcessing(props.logoPreview, props.techniqueColorConfig);
  const { handlePointerDown } = useLogoDrag(containerRef, props.positionX, props.positionY, props.onPositionChange);
  const techniqueFilter = useMemo(() => getTechniqueFilter(props.techniqueCode, props.techniqueName), [props.techniqueCode, props.techniqueName]);
  const colorConfigFilter = useMemo(() => getColorConfigFilter(props.techniqueColorConfig), [props.techniqueColorConfig]);
  const logoDisplay = useMemo(() => calculateLogoDisplay(props, containerSize, productBounds), [props, containerSize, productBounds]);
  return { containerRef, processedLogoUrl, handlePointerDown, techniqueFilter, colorConfigFilter, logoDisplay };
}

type EditorState = ReturnType<typeof useEditorState>;

function EditorHeader({ actions }: { actions?: ReactNode }) {
  return <CardHeader className="pb-3"><div className="flex items-center justify-between"><div><CardTitle className="flex items-center gap-2 text-base"><Move className="h-4 w-4 text-primary" />Posicionar Logo</CardTitle><CardDescription className="text-xs">Arraste o logo para posicionar. Use os sliders para ajustar tamanho.</CardDescription></div>{actions}</div></CardHeader>;
}

function EditorControls({ props, state, rotation, scale }: { props: LogoPositionEditorProps; state: EditorState; rotation: number; scale: number }) {
  return <CardContent className="space-y-4"><LogoPreviewCanvas containerRef={state.containerRef} productImageUrl={props.productImageUrl} logoPreview={props.logoPreview} logoDisplay={state.logoDisplay} positionX={props.positionX} positionY={props.positionY} logoRotation={rotation} userScaleFactor={scale / 100} processedLogoUrl={state.processedLogoUrl} techniqueFilter={state.techniqueFilter} colorConfigFilter={state.colorConfigFilter} techniqueColorConfig={props.techniqueColorConfig} techniqueName={props.techniqueName} onPointerDown={props.logoPreview ? state.handlePointerDown : () => {}} onColorConfigClick={props.onColorConfigClick} /><LogoQuickActions logoPreview={props.logoPreview} positionX={props.positionX} positionY={props.positionY} logoRotation={rotation} onPositionChange={props.onPositionChange} onRotationChange={props.onRotationChange} /><LogoSizeControls logoPreview={props.logoPreview} logoWidth={props.logoWidth} logoHeight={props.logoHeight} logoScale={scale} logoRotation={rotation} positionX={props.positionX} positionY={props.positionY} maxWidth={props.maxWidth} maxHeight={props.maxHeight} onSizeChange={props.onSizeChange} onLogoScaleChange={props.onLogoScaleChange} /></CardContent>;
}

export function LogoPositionEditor(props: LogoPositionEditorProps) {
  const state = useEditorState(props);
  const logoRotation = props.logoRotation ?? 0;
  const logoScale = props.logoScale ?? 100;

  return <Card><EditorHeader actions={props.headerActions} /><EditorControls props={props} state={state} rotation={logoRotation} scale={logoScale} /></Card>;
}
