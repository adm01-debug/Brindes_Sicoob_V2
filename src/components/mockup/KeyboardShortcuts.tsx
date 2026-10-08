import { useEffect, useCallback } from "react";
import { toast } from "sonner";

interface KeyboardShortcutsProps {
  onGenerate: () => void;
  onReset: () => void;
  onDownload: () => void;
  canGenerate: boolean;
  canDownload: boolean;
  isLoading: boolean;
}

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable;
}

function hasCommandModifier(event: KeyboardEvent) {
  return event.ctrlKey || event.metaKey;
}

function runGenerateShortcut(event: KeyboardEvent, props: KeyboardShortcutsProps) {
  if (!hasCommandModifier(event) || event.key !== "Enter") return false;
  event.preventDefault();
  if (props.canGenerate && !props.isLoading) {
    props.onGenerate();
    toast.info("⌨️ Gerando mockup...", { duration: 1500 });
  } else if (!props.canGenerate) {
    toast.warning("Complete todos os campos antes de gerar");
  }
  return true;
}

function runDownloadShortcut(event: KeyboardEvent, props: KeyboardShortcutsProps) {
  if (!hasCommandModifier(event) || event.key !== "d") return false;
  event.preventDefault();
  if (props.canDownload) {
    props.onDownload();
    toast.info("⌨️ Baixando mockup...", { duration: 1500 });
  }
  return true;
}

function runResetShortcut(event: KeyboardEvent, props: KeyboardShortcutsProps) {
  const commandReset = hasCommandModifier(event) && event.key === "r" && !event.shiftKey;
  const escapeReset = event.key === "Escape" && !props.isLoading;
  if (!commandReset && !escapeReset) return false;
  event.preventDefault();
  props.onReset();
  toast.info("⌨️ Formulário limpo", { duration: 1500 });
  return true;
}

export function useKeyboardShortcuts({
  onGenerate,
  onReset,
  onDownload,
  canGenerate,
  canDownload,
  isLoading,
}: KeyboardShortcutsProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const shortcutProps = { onGenerate, onReset, onDownload, canGenerate, canDownload, isLoading };
      if (isTypingTarget(event.target)) return;
      if (runGenerateShortcut(event, shortcutProps)) return;
      if (runDownloadShortcut(event, shortcutProps)) return;
      runResetShortcut(event, shortcutProps);
    },
    [canGenerate, canDownload, isLoading, onGenerate, onDownload, onReset]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

// Component that shows keyboard shortcuts hint
export function KeyboardShortcutsHint({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Enter</kbd>
          <span className="ml-1">Gerar</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">D</kbd>
          <span className="ml-1">Baixar</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono">Esc</kbd>
          <span className="ml-1">Limpar</span>
        </span>
      </div>
    </div>
  );
}
