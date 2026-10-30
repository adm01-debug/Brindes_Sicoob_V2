import type { ElementType } from "react";
/**
 * WizardStepIndicator - Indicador visual dos 4 passos
 * 
 * Produto → Local → Especificações → Comparativo
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Package, MapPin, SlidersHorizontal, BarChart3, Check } from 'lucide-react';
import { 
  WIZARD_STEPS, 
  WIZARD_STEP_CONFIG,
  type WizardStep,
} from '@/types/domain/simulator-wizard';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface WizardStepIndicatorProps {
  wizard: UseSimulatorWizardReturn;
}

const STEP_ICONS: Record<WizardStep, ElementType> = {
  product: Package,
  location: MapPin,
  specs: SlidersHorizontal,
  comparison: BarChart3,
};

function DesktopStepIcon({ step, current, completed }: { step: WizardStep; current: boolean; completed: boolean }) {
  const Icon = STEP_ICONS[step];
  const stateClass = current ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20' : completed ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground';
  return <motion.div className={cn('w-12 h-12 rounded-full flex items-center justify-center transition-all relative', stateClass)} initial={false} animate={current ? { scale: [1, 1.05, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>{completed ? <Check className="h-5 w-5" strokeWidth={3} /> : <Icon className="h-5 w-5" />}{current ? <motion.div className="absolute inset-0 rounded-full bg-primary/20" initial={{ scale: 1, opacity: 0.5 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 1.5, repeat: Infinity }} /> : null}</motion.div>;
}

function DesktopStepLabel({ index, current, clickable, label }: { index: number; current: boolean; clickable: boolean; label: string }) {
  const hoverClass = clickable && !current ? 'group-hover:text-foreground' : undefined;
  return <div className="text-center"><p className={cn('text-xs font-medium uppercase tracking-wider mb-0.5', current ? 'text-primary' : 'text-muted-foreground')}>Passo {index + 1}</p><p className={cn('text-sm font-semibold transition-colors', current ? 'text-foreground' : 'text-muted-foreground', hoverClass)}>{label}</p></div>;
}

function DesktopStep({ step, index, wizard, currentIndex }: { step: WizardStep; index: number; wizard: UseSimulatorWizardReturn; currentIndex: number }) {
  const completed = index < currentIndex;
  const current = step === wizard.currentStep;
  const clickable = wizard.canNavigateToStep(step);
  const activate = () => { if (clickable) wizard.setStep(step); };
  return <motion.button onClick={activate} disabled={!clickable} className={cn('flex flex-col items-center gap-3 group transition-all', clickable ? 'cursor-pointer' : 'cursor-not-allowed')} whileHover={clickable ? { y: -2 } : undefined} whileTap={clickable ? { scale: 0.98 } : undefined}><DesktopStepIcon step={step} current={current} completed={completed} /><DesktopStepLabel index={index} current={current} clickable={clickable} label={WIZARD_STEP_CONFIG[step].shortLabel} /></motion.button>;
}

export function WizardStepIndicator({ wizard }: WizardStepIndicatorProps) {
  const currentIndex = WIZARD_STEPS.indexOf(wizard.currentStep);
  
  return (
    <div className="w-full">
      {/* Mobile: Progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{currentIndex + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{WIZARD_STEPS.length}</span>
          </div>
          <span className="font-semibold">
            {WIZARD_STEP_CONFIG[wizard.currentStep].shortLabel}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${wizard.stepProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 px-1">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = STEP_ICONS[step];
            const config = WIZARD_STEP_CONFIG[step];
            const isActive = idx <= currentIndex;
            return (
              <div key={step} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                  idx === currentIndex ? 'bg-primary text-primary-foreground' :
                  isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground/40'
                )}>
                  {idx < currentIndex ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  idx === currentIndex ? 'text-primary' : 'text-muted-foreground/60'
                )}>
                  {config.shortLabel.slice(0, 5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Horizontal steps */}
      <div className="hidden sm:block">
        <div className="w-full">
          <div className="relative mb-8">
            <div className="absolute top-6 left-12 right-12 h-1 bg-muted rounded-full" />
            <motion.div
              className="absolute top-6 left-12 h-1 bg-gradient-to-r from-primary via-primary to-primary/60 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `calc(${(currentIndex / (WIZARD_STEPS.length - 1)) * 100}% - 6rem)` 
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-between relative -mt-6">
            {WIZARD_STEPS.map((step, index) => <DesktopStep key={step} step={step} index={index} wizard={wizard} currentIndex={currentIndex} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
