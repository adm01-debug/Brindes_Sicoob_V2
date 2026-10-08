/**
 * useComparisonShortcuts — atalhos globais do comparador.
 * G X → navega /comparar | Shift+X → limpa | 1-4 → foca produto N
 * D → toggle differences | R → toggle radar
 */
import { useEffect, useRef, type MutableRefObject } from "react";
import { useNavigate } from "react-router-dom";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { toast } from "sonner";

interface Options {
  onToggleDifferences?: () => void;
  onToggleRadar?: () => void;
  enabled?: boolean;
}

type LastKey = { key: string; at: number } | null;

function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable));
}

function handleComparisonChord(event: KeyboardEvent, lastKey: MutableRefObject<LastKey>, navigate: (path: string) => void): boolean {
  const key = event.key.toLowerCase();
  const now = Date.now();
  if (key === "g") {
    lastKey.current = { key: "g", at: now };
    return true;
  }
  const matches = lastKey.current?.key === "g" && now - lastKey.current.at < 800 && key === "x";
  lastKey.current = null;
  if (!matches) return false;
  event.preventDefault();
  navigate("/comparar");
  return true;
}

function handleClearComparison(event: KeyboardEvent, clearCompare: () => void): boolean {
  if (!event.shiftKey || event.key.toLowerCase() !== "x") return false;
  event.preventDefault();
  clearCompare();
  toast.success("Comparação limpa");
  return true;
}

function handleProductFocus(event: KeyboardEvent): boolean {
  const isNumber = ["1", "2", "3", "4"].includes(event.key);
  if (!isNumber || event.metaKey || event.ctrlKey || event.altKey) return false;
  const index = parseInt(event.key, 10) - 1;
  const element = document.querySelector(`[data-compare-product="${index}"]`) as HTMLElement | null;
  if (element) {
    event.preventDefault();
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.focus?.();
  }
  return true;
}

function handleToggle(event: KeyboardEvent, key: string, callback?: () => void): boolean {
  const hasModifier = event.shiftKey || event.metaKey || event.ctrlKey || event.altKey;
  if (event.key.toLowerCase() !== key || hasModifier) return false;
  if (callback) {
    event.preventDefault();
    callback();
  }
  return true;
}

export function useComparisonShortcuts(options: Options = {}) {
  const navigate = useNavigate();
  const { clearCompare } = useComparisonStore();
  const lastKeyRef = useRef<{ key: string; at: number } | null>(null);
  const optsRef = useRef(options);

  useEffect(() => {
    optsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (options.enabled === false) return;
    const handler = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      if (handleComparisonChord(e, lastKeyRef, navigate)) return;
      if (handleClearComparison(e, clearCompare)) return;
      if (handleProductFocus(e)) return;
      if (handleToggle(e, "d", optsRef.current.onToggleDifferences)) return;
      handleToggle(e, "r", optsRef.current.onToggleRadar);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, clearCompare, options.enabled]);
}
