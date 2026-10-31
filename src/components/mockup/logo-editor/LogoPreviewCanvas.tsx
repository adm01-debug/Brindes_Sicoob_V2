import type { CSSProperties, PointerEvent, RefObject, SyntheticEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TechniqueFilter } from "./logoTechniqueFilters";
import type { TechniqueColorConfig } from "../techniqueColorUtils";

interface LogoPreviewCanvasProps {
  containerRef: RefObject<HTMLDivElement>;
  productImageUrl: string;
  logoPreview: string | null;
  logoDisplay: { widthPx: number; heightPx: number } | null;
  positionX: number;
  positionY: number;
  logoRotation: number;
  userScaleFactor: number;
  processedLogoUrl: string | null;
  techniqueFilter: TechniqueFilter;
  colorConfigFilter: { filter: string; opacity: number } | null;
  techniqueColorConfig?: TechniqueColorConfig | null;
  techniqueName?: string;
  onPointerDown: (e: PointerEvent) => void;
  onColorConfigClick?: () => void;
}

function getIndicatorBackground(filter: string) {
  if (filter.includes("grayscale")) return "linear-gradient(135deg, hsl(var(--muted-foreground)), hsl(var(--muted)))";
  if (filter.includes("sepia")) return "linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.65))";
  return "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))";
}

function TechniqueIndicator({ name, filter }: { name?: string; filter: TechniqueFilter }) {
  if (!name) return null;
  return <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20"><div className="w-4 h-4 rounded-full border-2 border-primary" style={{ background: getIndicatorBackground(filter.filter) }} /><span className="text-xs text-muted-foreground">Simulando: <span className="font-medium text-foreground">{name}</span></span><Badge variant="secondary" className="text-[10px] ml-auto">{filter.description}</Badge></div>;
}

function ProductImage({ url }: { url: string }) {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    if (image.src.includes("/thumbnail")) image.src = image.src.replace("/thumbnail", "");
    else if (!image.src.endsWith("/placeholder.svg") && !image.dataset.fallback) {
      image.dataset.fallback = "1";
      image.src = "/placeholder.svg";
    }
  };
  return <img src={url} alt="Imagem do produto para preview de personalização" className="absolute inset-0 w-full h-full object-contain" loading="lazy" onError={handleError} />;
}

function isProcessedLogo(props: LogoPreviewCanvasProps) {
  const category = props.techniqueColorConfig?.category;
  return Boolean(props.processedLogoUrl && (category === "laser" || category === "serigrafia"));
}

function logoAppearance(props: LogoPreviewCanvasProps, processed: boolean) {
  return {
    opacity: processed ? 0.92 : props.colorConfigFilter?.opacity ?? props.techniqueFilter.opacity,
    filter: processed ? "none" : props.colorConfigFilter?.filter ?? props.techniqueFilter.filter,
  };
}

function LogoLayer(props: LogoPreviewCanvasProps) {
  const { logoPreview, logoDisplay, processedLogoUrl } = props;
  if (!logoPreview || !logoDisplay) return <div className="absolute inset-0 flex items-center justify-center bg-background/80"><p className="text-sm text-muted-foreground text-center px-4">Faça upload do logo para posicioná-lo</p></div>;
  const isCanvasProcessed = isProcessedLogo(props);
  const source = isCanvasProcessed && processedLogoUrl ? processedLogoUrl : logoPreview;
  const { opacity, filter } = logoAppearance(props, isCanvasProcessed);
  return <div className={cn("absolute select-none touch-none overflow-hidden", "cursor-grab active:cursor-grabbing", "ring-2 ring-primary/30 rounded-sm")} onPointerDown={props.onPointerDown} style={{ left: `${props.positionX}%`, top: `${props.positionY}%`, width: `${logoDisplay.widthPx}px`, height: `${logoDisplay.heightPx}px`, transform: "translate(-50%, -50%)" }}><img src={source} alt="Logo para personalização" className="absolute inset-0 w-full h-full object-contain" style={{ transform: `rotate(${props.logoRotation}deg) scale(${props.userScaleFactor})`, opacity, filter, mixBlendMode: props.techniqueFilter.blend as CSSProperties["mixBlendMode"] }} draggable={false} loading="lazy" /></div>;
}

function colorConfigLabel(config: TechniqueColorConfig) {
  if (config.category === "laser") return `Laser ${config.laserTone === "claro" ? "Claro" : "Escuro"}`;
  if (config.category === "serigrafia") {
    const count = config.colorCount || 1;
    return `${count} cor${count > 1 ? "es" : ""}`;
  }
  return "Policromia";
}

function PreviewBadges({ logoPreview, config, onClick }: { logoPreview: string | null; config?: TechniqueColorConfig | null; onClick?: () => void }) {
  if (!logoPreview) return null;
  return <div className="absolute top-2 left-2 flex flex-col gap-1"><Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-[10px] gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Preview em tempo real</Badge>{config && <Badge variant="outline" className="bg-background/90 backdrop-blur-sm text-[10px] gap-1 cursor-pointer hover:bg-accent" onClick={onClick}><Palette className="h-3 w-3" />{colorConfigLabel(config)}</Badge>}</div>;
}

export function LogoPreviewCanvas(props: LogoPreviewCanvasProps) {

  return (
    <>
      <TechniqueIndicator name={props.techniqueName} filter={props.techniqueFilter} />
      <div ref={props.containerRef} className="relative rounded-lg border overflow-hidden bg-muted/30 aspect-square">
        <ProductImage url={props.productImageUrl} />
        <LogoLayer {...props} />
        <PreviewBadges logoPreview={props.logoPreview} config={props.techniqueColorConfig} onClick={props.onColorConfigClick} />
      </div>
    </>
  );
}
