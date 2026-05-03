import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GlobalSearchPalette } from "../GlobalSearchPalette";
import { useGlobalSearch } from "../useGlobalSearch";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock the hook
vi.mock("../useGlobalSearch", () => ({
  useGlobalSearch: vi.fn(),
}));

const mockHandlers = {
  setOpen: vi.fn(),
  setQuery: vi.fn(),
  handleSelect: vi.fn(),
  handleSuggestionClick: vi.fn(),
  handleRemoveFromHistory: vi.fn(),
  handleOpenVoiceOverlay: vi.fn(),
  handleCloseVoiceOverlay: vi.fn(),
  handleVoiceAction: vi.fn(),
};

const defaultMockState = {
  open: true,
  query: "",
  results: [],
  groupedResults: {},
  isSearching: false,
  isAIProcessing: false,
  searchIntent: null,
  popularProducts: [],
  typingSuggestions: [],
  voiceOverlayOpen: false,
  contextualSuggestions: [],
  history: [],
  quickSuggestions: [],
  routeContext: { currentRoute: "/" },
  ...mockHandlers,
};

const renderPalette = () => {
  return render(
    <TooltipProvider>
      <MemoryRouter>
        <GlobalSearchPalette />
      </MemoryRouter>
    </TooltipProvider>
  );
};

describe("GlobalSearchPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("renders correctly when open with no results", () => {
    (useGlobalSearch as any).mockReturnValue(defaultMockState);
    renderPalette();
    expect(screen.getByPlaceholderText(/buscar produtos/i)).toBeInTheDocument();
  });

  it("handles undefined groupedResults gracefully", () => {
    (useGlobalSearch as any).mockReturnValue({
      ...defaultMockState,
      groupedResults: undefined,
    });
    
    // Should not throw
    expect(() => renderPalette()).not.toThrow();
  });

  it("handles null groupedResults gracefully", () => {
    (useGlobalSearch as any).mockReturnValue({
      ...defaultMockState,
      groupedResults: null,
    });
    
    // Should not throw
    expect(() => renderPalette()).not.toThrow();
  });

  it("displays search results when groupedResults is populated", () => {
    (useGlobalSearch as any).mockReturnValue({
      ...defaultMockState,
      query: "test",
      results: [{ id: "1", title: "Test Product", type: "product", href: "/p/1" }],
      groupedResults: {
        product: [{ id: "1", title: "Test Product", type: "product", href: "/p/1" }]
      },
    });

    renderPalette();
    expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    expect(screen.getByText(/Produtos/i)).toBeInTheDocument();
  });

  it("displays loading state when isSearching is true", () => {
    (useGlobalSearch as any).mockReturnValue({
      ...defaultMockState,
      isSearching: true,
    });

    renderPalette();
    expect(screen.getByText(/buscando resultados/i)).toBeInTheDocument();
  });

  it("displays empty state when no results found for a query", () => {
    (useGlobalSearch as any).mockReturnValue({
      ...defaultMockState,
      query: "nonexistent",
      results: [],
      groupedResults: {},
    });

    renderPalette();
    expect(screen.getByText(/nenhum resultado para/i)).toBeInTheDocument();
    expect(screen.getAllByText(/nonexistent/i).length).toBeGreaterThan(0);
  });

  it("calls setQuery when input changes", () => {
    (useGlobalSearch as any).mockReturnValue(defaultMockState);
    renderPalette();
    
    const input = screen.getByPlaceholderText(/buscar produtos/i);
    fireEvent.change(input, { target: { value: "new query" } });
    
    expect(mockHandlers.setQuery).toHaveBeenCalledWith("new query");
  });
});
