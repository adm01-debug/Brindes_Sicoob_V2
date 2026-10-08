import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Wand2, Palette, Layers, Cpu, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GeneratingOverlayProps {
  isVisible: boolean;
  productName?: string;
  techniqueName?: string;
}

const GENERATION_STEPS = [
  { icon: Layers, label: "Analisando produto", duration: 1500 },
  { icon: Palette, label: "Aplicando técnica", duration: 2000 },
  { icon: Wand2, label: "Posicionando logo", duration: 1500 },
  { icon: Cpu, label: "Gerando com IA", duration: 3000 },
  { icon: Sparkles, label: "Finalizando", duration: 1000 },
];

const TOTAL_DURATION = GENERATION_STEPS.reduce((total, step) => total + step.duration, 0);

function stepAt(elapsedTime: number) {
  let accumulatedTime = 0;
  const index = GENERATION_STEPS.findIndex((step) => {
    accumulatedTime += step.duration;
    return elapsedTime < accumulatedTime;
  });
  return index < 0 ? GENERATION_STEPS.length - 1 : index;
}

function useGenerationProgress(isVisible: boolean) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }
    let elapsedTime = 0;
    const interval = setInterval(() => {
      elapsedTime += 100;
      setProgress(Math.min((elapsedTime / TOTAL_DURATION) * 100, 95));
      setCurrentStep(stepAt(elapsedTime));
    }, 100);
    return () => clearInterval(interval);
  }, [isVisible]);
  return { currentStep, progress };
}

function AnimatedDots() {
  return (
    <div className="ml-auto flex gap-1">
      {["0ms", "150ms", "300ms"].map((delay) => (
        <span key={delay} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: delay }} />
      ))}
    </div>
  );
}

interface GenerationStepProps {
  step: (typeof GENERATION_STEPS)[number];
  index: number;
  currentStep: number;
}

function GenerationStep({ step, index, currentStep }: GenerationStepProps) {
  const StepIcon = step.icon;
  const status = index < currentStep ? "complete" : index === currentStep ? "current" : "pending";
  const rowClass = { complete: "opacity-60", current: "bg-primary/10", pending: "" }[status];
  const iconClass = {
    complete: "bg-success text-success-foreground",
    current: "bg-primary text-primary-foreground animate-pulse",
    pending: "bg-muted text-muted-foreground",
  }[status];
  return (
    <div className={cn("flex items-center gap-3 p-2 rounded-lg transition-all duration-300", rowClass)}>
      <div className={cn("flex items-center justify-center w-8 h-8 rounded-full transition-all duration-300", iconClass)}>
        {status === "complete" ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
      </div>
      <span className={cn("text-sm transition-colors duration-300", status === "current" ? "font-medium text-foreground" : "text-muted-foreground")}>{step.label}</span>
      {status === "current" && <AnimatedDots />}
    </div>
  );
}

function OverlayHeader({ currentStep, productName, techniqueName }: { currentStep: number; productName?: string; techniqueName?: string }) {
  const CurrentIcon = GENERATION_STEPS[currentStep]?.icon ?? Sparkles;
  const description = productName && techniqueName ? `${productName} com ${techniqueName}` : "Processando sua imagem...";
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 relative">
        <CurrentIcon className="h-10 w-10 text-primary animate-bounce" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse-ring" />
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground mb-1">Gerando Mockup</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function GeneratingOverlay({
  isVisible,
  productName,
  techniqueName,
}: GeneratingOverlayProps) {
  const { currentStep, progress } = useGenerationProgress(isVisible);

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-background/80 backdrop-blur-md",
        "animate-fade-in"
      )}
      role="alert"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative max-w-md w-full mx-4 p-8 rounded-2xl bg-card border shadow-2xl animate-scale-in">
        {/* Decorative background elements */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        <div className="relative space-y-6">
          <OverlayHeader currentStep={currentStep} productName={productName} techniqueName={techniqueName} />

          {/* Progress */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-center text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {GENERATION_STEPS.map((step, index) => <GenerationStep key={step.label} step={step} index={index} currentStep={currentStep} />)}
          </div>

          {/* Tip */}
          <p className="text-[10px] text-center text-muted-foreground">
            Isso pode levar alguns segundos...
          </p>
        </div>
      </div>
    </div>
  );
}
