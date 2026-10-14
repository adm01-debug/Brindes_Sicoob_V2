/**
 * Global keyboard shortcuts for power users.
 * 
 * Registry (complementa os atalhos Alt+* da sidebar):
 * Ctrl/Cmd + K → reservado à barra global de comandos
 * Ctrl/Cmd + J → Open Flow (assistente IA)
 * Ctrl/Cmd + Shift + N → New quote
 * Ctrl/Cmd + Shift + C → Open cart
 * 
 * Existing Alt shortcuts (sidebar): Alt+N novo orçamento, Alt+O orçamentos,
 *   Alt+R carrinhos, Alt+P produtos, Alt+F super filtro, Alt+M mockup, Alt+S simulador.
 *   Header: Alt+F favoritos, Alt+C comparar, Alt+T tema.
 *   Sicoob: Alt+G pedidos, Alt+V kanban.
 */
import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useOracleVoiceBridge } from "@/stores/oracleVoiceBridge";

interface ShortcutHandlers {
  onToggleCart?: () => void;
}

// "G then K" sequence buffer (vim-style chord) — opens kit library
let lastGAt = 0;

function isEditableElement(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(element && (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.isContentEditable));
}

function handleSmartBack(event: KeyboardEvent, isInput: boolean): boolean {
  const requested = event.key === "Backspace" || (event.altKey && event.key === "ArrowLeft");
  if (isInput || !requested) return false;
  window.dispatchEvent(new CustomEvent('smart-back'));
  event.preventDefault();
  return true;
}

function handleAltNavigation(event: KeyboardEvent, isInput: boolean, navigate: (path: string) => void): boolean {
  if (!event.altKey || isInput) return false;
  const destinations: Record<string, string> = { g: "/sicoob/pedidos", v: "/sicoob/pedidos/kanban" };
  const destination = destinations[event.key.toLowerCase()];
  if (!destination) return false;
  event.preventDefault();
  navigate(destination);
  return true;
}

function handleKitChord(event: KeyboardEvent, isModified: boolean, isInput: boolean, navigate: (path: string) => void): boolean {
  if (isModified || event.altKey || event.shiftKey || isInput) return false;
  const key = event.key.toLowerCase();
  if (key === "g") {
    lastGAt = Date.now();
    return true;
  }
  if (key !== "k" || Date.now() - lastGAt >= 800) return false;
  event.preventDefault();
  lastGAt = 0;
  navigate("/meus-kits");
  return true;
}

function handleOracleShortcut(event: KeyboardEvent, isInput: boolean, openOracle: () => void): boolean {
  if (event.key !== "j" || isInput) return false;
  event.preventDefault();
  openOracle();
  return true;
}

function handleNewQuoteShortcut(event: KeyboardEvent, isInput: boolean, navigate: (path: string) => void): boolean {
  if (event.key !== "N" || !event.shiftKey || isInput) return false;
  event.preventDefault();
  navigate("/orcamentos/novo");
  return true;
}

function handleCartShortcut(event: KeyboardEvent, isInput: boolean, handlers?: ShortcutHandlers): boolean {
  if (event.key.toLowerCase() !== "c" || !event.shiftKey || isInput) return false;
  event.preventDefault();
  handlers?.onToggleCart?.();
  return true;
}

export function useGlobalShortcuts(handlers?: ShortcutHandlers) {
  const navigate = useNavigate();
  const openOracle = useOracleVoiceBridge((s) => s.openOracle);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const isInput = isEditableElement(e.target);
      if (handleSmartBack(e, isInput)) return;
      if (handleAltNavigation(e, isInput, navigate)) return;
      if (handleKitChord(e, isMod, isInput, navigate)) return;
      if (!isMod) return;
      if (handleOracleShortcut(e, isInput, openOracle)) return;
      if (handleNewQuoteShortcut(e, isInput, navigate)) return;
      handleCartShortcut(e, isInput, handlers);
    },
    [navigate, openOracle, handlers]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
