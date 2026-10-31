/**
 * Kit Wizard Keyboard Shortcuts
 * - ArrowLeft/ArrowRight: prev/next step
 * - 1..4: jump to specific step
 * Disabled when focus is in inputs/textareas/contentEditable.
 */
import { useEffect } from "react";
import type { KitBuilderStep } from "@/lib/kit-builder";

const STEP_BY_INDEX: KitBuilderStep[] = ["box", "items", "personalization", "summary"];

interface Options {
  enabled?: boolean;
  canProceed: boolean;
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  onPrev: () => void;
  onNext: () => void;
  onJump: (step: KitBuilderStep) => void;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function resolveArrowAction(
  key: string,
  currentStep: KitBuilderStep,
  canProceed: boolean,
  ...handlers: [onPrev: () => void, onNext: () => void]
) {
  const [onPrev, onNext] = handlers;
  if (key === "ArrowLeft" && currentStep !== "box") return onPrev;
  if (key === "ArrowRight" && currentStep !== "summary" && canProceed) return onNext;
  return null;
}

function resolveJumpAction(
  key: string,
  currentStep: KitBuilderStep,
  completedSteps: KitBuilderStep[],
  onJump: (step: KitBuilderStep) => void,
) {
  const index = Number(key) - 1;
  const targetStep = STEP_BY_INDEX[index];
  if (!targetStep) return null;
  if (targetStep !== currentStep && !completedSteps.includes(targetStep)) return null;
  return () => onJump(targetStep);
}

export function useKitWizardShortcuts({
  enabled = true,
  canProceed,
  currentStep,
  completedSteps,
  onPrev,
  onNext,
  onJump,
}: Options) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const action = resolveArrowAction(e.key, currentStep, canProceed, onPrev, onNext)
        ?? resolveJumpAction(e.key, currentStep, completedSteps, onJump);
      if (!action) return;
      e.preventDefault();
      action();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, canProceed, currentStep, completedSteps, onPrev, onNext, onJump]);
}
