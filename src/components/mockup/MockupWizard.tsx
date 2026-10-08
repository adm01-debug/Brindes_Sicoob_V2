import { type KeyboardEvent, type ReactNode, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Package, Paintbrush, Upload, Move, Sparkles, Building2 } from "lucide-react";

interface MockupWizardStep {
  id: number;
  label: string;
  description: string;
  icon: ReactNode;
  isCompleted: boolean;
  isActive: boolean;
}

interface MockupWizardProps {
  currentStep: number;
  hasClient: boolean;
  hasProduct: boolean;
  hasTechnique: boolean;
  hasLogo: boolean;
  hasPositioned: boolean;
  hasGenerated: boolean;
  className?: string;
  onStepClick?: (step: number) => void;
}

function WizardStepCircle({ step, clickable }: { step: MockupWizardStep; clickable: boolean }) {
  const stateClass = step.isCompleted ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25" : step.isActive ? "bg-background border-primary text-primary ring-4 ring-primary/20 animate-pulse" : "bg-muted border-muted-foreground/30 text-muted-foreground";
  return <div className={cn("flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300", "font-semibold text-sm", stateClass, clickable ? "group-hover/step:scale-110 group-hover/step:shadow-lg transition-transform" : undefined)}>{step.isCompleted ? <CheckCircle2 className="h-5 w-5" /> : step.icon}</div>;
}

function WizardStepLabel({ step, clickable }: { step: MockupWizardStep; clickable: boolean }) {
  const stateClass = step.isActive ? "text-primary" : step.isCompleted ? "text-foreground" : "text-muted-foreground";
  return <div className="mt-2 text-center max-w-[100px]"><p className={cn("text-xs font-medium transition-colors", stateClass, clickable ? "group-hover/step:text-primary" : undefined)}>{step.label}</p><p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{step.description}</p></div>;
}

function DesktopWizardStep({ step, currentStep, onStepClick }: { step: MockupWizardStep; currentStep: number; onStepClick?: (step: number) => void }) {
  const clickable = Boolean(onStepClick) && (step.isCompleted || step.id <= currentStep);
  const activate = () => { if (clickable) onStepClick?.(step.id); };
  const handleKey = (event: KeyboardEvent) => { if (clickable && event.key === "Enter") onStepClick?.(step.id); };
  return <div className={cn("relative z-10 flex flex-col items-center", "flex-1 first:flex-initial last:flex-initial", clickable ? "cursor-pointer group/step" : undefined)} onClick={activate} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined} onKeyDown={handleKey}><WizardStepCircle step={step} clickable={clickable} /><WizardStepLabel step={step} clickable={clickable} /></div>;
}

export const MockupWizard = forwardRef<HTMLDivElement, MockupWizardProps>(function MockupWizard({
  currentStep,
  hasClient,
  hasProduct,
  hasTechnique,
  hasLogo,
  hasPositioned,
  hasGenerated,
  className,
  onStepClick,
}, ref) {
  const steps: MockupWizardStep[] = [
    {
      id: 1,
      label: "Empresa",
      description: "Selecione o cliente",
      icon: <Building2 className="h-4 w-4" />,
      isCompleted: hasClient,
      isActive: currentStep === 1,
    },
    {
      id: 2,
      label: "Produto",
      description: "Escolha o produto",
      icon: <Package className="h-4 w-4" />,
      isCompleted: hasProduct,
      isActive: currentStep === 2,
    },
    {
      id: 3,
      label: "Técnica",
      description: "Método de personalização",
      icon: <Paintbrush className="h-4 w-4" />,
      isCompleted: hasTechnique,
      isActive: currentStep === 3,
    },
    {
      id: 4,
      label: "Logo",
      description: "Faça upload da arte",
      icon: <Upload className="h-4 w-4" />,
      isCompleted: hasLogo,
      isActive: currentStep === 4,
    },
    {
      id: 5,
      label: "Posição",
      description: "Ajuste o posicionamento",
      icon: <Move className="h-4 w-4" />,
      isCompleted: hasPositioned && hasLogo,
      isActive: currentStep === 5,
    },
    {
      id: 6,
      label: "Gerar",
      description: "Crie o mockup com IA",
      icon: <Sparkles className="h-4 w-4" />,
      isCompleted: hasGenerated,
      isActive: currentStep === 6,
    },
  ];

  // Calculate progress
  const completedSteps = steps.filter((s) => s.isCompleted).length;
  const progressPercent = (completedSteps / steps.length) * 100;
  const remainingSteps = steps.length - completedSteps;

  // Dynamic microcopy based on progress
  const getMicrocopy = () => {
    if (completedSteps === 0) return "Vamos começar! Escolha um produto.";
    if (remainingSteps === 1) return "🎯 Falta só 1 passo!";
    if (remainingSteps === 2) return "💪 Quase lá! Mais 2 passos.";
    if (completedSteps === steps.length) return "🎉 Tudo pronto! Clique em Gerar.";
    return `${completedSteps} de ${steps.length} etapas concluídas`;
  };

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {/* Desktop Stepper */}
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between">
          {/* Progress line background */}
          <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-muted" />
          
          {/* Progress line filled */}
          <div
            className="absolute top-5 left-[5%] h-0.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent * 0.9}%` }}
          />

          {steps.map((step) => <DesktopWizardStep key={step.id} step={step} currentStep={currentStep} onStepClick={onStepClick} />)}
        </div>
      </div>

      {/* Mobile Stepper - Progress Bar Style */}
      <div className="md:hidden space-y-3">
        {/* Progress Bar */}
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Current Step Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full",
                "bg-primary/10 text-primary"
              )}
            >
              {steps[currentStep - 1]?.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {steps[currentStep - 1]?.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {steps[currentStep - 1]?.description}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-primary animate-pulse">
              {getMicrocopy()}
            </p>
            <p className="text-xs text-muted-foreground">
              Passo {currentStep} de {steps.length}
            </p>
          </div>
        </div>

        {/* Step Pills */}
        <div className="flex items-center justify-center gap-1.5">
          {steps.map((step) => (
            <div
              key={step.id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step.isActive ? "w-6 bg-primary" : "w-1.5",
                step.isCompleted && "bg-primary",
                !step.isCompleted && !step.isActive && "bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
