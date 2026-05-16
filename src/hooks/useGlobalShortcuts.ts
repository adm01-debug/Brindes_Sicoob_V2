/**
 * Global keyboard shortcuts for power users.
 * 
 * Registry (complementa os atalhos Alt+* da sidebar):
 * Ctrl/Cmd + K → Focus search (busca inteligente)
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
  onSearchFocus?: () => void;
  onToggleCart?: () => void;
}

// "G then K" sequence buffer (vim-style chord) — opens kit library
let lastGAt = 0;

export function useGlobalShortcuts(handlers?: ShortcutHandlers) {
  const navigate = useNavigate();
  const openOracle = useOracleVoiceBridge((s) => s.openOracle);

  const { goBack } = useOracleVoiceBridge((s) => ({ openOracle: s.openOracle, goBack: () => window.history.back() })); // Placeholder for real goBack
  // Actually I should use useSmartNavigation here but I can't import it easily without causing circular deps if I'm not careful.
  // Let's use a simpler approach.
  
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Backspace or Alt+ArrowLeft for Back
      if (!isInput && (e.key === "Backspace" || (e.altKey && e.key === "ArrowLeft"))) {
        // We'll let the custom BackButton logic handle it or just use browser back
        // But for perfection, we should trigger the smart back.
        // I'll emit a custom event that MainLayout or useSmartNavigation listens to.
        window.dispatchEvent(new CustomEvent('smart-back'));
        e.preventDefault();
        return;
      }

      // Alt shortcuts (Navigation)
      if (e.altKey && !isInput) {
        if (e.key === "g" || e.key === "G") {
          e.preventDefault();
          navigate("/sicoob/pedidos");
          return;
        }
        if (e.key === "v" || e.key === "V") {
          e.preventDefault();
          navigate("/sicoob/pedidos/kanban");
          return;
        }
      }

      // G then K (within 800ms) → open kit library — no modifier, ignored in inputs
      if (!isMod && !e.altKey && !e.shiftKey && !isInput) {
        if (e.key === "g" || e.key === "G") {
          lastGAt = Date.now();
          return;
        }
        if ((e.key === "k" || e.key === "K") && Date.now() - lastGAt < 800) {
          e.preventDefault();
          lastGAt = 0;
          navigate("/meus-kits");
          return;
        }
      }

      if (!isMod) return;

      // Ctrl/Cmd + K → Focus search (works even inside inputs)
      if (e.key === "k") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="search"], input[aria-label="Campo de busca"]'
        );
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        handlers?.onSearchFocus?.();
        return;
      }

      // Ctrl/Cmd + J → Open Flow (no conflict with browser shortcuts)
      if (e.key === "j" && !isInput) {
        e.preventDefault();
        openOracle();
        return;
      }

      // Ctrl/Cmd + Shift + N → New quote (Shift avoids browser new-window)
      if (e.key === "N" && e.shiftKey && !isInput) {
        e.preventDefault();
        navigate("/orcamentos/novo");
        return;
      }

      // Ctrl/Cmd + Shift + C → Open cart
      if ((e.key === "C" || e.key === "c") && e.shiftKey && !isInput) {
        e.preventDefault();
        handlers?.onToggleCart?.();
        return;
      }
    },
    [navigate, openOracle, handlers]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
