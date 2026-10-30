import { createRef } from "react";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SmartSearchInput } from "@/components/search/SmartSearchInput";
import { TooltipProvider } from "@/components/ui/tooltip";

const setQuery = vi.fn();
const addToHistory = vi.fn();
const removeFromHistory = vi.fn();
const clearHistory = vi.fn();

vi.mock("@/hooks/useSearch", () => ({
  useSearch: () => ({
    query: "",
    setQuery,
    suggestions: [],
    quickSuggestions: [],
    history: [],
    addToHistory,
    removeFromHistory,
    clearHistory,
    isLoaded: true,
  }),
}));

vi.mock("@/hooks/useDebounce", () => ({ useDebounce: (value: string) => value }));

describe("SmartSearchInput", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
    vi.clearAllMocks();
  });

  it("mantém o callback de voz estável e encaminha a ref do contêiner", async () => {
    const instances: MockSpeechRecognition[] = [];

    class MockSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onstart: (() => void) | null = null;
      onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
      onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
      onend: (() => void) | null = null;

      constructor() {
        instances.push(this);
      }

      abort() {}
      start() {}
      stop() {}
    }

    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: MockSpeechRecognition,
    });

    const ref = createRef<HTMLDivElement>();
    render(
      <MemoryRouter>
        <TooltipProvider>
          <SmartSearchInput ref={ref} />
        </TooltipProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(instances).toHaveLength(1));
    expect(ref.current).toBeInstanceOf(HTMLDivElement);

  });
});
