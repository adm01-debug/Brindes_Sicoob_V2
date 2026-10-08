/**
 * PresentationMode — Fullscreen slideshow for quotes/collections.
 * Shows products one per slide with clean, client-facing visuals.
 * Hides prices, internal data, menus.
 */
import { useState, useEffect, useCallback, useRef, type RefObject } from "react";
import { ChevronLeft, ChevronRight, X, Maximize, Minimize, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PresentationSlide {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  description?: string | null;
  details?: { label: string; value: string }[];
  badge?: string | null;
}

interface PresentationModeProps {
  slides: PresentationSlide[];
  title: string;
  subtitle?: string;
  brandName?: string;
  onClose: () => void;
}

const TOP_BAR_BUTTON_CLASS = "p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors";
const HIDDEN_CLASS = "opacity-0";
const VISIBLE_CLASS = "opacity-100";

function useFullscreen(containerRef: RefObject<HTMLDivElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const exitFullscreen = useCallback(() => { void document.exitFullscreen?.(); }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void containerRef.current?.requestFullscreen?.();
  }, [containerRef]);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);
  return { isFullscreen, exitFullscreen, toggleFullscreen };
}

function useCursorHidden() {
  const [cursorHidden, setCursorHidden] = useState(false);
  const cursorTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const handleMouseMove = () => {
      setCursorHidden(false);
      clearTimeout(cursorTimer.current);
      cursorTimer.current = setTimeout(() => setCursorHidden(true), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(cursorTimer.current);
    };
  }, []);
  return cursorHidden;
}

function useBodyScrollLock() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
}

interface PresentationController {
  current: number;
  totalSlides: number;
  showGrid: boolean;
  isFullscreen: boolean;
  cursorHidden: boolean;
  goNext: () => void;
  goPrev: () => void;
  goTo: (index: number) => void;
  toggleGrid: () => void;
  closeGrid: () => void;
  toggleFullscreen: () => void;
}

interface KeyboardNavigationProps {
  controller: PresentationController;
  onClose: () => void;
  exitFullscreen: () => void;
}

