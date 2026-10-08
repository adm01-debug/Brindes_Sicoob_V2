/**
 * HorizontalStepper — Stepper visual for product form wizard
 */
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import type { ProductFormData } from './ProductFormSchema';

export type StepId = 'essentials' | 'commercial' | 'packaging' | 'fiscal' | 'engraving' | 'classification' | 'kits' | 'media' | 'content';

export interface StepDef {
  id: StepId;
  label: string;
  description: string;
  icon: React.ElementType;
  requiredFields: (keyof ProductFormData)[];
  fieldLabels: Record<string, string>;
}

interface HorizontalStepperProps {
  steps: StepDef[];
  activeIndex: number;
  stepReady: boolean[];
  stepErrors: number[];
  onStepClick: (i: number) => void;
  missingFields: string[][];
  showValidation: boolean;
}

interface StepState {
  active: boolean;
  done: boolean;
  errorCount: number;
  missing: string[];
}

interface StepStateInput {
  index: number;
  activeIndex: number;
  stepReady: boolean[];
  stepErrors: number[];
  missingFields: string[][];
  showValidation: boolean;
}

function getStepState({ index, activeIndex, stepReady, stepErrors, missingFields, showValidation }: StepStateInput): StepState {
  return {
    active: index === activeIndex,
    done: Boolean(stepReady[index]),
    errorCount: stepErrors[index] ?? 0,
    missing: showValidation ? (missingFields[index] ?? []) : [],
  };
}

function stepAriaLabel(step: StepDef, state: StepState): string {
  if (state.done) return `${step.label}: completo`;
  if (state.missing.length > 0) return `${step.label}: campos pendentes`;
  return `${step.label}: incompleto`;
}

function StepIcon({ icon, state }: { icon: React.ElementType; state: StepState }) {
  if (state.done && !state.active) return <CheckCircle2 className="h-5 w-5" />;
  return React.createElement(icon, { className: "h-4 w-4" });
}

function stepToneClass(state: StepState): string {
  if (state.active) return "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 shadow-lg shadow-primary/25 scale-110";
  if (state.done) return "bg-primary/20 border-primary text-primary shadow-md shadow-primary/15";
  return "bg-muted border-muted-foreground/30 text-muted-foreground";
}

function stepAttentionClass(state: StepState): string | undefined {
  if (state.active) return undefined;
  if (state.errorCount > 0) return "border-destructive ring-2 ring-destructive/20";
  if (state.missing.length > 0) return "border-warning ring-2 ring-warning/20";
  return undefined;
}

function stepLabelClass(state: StepState): string {
  if (state.active) return "text-primary";
  if (state.done) return "text-foreground";
  return "text-muted-foreground";
}

function StepIndicator({ state }: { state: StepState }) {
  if (state.errorCount > 0) {
    return <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">{state.errorCount}</span>;
  }
  if (state.missing.length > 0) {
    return <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[9px] font-bold text-primary-foreground">{state.missing.length}</span>;
  }
  return null;
}

function MissingFieldsTooltip({ visible, fields }: { visible: boolean; fields: string[] }) {
  if (!visible || fields.length === 0) return null;
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-max max-w-[220px] rounded-lg border border-border bg-popover p-2.5 shadow-lg animate-fade-in">
      <p className="text-[10px] font-semibold text-warning mb-1.5">Campos obrigatórios:</p>
      <ul className="space-y-0.5">
        {fields.map(label => <li key={label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><AlertCircle className="h-3 w-3 text-warning shrink-0" />{label}</li>)}
      </ul>
    </div>
  );
}

function DesktopStep({ step, index, state, hovered, stepCount, onStepClick, onHover }: {
  step: StepDef;
  index: number;
  state: StepState;
  hovered: boolean;
  stepCount: number;
  onStepClick: (index: number) => void;
  onHover: (index: number | null) => void;
}) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onStepClick(index); }
    if (event.key === 'ArrowRight' && index < stepCount - 1) { event.preventDefault(); onStepClick(index + 1); }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); onStepClick(index - 1); }
  };
  return (
    <div
      className={cn("relative z-10 flex flex-col items-center", "flex-1 first:flex-initial last:flex-initial", "cursor-pointer group/step")}
      onClick={() => onStepClick(index)} onMouseEnter={() => onHover(index)} onMouseLeave={() => onHover(null)}
      role="tab" aria-selected={state.active} aria-label={stepAriaLabel(step, state)} tabIndex={state.active ? 0 : -1} onKeyDown={handleKeyDown}
    >
      <div className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 font-semibold text-sm",
        stepToneClass(state),
        stepAttentionClass(state),
        "group-hover/step:scale-110 group-hover/step:shadow-lg transition-transform",
      )}>
        <StepIcon icon={step.icon} state={state} />
        <StepIndicator state={state} />
      </div>
      <div className="mt-2 text-center max-w-[100px]">
        <p className={cn("text-xs font-medium transition-colors", stepLabelClass(state), "group-hover/step:text-primary")}>{step.label}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{step.description}</p>
      </div>
      <MissingFieldsTooltip visible={hovered} fields={state.missing} />
    </div>
  );
}

function MobileStepper({ steps, activeIndex, stepReady, progressPercent }: Pick<HorizontalStepperProps, 'steps' | 'activeIndex' | 'stepReady'> & { progressPercent: number }) {
  const activeStep = steps[activeIndex];
  const ActiveIcon = activeStep?.icon ?? Info;
  return (
    <div className="md:hidden space-y-3">
      <div className="relative h-2 bg-muted rounded-full overflow-hidden"><div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} /></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary"><ActiveIcon className="h-4 w-4" /></div><div><p className="text-sm font-medium text-foreground">{activeStep?.label}</p><p className="text-xs text-muted-foreground">{activeStep?.description}</p></div></div>
        <p className="text-xs text-muted-foreground">Passo {activeIndex + 1} de {steps.length}</p>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {steps.map((step, index) => <div key={step.id} className={cn("h-1.5 rounded-full transition-all duration-300", index === activeIndex ? "w-6 bg-primary" : "w-1.5", stepReady[index] && index !== activeIndex && "bg-primary", !stepReady[index] && index !== activeIndex && "bg-muted")} />)}
      </div>
    </div>
  );
}

export function HorizontalStepper({
  steps,
  activeIndex,
  stepReady,
  stepErrors,
  onStepClick,
  missingFields,
  showValidation,
}: HorizontalStepperProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const completedSteps = stepReady.filter(Boolean).length;
  const progressPercent = (completedSteps / steps.length) * 100;

  return (
    <div className="w-full" role="navigation" aria-label="Etapas do cadastro de produto">
      <div className="hidden md:block">
        <div className="relative flex items-start justify-between" role="tablist" aria-label="Etapas">
          <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-muted" />
          <div
            className="absolute top-5 left-[5%] h-0.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent * 0.9}%` }}
          />
          {steps.map((step, index) => (
            <DesktopStep
              key={step.id}
              step={step}
              index={index}
              state={getStepState({ index, activeIndex, stepReady, stepErrors, missingFields, showValidation })}
              hovered={hoveredStep === index}
              stepCount={steps.length}
              onStepClick={onStepClick}
              onHover={setHoveredStep}
            />
          ))}
        </div>
      </div>
      <MobileStepper steps={steps} activeIndex={activeIndex} stepReady={stepReady} progressPercent={progressPercent} />
    </div>
  );
}
