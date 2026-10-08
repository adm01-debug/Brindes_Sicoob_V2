/**
 * Kit Builder Wizard Steps — Premium edition
 * Continuous progress bar + active glow + mini-summaries per step.
 */

import { Check, Package, Gift, Palette, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KitBuilderStep, KitState } from '@/lib/kit-builder';

interface WizardStepsProps {
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  onStepClick?: (step: KitBuilderStep) => void;
  kitState?: KitState;
}

const STEPS: { id: KitBuilderStep; label: string; ordinal: string; icon: typeof Package; tagline: string }[] = [
  { id: 'box', label: 'Caixa', ordinal: '01', icon: Package, tagline: 'A primeira impressão' },
  { id: 'items', label: 'Itens', ordinal: '02', icon: Gift, tagline: 'O coração do kit' },
  { id: 'personalization', label: 'Personalização', ordinal: '03', icon: Palette, tagline: 'Sua marca presente' },
  { id: 'summary', label: 'Resumo', ordinal: '04', icon: FileText, tagline: 'Pronto para encantar' },
];

function getStepSummary(stepId: KitBuilderStep, kitState?: KitState): string | null {
  if (!kitState) return null;
  if (stepId === 'box' && kitState.box) return kitState.box.name;
  if (stepId === 'items' && kitState.items.length > 0) {
    const totalQty = kitState.items.reduce((sum, item) => sum + item.quantity, 0);
    return `${kitState.items.length} produtos · ${totalQty} un.`;
  }
  if (stepId !== 'personalization') return null;
  const count = Number(Boolean(kitState.personalization.box?.enabled)) + Object.values(kitState.personalization.items).filter(item => item?.enabled).length;
  if (count === 0) return null;
  return `${count} ${count === 1 ? 'item' : 'itens'} personalizados`;
}

function StepStatusIcon({ active, completed, icon }: { active: boolean; completed: boolean; icon: typeof Package }) {
  const Icon = icon;
  if (completed && !active) return <Check className="h-4 w-4" strokeWidth={2.5} />;
  return <Icon className="h-4 w-4" />;
}

function getStepIndicatorClass(active: boolean, completed: boolean): string {
  if (active) return 'border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.4)]';
  if (completed) return 'border-success/50 bg-success/10 text-success';
  return 'border-border bg-muted/40 text-muted-foreground group-hover:border-border/80';
}

function StepLabel({ step, active, completed, summary }: { step: typeof STEPS[number]; active: boolean; completed: boolean; summary: string | null }) {
  const statusClass = active ? 'text-foreground' : completed ? 'text-foreground/80' : 'text-muted-foreground';
  return <div className="text-left min-w-0 flex-1"><p className={cn('text-sm font-display font-semibold tracking-tight truncate leading-tight transition-colors', statusClass)}>{step.label}</p>{summary ? <p className="text-[10px] text-success font-medium truncate leading-tight" title={summary}>✓ {summary}</p> : <p className="text-[10px] text-muted-foreground/70 truncate leading-tight hidden md:block">{step.tagline}</p>}</div>;
}

function StepConnector({ index }: { index: number }) {
  if (index >= STEPS.length - 1) return null;
  return <div className="hidden sm:block flex-shrink-0 w-4 h-px bg-border/60" aria-hidden />;
}

function StepItem({ step, index, currentStep, completedSteps, summary, onStepClick }: { step: typeof STEPS[number]; index: number; currentStep: KitBuilderStep; completedSteps: KitBuilderStep[]; summary: string | null; onStepClick?: (step: KitBuilderStep) => void }) {
  const active = step.id === currentStep;
  const completed = completedSteps.includes(step.id);
  const clickable = completed || active;
  const handleClick = () => { if (clickable) onStepClick?.(step.id); };
  return <div className="flex items-center flex-1 min-w-0"><button onClick={handleClick} disabled={!clickable} aria-current={active ? 'step' : undefined} className={cn('group flex items-center gap-2.5 flex-1 min-w-0 px-1 py-1 transition-all rounded-lg', clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}><div className={cn('relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-300', getStepIndicatorClass(active, completed))}><StepStatusIcon active={active} completed={completed} icon={step.icon} /></div><StepLabel step={step} active={active} completed={completed} summary={summary} /></button><StepConnector index={index} /></div>;
}

export function WizardSteps({ currentStep, completedSteps, onStepClick, kitState }: WizardStepsProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  const progressPercent = ((currentIndex + (completedSteps.includes(currentStep) ? 1 : 0.5)) / STEPS.length) * 100;

  return (
    <div className="w-full space-y-2">
      {/* Continuous progress bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%`, boxShadow: '0 0 12px hsl(var(--primary) / 0.5)' }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => <StepItem key={step.id} step={step} index={index} currentStep={currentStep} completedSteps={completedSteps} summary={getStepSummary(step.id, kitState)} onStepClick={onStepClick} />)}
      </div>
    </div>
  );
}
