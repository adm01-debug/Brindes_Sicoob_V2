/**
 * ZoomableGallery — Refactored orchestrator
 * Hook + sub-components extracted.
 */
import { useState, useRef, useCallback, type RefObject } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useGalleryZoom } from "./zoomable-gallery/useGalleryZoom";
import { GalleryToolbar } from "./zoomable-gallery/GalleryToolbar";
import { GalleryThumbnails, FullscreenThumbnails } from "./zoomable-gallery/GalleryThumbnails";

interface ZoomableGalleryProps {
  images: string[];
  productName: string;
  className?: string;
  onShare?: (imageUrl: string) => void;
  onDownload?: (imageUrl: string) => void;
}

function imageAction(handler: ((image: string) => void) | undefined, image: string | undefined) {
  if (!handler || !image) return undefined;
  return () => handler(image);
}

type GalleryZoom = ReturnType<typeof useGalleryZoom>;

function ImageViewer({ gallery, images, productName, containerRef, onPan, fullscreen = false }: { gallery: GalleryZoom; images: string[]; productName: string; containerRef: RefObject<HTMLDivElement>; onPan: (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void; fullscreen?: boolean }) {
  return (
    <motion.div ref={containerRef} className={cn("relative overflow-hidden", fullscreen ? "w-full h-full" : "aspect-square rounded-2xl")} onWheel={gallery.handleWheel}>
      <motion.img src={images[gallery.currentIndex]} alt={`${productName} - ${gallery.currentIndex + 1}`} className={cn("w-full h-full object-contain select-none", gallery.zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in")} style={{ scale: gallery.scale, x: gallery.x, y: gallery.y, rotate: gallery.rotation }} drag={gallery.zoom > 1} dragConstraints={{ left: -100, right: 100, top: -100, bottom: 100 }} dragElastic={0.1} onPan={onPan} onTap={gallery.handleTap} draggable={false} />
      <AnimatePresence>{gallery.zoom > 1 && <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-sm text-sm font-medium shadow-lg">{Math.round(gallery.zoom * 100)}%</motion.div>}</AnimatePresence>
    </motion.div>
  );
}

function InlineGallery({ gallery, images, productName, className, containerRef, onPan, openFullscreen }: { gallery: GalleryZoom; images: string[]; productName: string; className?: string; containerRef: RefObject<HTMLDivElement>; onPan: Parameters<typeof ImageViewer>[0]["onPan"]; openFullscreen: () => void }) {
  return (
    <div className={cn("space-y-4", className)}><div className="relative group"><div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg group-hover:shadow-xl transition-shadow"><ImageViewer gallery={gallery} images={images} productName={productName} containerRef={containerRef} onPan={onPan} /></div>
      {images.length > 1 && <><Button variant="ghost" size="icon" className={cn("absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full", "bg-black/30 hover:bg-black/50 backdrop-blur-sm text-primary-foreground/80 hover:text-primary-foreground transition-all duration-200 border-0")} onClick={gallery.goToPrevious} aria-label="Voltar"><ChevronLeft className="h-6 w-6" /></Button><Button variant="ghost" size="icon" className={cn("absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full", "bg-black/30 hover:bg-black/50 backdrop-blur-sm text-primary-foreground/80 hover:text-primary-foreground transition-all duration-200 border-0")} onClick={gallery.goToNext} aria-label="Avançar"><ChevronRight className="h-6 w-6" /></Button></>}
      <div className={cn("absolute bottom-4 right-4 flex gap-2", "opacity-0 group-hover:opacity-100 transition-opacity")}><Button variant="secondary" size="icon" aria-label="Maximizar" className="h-9 w-9 rounded-full bg-card/90 backdrop-blur-sm shadow-lg" onClick={openFullscreen}><Maximize2 className="h-4 w-4" /></Button></div>
      {images.length > 1 && <div className={cn("absolute bottom-4 left-4 px-3 py-1.5 rounded-full", "bg-card/90 backdrop-blur-sm shadow-lg text-sm font-medium")}>{gallery.currentIndex + 1} / {images.length}</div>}
    </div>{images.length > 1 && <GalleryThumbnails images={images} currentIndex={gallery.currentIndex} onSelect={gallery.setCurrentIndex} />}</div>
  );
}

function FullscreenGallery({ open, setOpen, showThumbnails, setShowThumbnails, gallery, images, productName, containerRef, onPan, onShare, onDownload }: { open: boolean; setOpen: (open: boolean) => void; showThumbnails: boolean; setShowThumbnails: (show: boolean) => void; gallery: GalleryZoom; images: string[]; productName: string; containerRef: RefObject<HTMLDivElement>; onPan: Parameters<typeof ImageViewer>[0]["onPan"]; onShare?: (url: string) => void; onDownload?: (url: string) => void }) {
  const currentImage = images[gallery.currentIndex];
  return (
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-background/98 backdrop-blur-xl"><div className="relative w-full h-full flex flex-col">
      <GalleryToolbar zoom={gallery.zoom} onZoomIn={gallery.handleZoomIn} onZoomOut={gallery.handleZoomOut} onRotate={gallery.handleRotate} onReset={gallery.resetView} onClose={() => setOpen(false)} onShare={imageAction(onShare, currentImage)} onDownload={imageAction(onDownload, currentImage)} />
      <div className="flex-1 flex items-center justify-center p-16"><ImageViewer gallery={gallery} images={images} productName={productName} containerRef={containerRef} onPan={onPan} fullscreen /></div>
      {images.length > 1 && <><Button variant="secondary" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/90 shadow-lg" onClick={gallery.goToPrevious} aria-label="Voltar"><ChevronLeft className="h-6 w-6" /></Button><Button variant="secondary" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-card/90 shadow-lg" onClick={gallery.goToNext} aria-label="Avançar"><ChevronRight className="h-6 w-6" /></Button></>}
      <AnimatePresence>{showThumbnails && images.length > 1 && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent"><FullscreenThumbnails images={images} currentIndex={gallery.currentIndex} onSelect={gallery.setCurrentIndex} /></motion.div>}</AnimatePresence>
      <Button variant="ghost" size="sm" className="absolute bottom-4 right-4 rounded-full" onClick={() => setShowThumbnails(!showThumbnails)}>{showThumbnails ? "Ocultar" : "Mostrar"} miniaturas</Button>
    </div></DialogContent></Dialog>
  );
}

export function ZoomableGallery({ images, productName, className, onShare, onDownload }: ZoomableGalleryProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const g = useGalleryZoom(images, isFullscreen);

  const handlePan = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (g.zoom > 1) {
      const maxOffset = (g.zoom - 1) * 100;
      g.x.set(Math.max(-maxOffset, Math.min(maxOffset, g.x.get() + info.delta.x)));
      g.y.set(Math.max(-maxOffset, Math.min(maxOffset, g.y.get() + info.delta.y)));
    }
  }, [g.x, g.y, g.zoom]);

  return (
    <>
      <InlineGallery gallery={g} images={images} productName={productName} className={className} containerRef={containerRef} onPan={handlePan} openFullscreen={() => setIsFullscreen(true)} />
      <FullscreenGallery open={isFullscreen} setOpen={setIsFullscreen} showThumbnails={showThumbnails} setShowThumbnails={setShowThumbnails} gallery={g} images={images} productName={productName} containerRef={containerRef} onPan={handlePan} onShare={onShare} onDownload={onDownload} />
    </>
  );
}