function useKeyboardNavigation({ controller, onClose, exitFullscreen }: KeyboardNavigationProps) {
  useEffect(() => {
    const handleEscape = () => {
      if (controller.showGrid) controller.closeGrid();
      else if (controller.isFullscreen) exitFullscreen();
      else onClose();
    };
    const actions: Record<string, () => void> = {
      ArrowRight: controller.goNext, " ": controller.goNext, ArrowLeft: controller.goPrev,
      Escape: handleEscape, f: controller.toggleFullscreen, F: controller.toggleFullscreen,
      g: controller.toggleGrid, G: controller.toggleGrid, Home: () => controller.goTo(0),
      End: () => controller.goTo(controller.totalSlides - 1),
    };
    const handleKey = (event: KeyboardEvent) => {
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      action();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [controller, exitFullscreen, onClose]);
}

function usePresentationController(slideCount: number, onClose: () => void, containerRef: RefObject<HTMLDivElement>): PresentationController {
  const [current, setCurrent] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const totalSlides = slideCount + 1;
  const cursorHidden = useCursorHidden();
  const fullscreen = useFullscreen(containerRef);
  useBodyScrollLock();
  const closeGrid = useCallback(() => setShowGrid(false), []);
  const toggleGrid = useCallback(() => setShowGrid((visible) => !visible), []);
  const goNext = useCallback(() => { setCurrent((value) => Math.min(value + 1, totalSlides - 1)); closeGrid(); }, [closeGrid, totalSlides]);
  const goPrev = useCallback(() => { setCurrent((value) => Math.max(value - 1, 0)); closeGrid(); }, [closeGrid]);
  const goTo = useCallback((index: number) => { setCurrent(index); closeGrid(); }, [closeGrid]);
  const controller = { current, totalSlides, showGrid, cursorHidden, goNext, goPrev, goTo, closeGrid, toggleGrid, ...fullscreen };
  useKeyboardNavigation({ controller, onClose, exitFullscreen: fullscreen.exitFullscreen });
  return controller;
}

interface TopBarProps {
  label: string;
  onClose: () => void;
  controller: PresentationController;
}

function TopBar({ label, onClose, controller }: TopBarProps) {
  return <div className={cn("absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 transition-opacity duration-500", "bg-gradient-to-b from-black/60 to-transparent", controller.cursorHidden ? HIDDEN_CLASS : VISIBLE_CLASS)}><div className="text-white/80 text-sm font-medium">{label}</div><div className="flex items-center gap-2"><button onClick={controller.toggleGrid} className={TOP_BAR_BUTTON_CLASS} title="Grade de slides (G)"><Grid3X3 className="h-5 w-5" /></button><button onClick={controller.toggleFullscreen} className={TOP_BAR_BUTTON_CLASS} title="Tela cheia (F)">{controller.isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</button><button onClick={onClose} className={TOP_BAR_BUTTON_CLASS} title="Fechar (Esc)" aria-label="Fechar"><X className="h-5 w-5" /></button></div></div>;
}

function SlideThumbnail({ slide, index, current, goTo }: { slide: PresentationSlide; index: number; current: number; goTo: (index: number) => void }) {
  return <button onClick={() => goTo(index + 1)} className={cn("aspect-video rounded-lg border-2 overflow-hidden transition-all hover:scale-105 relative", current === index + 1 ? "border-primary ring-2 ring-primary/50" : "border-white/20")}>{slide.imageUrl ? <img src={slide.imageUrl} alt={slide.title} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center"><span className="text-white/40 text-xs">Sem imagem</span></div>}<div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2"><span className="text-white text-[10px] font-medium line-clamp-1">{slide.title}</span></div><div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">{index + 2}</div></button>;
}

function GridView({ slides, title, subtitle, controller }: Omit<PresentationModeProps, "brandName" | "onClose"> & { controller: PresentationController }) {
  return <div className="flex-1 overflow-auto p-8 pt-20"><div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto"><button onClick={() => controller.goTo(0)} className={cn("aspect-video rounded-lg border-2 overflow-hidden transition-all hover:scale-105", controller.current === 0 ? "border-primary ring-2 ring-primary/50" : "border-white/20")}><div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4"><span className="text-white text-xs font-bold text-center line-clamp-2">{title}</span>{subtitle && <span className="text-white/60 text-[10px] mt-1 text-center line-clamp-1">{subtitle}</span>}</div></button>{slides.map((slide, index) => <SlideThumbnail key={slide.id} slide={slide} index={index} current={controller.current} goTo={controller.goTo} />)}</div></div>;
}

function TitleSlide({ title, subtitle, brandName, count }: { title: string; subtitle?: string; brandName?: string; count: number }) {
  const countLabel = count === 1 ? "produto" : "produtos";
  return <div className="text-center max-w-3xl px-8 animate-fade-in"><h1 className="text-5xl md:text-7xl font-bold text-white font-display tracking-tight">{title}</h1>{subtitle && <p className="text-xl md:text-2xl text-white/60 mt-6">{subtitle}</p>}<div className="mt-12 flex items-center justify-center gap-3 text-white/40"><span className="text-sm">{count} {countLabel}</span><span className="w-1 h-1 rounded-full bg-white/30" /><span className="text-sm">Use ← → para navegar</span></div>{brandName && <p className="text-white/30 text-sm mt-8">{brandName}</p>}</div>;
}

function ProductSlide({ slide }: { slide: PresentationSlide }) {
  return <div className="w-full h-full flex items-center justify-center px-8 md:px-16 animate-fade-in"><div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 max-w-6xl w-full"><div className="flex-shrink-0 w-full md:w-1/2 max-h-[70vh] flex items-center justify-center">{slide.imageUrl ? <img src={slide.imageUrl} alt={slide.title} className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-2xl" loading="lazy" /> : <div className="w-80 h-80 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"><span className="text-white/20 text-lg">Sem imagem</span></div>}</div><div className="flex-1 text-left space-y-4 max-w-lg">{slide.badge && <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">{slide.badge}</span>}<h2 className="text-3xl md:text-4xl font-bold text-white font-display leading-tight">{slide.title}</h2>{slide.subtitle && <p className="text-lg text-white/50">{slide.subtitle}</p>}{slide.description && <p className="text-base text-white/60 leading-relaxed line-clamp-4">{slide.description}</p>}<SlideDetails details={slide.details} /></div></div></div>;
}

function SlideDetails({ details }: { details?: PresentationSlide["details"] }) {
  if (!details?.length) return null;
  return <div className="space-y-2 pt-4 border-t border-white/10">{details.map((detail, index) => <div key={`${detail.label}-${index}`} className="flex justify-between"><span className="text-white/40 text-sm">{detail.label}</span><span className="text-white/80 text-sm font-medium">{detail.value}</span></div>)}</div>;
}

function Navigation({ controller }: { controller: PresentationController }) {
  return <>{controller.current > 0 && <button onClick={controller.goPrev} className={cn("absolute left-4 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all", controller.cursorHidden ? HIDDEN_CLASS : VISIBLE_CLASS)} aria-label="Voltar"><ChevronLeft className="h-6 w-6" /></button>}{controller.current < controller.totalSlides - 1 && <button onClick={controller.goNext} className={cn("absolute right-4 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all", controller.cursorHidden ? HIDDEN_CLASS : VISIBLE_CLASS)} aria-label="Avançar"><ChevronRight className="h-6 w-6" /></button>}</>;
}

function ProgressBar({ controller }: { controller: PresentationController }) {
  const visible = !controller.cursorHidden || controller.showGrid;
  return <div className={cn("absolute bottom-0 inset-x-0 z-50 transition-opacity duration-500", visible ? VISIBLE_CLASS : HIDDEN_CLASS)}><div className="flex items-center justify-center gap-4 px-6 py-4 bg-gradient-to-t from-black/60 to-transparent"><span className="text-white/50 text-sm tabular-nums">{controller.current + 1} / {controller.totalSlides}</span><div className="flex gap-1.5">{Array.from({ length: controller.totalSlides }, (_, index) => <button key={index} onClick={() => controller.goTo(index)} className={cn("h-1.5 rounded-full transition-all", index === controller.current ? "w-8 bg-primary" : "w-1.5 bg-white/30 hover:bg-white/50")} />)}</div></div></div>;
}

export function PresentationMode({ slides, title, subtitle, brandName, onClose }: PresentationModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controller = usePresentationController(slides.length, onClose, containerRef);
  const slide = controller.current === 0 ? null : slides[controller.current - 1];

  return (
    <div ref={containerRef} className={cn("fixed inset-0 z-[9999] bg-black flex flex-col select-none", controller.cursorHidden && "cursor-none")}>
      <TopBar label={brandName || title} onClose={onClose} controller={controller} />
      {controller.showGrid ? <GridView slides={slides} title={title} subtitle={subtitle} controller={controller} /> : <div className="flex-1 flex items-center justify-center relative"><Navigation controller={controller} />{controller.current === 0 && <TitleSlide title={title} subtitle={subtitle} brandName={brandName} count={slides.length} />}{slide && <ProductSlide slide={slide} />}</div>}
      <ProgressBar controller={controller} />
    </div>
  );
}
