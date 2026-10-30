import { type KeyboardEvent, type MouseEvent, type ReactNode, type WheelEvent, useState, useRef, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCdnUrl } from "@/utils/image-utils";
import { GalleryFullscreen } from "./gallery/GalleryFullscreen";
import { GalleryVideoPlayer } from "./gallery/GalleryVideoPlayer";
import { GalleryColorVariations } from "./gallery/GalleryColorVariations";

interface ProductVideo {
  id: string;
  url_stream: string | null;
  url_hls: string | null;
  url_thumbnail: string | null;
  url_original: string | null;
  source_youtube_id: string | null;
  video_type: string | null;
  display_order: number;
  is_primary: boolean;
  title: string | null;
}

interface ColorMedia {
  name: string;
  hex: string;
  sku?: string;
  stock?: number;
  image?: string;
  images?: string[];
  videos?: string[];
}

interface ProductGalleryProps {
  images: string[];
  video?: string;
  videos?: string[];
  productVideos?: ProductVideo[];
  productName: string;
  colors?: ColorMedia[];
  onColorSelect?: (colorIndex: number) => void;
  selectedColorIndex?: number;
}

function resolveGalleryMedia(selectedColor: ColorMedia | undefined, images: string[], video: string | undefined, videos: string[]) {
  const displayImages = selectedColor?.images?.length ? selectedColor.images : selectedColor?.image ? [selectedColor.image] : images;
  const displayVideos = selectedColor?.videos?.length ? selectedColor.videos : video ? [video, ...videos] : videos;
  return { displayImages, displayVideos, allMedia: [...displayImages, ...displayVideos] };
}

interface InlineMediaProps {
  media?: string;
  poster?: string;
  productName: string;
  index: number;
  video: boolean;
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  isAnimating: boolean;
  isLoading: boolean;
  onLoad: () => void;
  onFallback: (image: HTMLImageElement) => void;
}

function InlineMedia({ media, poster, productName, index, video, zoom, pan, isPanning, isAnimating, isLoading, onLoad, onFallback }: InlineMediaProps) {
  if (video) return <video src={media} controls className="w-full h-full object-contain animate-fade-in" poster={poster} />;
  return (
    <>
      <div className="absolute inset-0 bg-white" />
      <img src={getCdnUrl(media ?? "", "large")} alt={`${productName} - Imagem ${index + 1}`} title={productName} className={cn("w-full h-full object-contain transition-all duration-700 ease-out", zoom > 1 && "cursor-grab", isPanning && "cursor-grabbing", isAnimating && "scale-95 opacity-80", isLoading ? "opacity-40 blur-md scale-105" : "opacity-100 blur-0 scale-100")} style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }} draggable={false} onLoad={onLoad} onError={(event) => onFallback(event.currentTarget)} />
    </>
  );
}

function GalleryOverlays({ productVideos, mediaCount, selectedIndex, onOpenVideo, onPrevious, onNext, onFullscreen }: { productVideos: ProductVideo[]; mediaCount: number; selectedIndex: number; onOpenVideo: () => void; onPrevious: () => void; onNext: () => void; onFullscreen: () => void }) {
  return (
    <>
      {productVideos.length > 0 && <button onClick={onOpenVideo} className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-2 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-fade-in"><Play className="h-4 w-4 fill-white" /><span className="text-xs font-semibold">{productVideos.length > 1 ? `${productVideos.length} vídeos` : "Vídeo"}</span></button>}
      {mediaCount > 1 && <><Button variant="secondary" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 hover:bg-card hover:scale-110 hover:shadow-2xl transition-all duration-300" onClick={onPrevious} aria-label="Voltar"><ChevronLeft className="h-6 w-6" /></Button><Button variant="secondary" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 hover:bg-card hover:scale-110 hover:shadow-2xl transition-all duration-300" onClick={onNext} aria-label="Avançar"><ChevronRight className="h-6 w-6" /></Button></>}
      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 delay-100"><Button variant="secondary" size="icon" aria-label="Maximizar" className="h-10 w-10 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200" onClick={onFullscreen}><Maximize2 className="h-4 w-4" /></Button></div>
      <div className="absolute bottom-4 left-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"><div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/95 backdrop-blur-md shadow-xl border border-border/50"><span className="text-sm font-medium">{selectedIndex + 1} / {mediaCount}</span><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((selectedIndex + 1) / mediaCount) * 100}%` }} /></div></div></div>
    </>
  );
}

function MainGallery({ children, overlays, onMouseDown, onMouseMove, onMouseUp, onWheel }: { children: ReactNode; overlays: ReactNode; onMouseDown: (event: MouseEvent) => void; onMouseMove: (event: MouseEvent) => void; onMouseUp: () => void; onWheel: (event: WheelEvent) => void }) {
  return (
    <div className="relative group"><div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" /><div className="relative rounded-2xl overflow-hidden shadow-lg border border-border/30 group-hover:shadow-2xl group-hover:shadow-primary/10 group-hover:border-primary/20 transition-all duration-500"><div className="relative overflow-hidden aspect-[4/3] rounded-2xl bg-white" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} onWheel={onWheel}>{children}</div>{overlays}</div></div>
  );
}

function useGalleryState(mediaCount: number, selectedColorIndex: number) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const resetZoom = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);
  useEffect(() => { setSelectedIndex(0); resetZoom(); }, [selectedColorIndex, resetZoom]);
  useEffect(() => { setIsImageLoading(true); }, [selectedIndex]);
  const selectIndex = useCallback((index: number) => { setIsAnimating(true); setSelectedIndex(index); resetZoom(); setTimeout(() => setIsAnimating(false), 400); }, [resetZoom]);
  const goToPrevious = useCallback(() => selectIndex(selectedIndex === 0 ? mediaCount - 1 : selectedIndex - 1), [mediaCount, selectedIndex, selectIndex]);
  const goToNext = useCallback(() => selectIndex(selectedIndex === mediaCount - 1 ? 0 : selectedIndex + 1), [mediaCount, selectedIndex, selectIndex]);
  const zoomIn = useCallback(() => setZoom((value) => Math.min(value + 0.5, 4)), []);
  const zoomOut = useCallback(() => setZoom((value) => { const next = Math.max(value - 0.5, 1); if (next === 1) setPan({ x: 0, y: 0 }); return next; }), []);
  const mouseDown = useCallback((event: MouseEvent) => { if (zoom > 1) { setIsPanning(true); panStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y }; } }, [pan, zoom]);
  const mouseMove = useCallback((event: MouseEvent) => { if (isPanning && zoom > 1) { const maxPan = (zoom - 1) * 150; setPan({ x: Math.max(-maxPan, Math.min(maxPan, event.clientX - panStartRef.current.x)), y: Math.max(-maxPan, Math.min(maxPan, event.clientY - panStartRef.current.y)) }); } }, [isPanning, zoom]);
  const mouseUp = useCallback(() => setIsPanning(false), []);
  const wheel = useCallback((event: WheelEvent) => { if (!isFullscreen) return; event.preventDefault(); if (event.deltaY < 0) zoomIn(); else zoomOut(); }, [isFullscreen, zoomIn, zoomOut]);
  const keyDown = useCallback((event: KeyboardEvent) => { if (event.key === "ArrowLeft") goToPrevious(); if (event.key === "ArrowRight") goToNext(); if (event.key === "Escape") setIsFullscreen(false); if (event.key === "+" || event.key === "=") zoomIn(); if (event.key === "-") zoomOut(); }, [goToPrevious, goToNext, zoomIn, zoomOut]);
  return { selectedIndex, isFullscreen, setIsFullscreen, isVideoPlayerOpen, setIsVideoPlayerOpen, zoom, pan, isPanning, isImageLoading, setIsImageLoading, isAnimating, resetZoom, goToPrevious, goToNext, zoomIn, zoomOut, mouseDown, mouseMove, mouseUp, wheel, keyDown, selectIndex, setSelectedIndex };
}

