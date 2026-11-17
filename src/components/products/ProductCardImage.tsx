/** ProductCardImage — imagem do card com carrossel, badges e cores. */
import { memo, useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { Sparkles, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NoveltyBadge } from "./NoveltyBadge";
import { cn } from "@/lib/utils";
import { isLightColor } from "@/hooks/useColorSystem";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import type { MatchedColorVariant } from "@/utils/color-variant-carousel";
import { isPrivateStorageUrl, resolvePrivateStorageUrl } from "@/lib/private-storage";

interface ProductCardImageProps {
  product: { name: string; featured?: boolean; newArrival?: boolean; isKit?: boolean; onSale?: boolean; images: string[];
    colors: Array<{ hex: string; name: string; group: string; groupSlug?: string; variationSlug?: string }> };
  cardImageUrl: string; cardSrcSet?: string; activeColorName: string | null; colorSpecificImage: string | null;
  imageLoaded: boolean; isHovered: boolean; computedImageScale: number; isNovelty: boolean; noveltyDaysRemaining?: number;
  highlightColors?: string[]; activeColorFilter?: { groups?: string[]; variations?: string[] } | null;
  allMatchingVariants: MatchedColorVariant[]; hasMultipleVariants: boolean; safeVariantIdx: number;
  onImageLoad: () => void; onVariantChange: (idx: number) => void;
}

type SwipeElement = HTMLElement & { _swipeX?: number };
const PRODUCT_IMAGE_BUCKET = 'personalization-images';
const IMAGE_FALLBACK_URL = '/placeholder.svg';
function isPrivateImageReference(url: string): boolean {
  return isPrivateStorageUrl(url, PRODUCT_IMAGE_BUCKET);
}

async function resolveProductImageUrl(url: string): Promise<string> {
  try {
    return await resolvePrivateStorageUrl(url, PRODUCT_IMAGE_BUCKET) || IMAGE_FALLBACK_URL;
  } catch {
    return IMAGE_FALLBACK_URL;
  }
}

function useVariantPrefetch(hovered: boolean, multiple: boolean, variants: MatchedColorVariant[], activeIndex: number) {
  const prefetched = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!hovered || !multiple) return;
    for (const [index, variant] of variants.entries()) {
      if (index === activeIndex || !variant.image || isPrivateImageReference(variant.image) || prefetched.current.has(variant.image)) continue;
      const image = new Image();
      image.src = variant.image;
      prefetched.current.add(variant.image);
    }
  }, [hovered, multiple, variants, activeIndex]);
}

function swipeIndex(diff: number, index: number, length: number) {
  return diff < 0 ? (index + 1) % length : (index - 1 + length) % length;
}

function useVariantSwipe(enabled: boolean, index: number, variants: MatchedColorVariant[], onChange: (index: number) => void) {
  const onTouchStart = enabled ? (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (touch) (event.currentTarget as SwipeElement)._swipeX = touch.clientX;
  } : undefined;
  const onTouchEnd = enabled ? (event: TouchEvent<HTMLDivElement>) => {
    const element = event.currentTarget as SwipeElement;
    const start = element._swipeX;
    const touch = event.changedTouches[0];
    if (start === undefined || !touch) return;
    const diff = touch.clientX - start;
    if (Math.abs(diff) > 40) { event.stopPropagation(); onChange(swipeIndex(diff, index, variants.length)); }
    element._swipeX = undefined;
  } : undefined;
  return { onTouchStart, onTouchEnd };
}

function ProductImage({ props }: { props: ProductCardImageProps }) {
  const url = props.colorSpecificImage || props.product.images[0] || "";
  const privateImage = isPrivateImageReference(url);
  const [resolvedImage, setResolvedImage] = useState<{ source: string; url: string } | null>(null);
  useEffect(() => {
    if (!privateImage) {
      setResolvedImage((current) => current?.source === url ? current : null);
      return;
    }
    let current = true;
    void resolveProductImageUrl(url).then((resolved) => {
      if (current) setResolvedImage({ source: url, url: resolved });
    });
    return () => { current = false; };
  }, [privateImage, url]);
  const imageUrl = resolvedImage?.source === url ? resolvedImage.url :
    (url.startsWith('supabase-storage:') ? IMAGE_FALLBACK_URL : url);
  const name = props.activeColorName ? `${props.product.name} - ${props.activeColorName}` : props.product.name;
  return <div className="relative w-full h-full"><OptimizedImage urlCdn={imageUrl} variant="card" context="card" generateSrcSet={!privateImage}
    priority={Boolean(props.product.featured) || props.safeVariantIdx === 0} alt={name} title={name}
    className={cn("w-full h-full", props.imageLoaded ? "blur-0" : "blur-sm")}
    style={props.imageLoaded ? { transform: `scale(${props.computedImageScale})` } : undefined} onLoad={props.onImageLoad}
    onError={() => console.warn(`[IMG_FALLBACK] Retrying ${props.product.name}`)} /></div>;
}

