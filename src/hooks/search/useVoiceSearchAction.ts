
import { useCallback } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { useOracleVoiceBridge } from "@/stores/oracleVoiceBridge";
import { useVoiceCommandHistory, type VoiceCommandRecord } from "@/hooks/useVoiceCommandHistory";
import type { VoiceAgentAction } from "@/hooks/voice/types";

function delayed(action: () => void) {
  setTimeout(action, 500);
}

function searchQuery(action: VoiceAgentAction) {
  const parts = [
    action.data?.filters?.category,
    action.data?.filters?.color,
    action.data?.filters?.material,
  ].filter((part): part is string => Boolean(part));
  return action.data?.query || parts.join(" ");
}

interface VoiceActions<Result> {
  navigate: NavigateFunction;
  setOpen: (open: boolean) => void;
  setVoiceOverlayOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  setResults: (results: Result[]) => void;
}

function runNavigate<Result>(action: VoiceAgentAction, actions: VoiceActions<Result>, close: () => void) {
  const route = action.data?.route;
  if (route) delayed(() => { close(); actions.navigate(route); });
}

function runSearch<Result>(action: VoiceAgentAction, actions: VoiceActions<Result>, close: () => void) {
  const query = searchQuery(action);
  if (query) delayed(() => { close(); actions.setQuery(query); actions.setOpen(true); });
}

function runSort<Result>(action: VoiceAgentAction, actions: VoiceActions<Result>, close: () => void) {
  const sortBy = action.data?.sortBy;
  if (sortBy) delayed(() => { close(); actions.navigate(`/?sort=${sortBy}`); });
}

function runOracle(action: VoiceAgentAction, close: () => void) {
  delayed(() => {
    close();
    useOracleVoiceBridge.getState().openOracle(action.data?.oracleMessage || undefined);
  });
}

function runVoiceAction<Result>(action: VoiceAgentAction, actions: VoiceActions<Result>) {
  const close = () => actions.setVoiceOverlayOpen(false);
  switch (action.action) {
    case "navigate":
      runNavigate(action, actions, close);
      break;
    case "search":
    case "filter": {
      runSearch(action, actions, close);
      break;
    }
    case "clear":
      delayed(() => { close(); actions.setQuery(""); actions.setResults([]); });
      break;
    case "sort":
      runSort(action, actions, close);
      break;
    case "open_oracle":
      runOracle(action, close);
      break;
    case "open_cart":
      delayed(() => {
        close();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "o", altKey: true }));
      });
      break;
  }
}

export function useVoiceSearchAction<Result>(
  setOpen: (o: boolean) => void,
  setVoiceOverlayOpen: (o: boolean) => void,
  setQuery: (q: string) => void,
  setResults: (r: Result[]) => void
) {
  const navigate = useNavigate();
  const { addCommand: addVoiceCommand } = useVoiceCommandHistory();

  const handleVoiceAction = useCallback((action: VoiceAgentAction) => {
    addVoiceCommand(action.data?.query || action.response, action.action as VoiceCommandRecord['type'], true);
    runVoiceAction(action, { navigate, setOpen, setVoiceOverlayOpen, setQuery, setResults });
  }, [navigate, addVoiceCommand, setOpen, setVoiceOverlayOpen, setQuery, setResults]);

  return { handleVoiceAction };
}