export function ProductGallery({
  images, video, videos = [], productVideos = [], productName,
  colors, onColorSelect, selectedColorIndex = 0
}: ProductGalleryProps) {
  const selectedColor = colors?.[selectedColorIndex];
  const { displayImages, allMedia } = resolveGalleryMedia(selectedColor, images, video, videos);
  const isVideo = useCallback((index: number) => index >= displayImages.length, [displayImages.length]);
  const gallery = useGalleryState(allMedia.length, selectedColorIndex);

  return (
    <div className="space-y-4" onKeyDown={gallery.keyDown} tabIndex={0}>
      <MainGallery onMouseDown={gallery.mouseDown} onMouseMove={gallery.mouseMove} onMouseUp={gallery.mouseUp} onWheel={gallery.wheel} overlays={<GalleryOverlays productVideos={productVideos} mediaCount={allMedia.length} selectedIndex={gallery.selectedIndex} onOpenVideo={() => gallery.setIsVideoPlayerOpen(true)} onPrevious={gallery.goToPrevious} onNext={gallery.goToNext} onFullscreen={() => gallery.setIsFullscreen(true)} />}>
        <InlineMedia media={allMedia[gallery.selectedIndex]} poster={displayImages[0]} productName={productName} index={gallery.selectedIndex} video={isVideo(gallery.selectedIndex)} zoom={gallery.zoom} pan={gallery.pan} isPanning={gallery.isPanning} isAnimating={gallery.isAnimating} isLoading={gallery.isImageLoading} onLoad={() => gallery.setIsImageLoading(false)} onFallback={(image) => { const fallback = allMedia[gallery.selectedIndex]; if (!image.dataset.fallback && fallback) { image.dataset.fallback = "1"; image.src = fallback; } }} />
      </MainGallery>

      {/* Color Variations */}
      {colors && colors.length > 0 && (
        <GalleryColorVariations
          colors={colors}
          selectedColorIndex={selectedColorIndex}
          onColorSelect={(index) => { gallery.setSelectedIndex(0); gallery.resetZoom(); onColorSelect?.(index); }}
        />
      )}

      {/* Fullscreen Dialog */}
      <GalleryFullscreen
        open={gallery.isFullscreen} onOpenChange={gallery.setIsFullscreen}
        allMedia={allMedia} selectedIndex={gallery.selectedIndex} productName={productName}
        imageCount={displayImages.length} isVideo={isVideo}
        zoom={gallery.zoom} pan={gallery.pan} isPanning={gallery.isPanning} isImageLoading={gallery.isImageLoading} isAnimating={gallery.isAnimating}
        onZoomIn={gallery.zoomIn} onZoomOut={gallery.zoomOut} onResetZoom={gallery.resetZoom}
        onGoNext={gallery.goToNext} onGoPrevious={gallery.goToPrevious} onSelectIndex={gallery.selectIndex}
        onMouseDown={gallery.mouseDown} onMouseMove={gallery.mouseMove} onMouseUp={gallery.mouseUp}
        onWheel={gallery.wheel} onKeyDown={gallery.keyDown}
      />

      {/* Video Player Dialog */}
      <GalleryVideoPlayer
        productVideos={productVideos} productName={productName}
        open={gallery.isVideoPlayerOpen} onOpenChange={gallery.setIsVideoPlayerOpen}
      />
    </div>
  );
}
