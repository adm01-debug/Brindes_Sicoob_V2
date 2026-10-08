/**
 * usePositionHistory — Undo/Redo for logo positioning
 * 
 * Tracks position & size changes with a configurable history depth.
 * Supports Ctrl+Z (undo) and Ctrl+Shift+Z / Ctrl+Y (redo).
 */

import { useState, useCallback, useEffect, useRef } from "react";

interface PositionState {
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
  logoRotation?: number;
  logoScale?: number;
}

interface UsePositionHistoryOptions {
  maxHistory?: number;
  enabled?: boolean;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

function requestedHistoryAction(event: KeyboardEvent): "undo" | "redo" | null {
  if (!event.ctrlKey && !event.metaKey) return null;
  if (event.key === "z" && !event.shiftKey) return "undo";
  if ((event.key === "z" && event.shiftKey) || event.key === "y") return "redo";
  return null;
}

export function usePositionHistory(options: UsePositionHistoryOptions = {}) {
  const { maxHistory = 30, enabled = true } = options;

  const [history, setHistory] = useState<PositionState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const pushState = useCallback((state: PositionState) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    setHistory(prev => {
      // Truncate future states if we're in the middle of history
      const truncated = prev.slice(0, historyIndex + 1);
      const newHistory = [...truncated, state];
      // Keep within max limit
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => {
      return Math.min(prev + 1, maxHistory - 1);
    });
  }, [historyIndex, maxHistory]);

  const undo = useCallback((): PositionState | null => {
    if (!canUndo) return null;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    return history[newIndex] ?? null;
  }, [canUndo, historyIndex, history]);

  const redo = useCallback((): PositionState | null => {
    if (!canRedo) return null;
    isUndoRedoRef.current = true;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    return history[newIndex] ?? null;
  }, [canRedo, historyIndex, history]);

  const clear = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Shift+Z or Ctrl+Y (redo)
  const onUndoRedoRef = useRef<{ onApply: (state: PositionState) => void } | null>(null);

  const setOnApply = useCallback((fn: (state: PositionState) => void) => {
    onUndoRedoRef.current = { onApply: fn };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const action = requestedHistoryAction(e);
      if (!action) return;
      e.preventDefault();
      const state = action === "undo" ? undo() : redo();
      if (state) onUndoRedoRef.current?.onApply(state);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, undo, redo]);

  return {
    pushState,
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
    setOnApply,
    historyLength: history.length,
    currentIndex: historyIndex,
  };
}