function ProductBadges({ props }: { props: ProductCardImageProps }) {
  const { product } = props;
  const novelty = props.isNovelty && props.noveltyDaysRemaining !== undefined;
  return <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-1.5 z-10">
    {product.featured && <Badge className="bg-gradient-to-r from-brand to-brand-glow text-brand-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-lg animate-glow-pulse"><Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" /><span className="hidden sm:inline">Destaque</span><span className="sm:hidden">★</span></Badge>}
    {novelty ? <NoveltyBadge daysRemaining={props.noveltyDaysRemaining as number} size="sm" /> : product.newArrival && <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md"><span className="hidden sm:inline">Novidade</span><span className="sm:hidden">Novo</span></Badge>}
    {product.isKit && <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md"><Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />Kit</Badge>}
    {product.onSale && <Badge className="bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 shadow-md animate-pulse"><span className="hidden sm:inline">Promoção</span><span className="sm:hidden">%</span></Badge>}
  </div>;
}

function colorHighlighted(color: ProductCardImageProps["product"]["colors"][number], props: ProductCardImageProps) {
  return Boolean(props.highlightColors?.includes(color.group)) || Boolean(props.activeColorFilter?.groups?.includes(color.groupSlug || "")) || Boolean(props.activeColorFilter?.variations?.includes(color.variationSlug || ""));
}

function ColorDot({ color, highlighted }: { color: ProductCardImageProps["product"]["colors"][number]; highlighted: boolean }) {
  const borderColor = color.hex === "#FFFFFF" ? "hsl(var(--border))" : undefined;
  return <Tooltip><TooltipTrigger asChild><div className={cn("w-5 h-5 rounded-full border-2 shadow-sm cursor-pointer transition-all duration-200 hover:scale-125 hover:shadow-md", highlighted ? "border-success ring-2 ring-success/30 scale-110" : "border-border/50")} style={{ backgroundColor: color.hex, borderColor }} /></TooltipTrigger><TooltipContent>{color.name}</TooltipContent></Tooltip>;
}

function ColorDots({ props }: { props: ProductCardImageProps }) {
  if (props.product.colors.length === 0) return null;
  return <div className={cn("absolute bottom-3 left-3 right-3 z-10 transition-all duration-400 ease-out", props.isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}><div className="flex items-center gap-1.5 bg-card/95 backdrop-blur-md rounded-full px-3 py-2 shadow-lg border border-border/50">
    {props.product.colors.slice(0, 6).map(color => <ColorDot key={`${color.name}-${color.hex}`} color={color} highlighted={colorHighlighted(color, props)} />)}
    {props.product.colors.length > 6 && <span className="text-xs font-medium text-muted-foreground ml-1">+{props.product.colors.length - 6}</span>}
  </div></div>;
}

function variantBorder(variant: MatchedColorVariant, active: boolean) {
  if (!active) return undefined;
  return isLightColor(variant.hex) ? "hsl(var(--muted-foreground))" : variant.hex;
}
function variantRing(variant: MatchedColorVariant, active: boolean) {
  if (!active) return undefined;
  return isLightColor(variant.hex) ? "hsl(var(--muted-foreground) / 0.6)" : variant.hex;
}

function VariantDot({ variant, index, activeIndex, onChange }: { variant: MatchedColorVariant; index: number; activeIndex: number; onChange: (index: number) => void }) {
  const active = index === activeIndex;
  return <button role="tab" type="button" tabIndex={active ? 0 : -1} aria-selected={active} aria-current={active ? "true" : undefined}
    onClick={event => { event.stopPropagation(); onChange(index); }} aria-label={`Ver variante ${variant.name}`} title={variant.name}
    className={cn("w-5 h-5 rounded-full border-2 transition-all duration-200 hover:scale-125 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1", active ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "border-border/50 opacity-70 hover:opacity-100")}
    style={{ backgroundColor: variant.hex, borderColor: variantBorder(variant, active), ["--tw-ring-color" as string]: variantRing(variant, active) }} />;
}

function handleVariantKey(event: KeyboardEvent<HTMLDivElement>, index: number, length: number, onChange: (index: number) => void) {
  if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); onChange((index + 1) % length); }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); onChange((index - 1 + length) % length); }
}

function VariantDots({ props }: { props: ProductCardImageProps }) {
  if (!props.hasMultipleVariants) return null;
  const activeName = props.allMatchingVariants[props.safeVariantIdx]?.name;
  return <div role="tablist" aria-label={`Variantes de cor: ${props.allMatchingVariants.map(variant => variant.name).join(", ")}`}
    className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 bg-card/95 backdrop-blur-lg rounded-full px-2.5 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.15)] border border-border/40 dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
    onClick={event => event.stopPropagation()} onKeyDown={event => handleVariantKey(event, props.safeVariantIdx, props.allMatchingVariants.length, props.onVariantChange)}>
    {props.allMatchingVariants.map((variant, index) => <VariantDot key={variant.groupSlug || variant.variationSlug || index} variant={variant} index={index} activeIndex={props.safeVariantIdx} onChange={props.onVariantChange} />)}
    <span className="text-[10px] font-medium text-muted-foreground ml-0.5 max-w-[60px] truncate hidden sm:inline" title={activeName}>{activeName}</span>
    <span className="text-[10px] font-medium text-muted-foreground ml-0.5" aria-live="polite">{props.safeVariantIdx + 1}/{props.allMatchingVariants.length}</span>
  </div>;
}

export const ProductCardImage = memo(function ProductCardImage(props: ProductCardImageProps) {
  useVariantPrefetch(props.isHovered, props.hasMultipleVariants, props.allMatchingVariants, props.safeVariantIdx);
  const swipe = useVariantSwipe(props.hasMultipleVariants, props.safeVariantIdx, props.allMatchingVariants, props.onVariantChange);
  return <div className="relative aspect-[4/5] overflow-hidden product-img-container bg-muted/30" style={{ zIndex: 0 }} {...swipe}>
    <ProductImage props={props} />
    {props.activeColorName && props.colorSpecificImage && <div className="absolute top-2 right-2 z-10 sm:hidden"><Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-card/90 backdrop-blur-sm shadow-sm">{props.activeColorName}</Badge></div>}
    <div className={cn("absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent transition-opacity duration-500", props.isHovered ? "opacity-100" : "opacity-0")} />
    {props.product.featured && <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 pointer-events-none" />}
    <ProductBadges props={props} /><ColorDots props={props} /><VariantDots props={props} />
  </div>;
});
