import { useEffect, useState, useCallback, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, SkipForward, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingContext } from "@/contexts/OnboardingContext";
import { useNavigate, useLocation } from "react-router-dom";

interface TooltipPosition { top?: number; left?: number; right?: number; bottom?: number }
type TourContext = ReturnType<typeof useOnboardingContext>;
const TOOLTIP_WIDTH = 320;
const TOOLTIP_HEIGHT = 200;
const TOOLTIP_PADDING = 16;

function positionFor(rect: DOMRect, position: string): TooltipPosition {
  if (position === "right") return { top: rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2, left: rect.right + TOOLTIP_PADDING };
  if (position === "left") return { top: rect.top + rect.height / 2 - TOOLTIP_HEIGHT / 2, left: rect.left - TOOLTIP_WIDTH - TOOLTIP_PADDING };
  if (position === "bottom") return { top: rect.bottom + TOOLTIP_PADDING, left: rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2 };
  return { top: rect.top - TOOLTIP_HEIGHT - TOOLTIP_PADDING, left: rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2 };
}

function clampPosition(position: TooltipPosition): TooltipPosition {
  const maxLeft = window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_PADDING;
  const maxTop = window.innerHeight - TOOLTIP_HEIGHT - TOOLTIP_PADDING;
  return { ...position, left: Math.max(TOOLTIP_PADDING, Math.min(position.left ?? TOOLTIP_PADDING, maxLeft)),
    top: Math.max(TOOLTIP_PADDING, Math.min(position.top ?? TOOLTIP_PADDING, maxTop)) };
}

function centeredPosition(): TooltipPosition {
  return { top: window.innerHeight / 2 - TOOLTIP_HEIGHT / 2, left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2 };
}

function useTourPosition(tour: TourContext) {
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition>({});
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const updatePositions = useCallback(() => {
    if (!tour.currentStepData) return;
    const target = document.querySelector(tour.currentStepData.targetSelector);
    if (!target) { setHighlightRect(null); setTooltipPosition(centeredPosition()); return; }
    const rect = target.getBoundingClientRect();
    setHighlightRect(rect);
    setTooltipPosition(clampPosition(positionFor(rect, tour.currentStepData.position)));
  }, [tour.currentStepData]);
  useEffect(() => {
    if (!tour.showTour) return;
    const checkTarget = () => {
      if (!tour.currentStepData) return;
      if (!document.querySelector(tour.currentStepData.targetSelector)) console.warn(`[onboarding] Target not found: ${tour.currentStepData.targetSelector}. Step: ${tour.currentStep + 1}`);
      updatePositions();
    };
    const timer = setTimeout(checkTarget, 100);
    window.addEventListener("resize", updatePositions);
    window.addEventListener("scroll", updatePositions);
    return () => { clearTimeout(timer); window.removeEventListener("resize", updatePositions); window.removeEventListener("scroll", updatePositions); };
  }, [tour.showTour, tour.currentStep, tour.currentStepData, updatePositions]);
  return { tooltipPosition, highlightRect };
}

function normalizeRoute(route: string) { return route.replace(/\/$/, '') || '/'; }
function equivalentRoute(current: string, target: string) {
  if (current === target) return true;
  const mockupRoutes = new Set(['/mockup', '/mockup-generator']);
  return mockupRoutes.has(current) && mockupRoutes.has(target);
}

function useTourRoute(tour: TourContext) {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!tour.showTour || !tour.currentStepData?.route) return;
    const current = normalizeRoute(location.pathname);
    const target = normalizeRoute(tour.currentStepData.route);
    if (!equivalentRoute(current, target)) navigate(tour.currentStepData.route, { replace: true });
  }, [tour.showTour, tour.currentStepData?.route, location.pathname, navigate]);
}

function TourOverlay({ rect }: { rect: DOMRect | null }) {
  const background = rect ? `radial-gradient(ellipse ${rect.width + 40}px ${rect.height + 40}px at ${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px, transparent 0%, rgba(0, 0, 0, 0.75) 100%)` : "rgba(0, 0, 0, 0.75)";
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 pointer-events-auto" style={{ background }} onClick={event => event.stopPropagation()} />;
}

function TargetHighlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;
  return <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute border-2 border-primary rounded-lg pointer-events-none"
    style={{ top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8,
      boxShadow: "0 0 0 4px rgba(var(--primary), 0.2), 0 0 20px rgba(var(--primary), 0.4)" }} />;
}

function TourHeader({ tour }: { tour: TourContext }) {
  return <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><span className="text-xs font-medium text-muted-foreground">Passo {tour.currentStep + 1} de {tour.totalSteps}</span></div>
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={tour.skipTour} aria-label="Fechar"><X className="h-4 w-4" /></Button>
  </div>;
}

function TourActions({ tour }: { tour: TourContext }) {
  const lastStep = tour.currentStep === tour.totalSteps - 1;
  return <div className="px-4 pb-4 flex items-center justify-between gap-2"><Button variant="ghost" size="sm" onClick={tour.skipTour} className="text-muted-foreground"><SkipForward className="h-4 w-4 mr-1" />Pular</Button>
    <div className="flex items-center gap-2">{tour.currentStep > 0 && <Button variant="outline" size="sm" onClick={tour.prevStep}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button>}
      <Button size="sm" onClick={tour.nextStep}>{lastStep ? "Concluir" : "Próximo"}{!lastStep && <ChevronRight className="h-4 w-4 ml-1" />}</Button>
    </div></div>;
}

function TourTooltip({ tour, position }: { tour: TourContext; position: TooltipPosition }) {
  if (!tour.currentStepData) return null;
  const progress = `${((tour.currentStep + 1) / tour.totalSteps) * 100}%`;
  return <motion.div key={tour.currentStep} initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.2 }} className="absolute w-80 pointer-events-auto" style={{ top: position.top, left: position.left }}>
    <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden"><TourHeader tour={tour} />
      <div className="p-4"><h3 className="font-display text-lg font-semibold text-foreground mb-2">{tour.currentStepData.title}</h3><p className="text-sm text-muted-foreground leading-relaxed">{tour.currentStepData.description}</p></div>
      <div className="px-4 pb-2"><div className="h-1 bg-muted rounded-full overflow-hidden"><motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: progress }} transition={{ duration: 0.3 }} /></div></div>
      <TourActions tour={tour} />
    </div>
  </motion.div>;
}

export const OnboardingTour = forwardRef<HTMLDivElement, unknown>(function OnboardingTour(_props, ref) {
  const tour = useOnboardingContext();
  useTourRoute(tour);
  // Esc pula o tour (mesmo comportamento do botão "Pular").
  useEffect(() => {
    if (!tour.showTour) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        void tour.skipTour();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [tour]);
  const position = useTourPosition(tour);
  return <div ref={ref}><AnimatePresence>{tour.showTour && tour.currentStepData && <div data-testid="onboarding-tour" className="fixed inset-0 z-[100] pointer-events-none">
    <TourOverlay rect={position.highlightRect} /><TargetHighlight rect={position.highlightRect} /><TourTooltip tour={tour} position={position.tooltipPosition} />
  </div>}</AnimatePresence></div>;
});
