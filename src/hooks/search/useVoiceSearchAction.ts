
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useOracleVoiceBridge } from "@/stores/oracleVoiceBridge";
import { useVoiceCommandHistory, type VoiceCommandRecord } from "@/hooks/useVoiceCommandHistory";
import type { VoiceAgentAction } from "@/hooks/voice/types";

export function useVoiceSearchAction(
  setOpen: (o: boolean) => void,
  setVoiceOverlayOpen: (o: boolean) => void,
  setQuery: (q: string) => void,
  setResults: (r: any[]) => void
) {
  const navigate = useNavigate();
  const { addCommand: addVoiceCommand } = useVoiceCommandHistory();

  const handleVoiceAction = useCallback((action: VoiceAgentAction) => {
    addVoiceCommand(action.data?.query || action.response, action.action as VoiceCommandRecord['type'], true);

    switch (action.action) {
      case "navigate":
        if (action.data?.route) {
          setTimeout(() => {
            setVoiceOverlayOpen(false);
            navigate(action.data!.route!);
          }, 500);
        }
        break;
      case "search":
      case "filter":
        if (action.data?.query || action.data?.filters) {
          const searchTerm = action.data?.query || "";
          const filterParts: string[] = [];
          if (action.data?.filters?.category) filterParts.push(action.data.filters.category);
          if (action.data?.filters?.color) filterParts.push(action.data.filters.color);
          if (action.data?.filters?.material) filterParts.push(action.data.filters.material);
          
          const finalQuery = searchTerm || filterParts.join(" ");
          if (finalQuery) {
            setTimeout(() => {
              setVoiceOverlayOpen(false);
              setQuery(finalQuery);
              setOpen(true);
            }, 500);
          }
        }
        break;
      case "clear":
        setTimeout(() => {
          setVoiceOverlayOpen(false);
          setQuery("");
          setResults([]);
        }, 500);
        break;
      case "sort":
        setTimeout(() => {
          setVoiceOverlayOpen(false);
          if (action.data?.sortBy) {
            navigate(`/?sort=${action.data.sortBy}`);
          }
        }, 500);
        break;
      case "open_oracle":
        setTimeout(() => {
          setVoiceOverlayOpen(false);
          useOracleVoiceBridge.getState().openOracle(action.data?.oracleMessage || undefined);
        }, 500);
        break;
      case "open_cart":
        setTimeout(() => {
          setVoiceOverlayOpen(false);
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "o", altKey: true }));
        }, 500);
        break;
    }
  }, [navigate, addVoiceCommand, setOpen, setVoiceOverlayOpen, setQuery, setResults]);

  return { handleVoiceAction };
}
