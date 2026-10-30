/**
 * QuoteBuilderStepper — Indicador visual de progresso para o fluxo de orçamento
 * 4 etapas: Cliente → Itens → Condições → Revisão
 */

import { Check, Building2, Package, CreditCard, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuoteBuilderStep = "client" | "items" | "conditions" | "review";

interface StepDef {
  id: QuoteBuilderStep;
  label: string;
  icon: typeof Building2;
}

const STEPS: StepDef[] = [
  { id: "client", label: "Cliente", icon: Building2 },
  { id: "items", label: "Itens", icon: Package },
  { id: "conditions", label: "Condições", icon: CreditCard },
  { id: "review", label: "Revisão", icon: FileCheck },
];

interface QuoteBuilderStepperProps {
  /** Which fields have been filled — drives completed state */
  completedSteps: QuoteBuilderStep[];
  /** Optional: highlight a specific step */
  activeStep?: QuoteBuilderStep;
  className?: string;
}

function stepCircleClass(completed: boolean, active: boolean) {
  return cn(
    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
    completed && !active && "bg-primary/20 border-primary text-primary",
    active && "bg-primary border-primary text-primary-foreground scale-110 shadow-md",
    !completed && !active && "bg-muted/50 border-border text-muted-foreground",
  );
}

function stepLabelClass(completed: boolean, active: boolean) {
  return cn(
    "text-xs font-medium transition-colors whitespace-nowrap",
    active && "text-primary",
    completed && !active && "text-foreground",
    !active && !completed && "text-muted-foreground",
  );
}

function StepIcon({ step, completed, active }: { step: StepDef; completed: boolean; active: boolean }) {
  if (completed && !active) return <Check className="h-4 w-4" />;
  const Icon = step.icon;
  return <Icon className="h-4 w-4" />;
}

function StepConnector({ visible, completed }: { visible: boolean; completed: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex-1 h-0.5 mx-3 mt-[-1rem]">
      <div className={cn("h-full rounded-full transition-colors", completed ? "bg-primary" : "bg-border")} />
    </div>
  );
}

function StepIndicator({
  step,
  index,
  completed,
  active,
}: {
  step: StepDef;
  index: number;
  completed: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center flex-1">
      <div className="flex flex-col items-center gap-1.5">
        <div className={stepCircleClass(completed, active)}>
          <StepIcon step={step} completed={completed} active={active} />
        </div>
        <span className={stepLabelClass(completed, active)}>
          {step.label}
        </span>
      </div>
      <StepConnector visible={index < STEPS.length - 1} completed={completed} />
    </div>
  );
}

export function QuoteBuilderStepper({
  completedSteps,
  activeStep,
  className,
}: QuoteBuilderStepperProps) {
  return (
    <div data-testid="quote-wizard" role="tablist" className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isActive = step.id === activeStep;
          return <StepIndicator key={step.id} step={step} index={index} completed={isCompleted} active={isActive} />;
        })}
      </div>
    </div>
  );
}
