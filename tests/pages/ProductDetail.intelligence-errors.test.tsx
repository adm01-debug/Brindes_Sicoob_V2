import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

const mocks = vi.hoisted(() => ({
  intelligence: {} as Record<string, unknown>,
  velocity: {} as Record<string, unknown>,
  retryIntel: vi.fn(),
  retryVelocity: vi.fn(),
  setSearchParams: vi.fn(),
  trackProductView: vi.fn(),
  addToRecentlyViewed: vi.fn(),
  from: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useParams: () => ({ id: "product-1" }),
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), mocks.setSearchParams],
  };
});
vi.mock("@/hooks/useStockHistory", () => ({
  useProductIntelligenceData: () => mocks.intelligence,
  useStockVelocity: () => mocks.velocity,
}));
vi.mock("@/hooks/useProducts", () => ({
  useProduct: () => ({ data: {
    id: "product-1", name: "Caneca Sicoob", sku: "CANECA-1", price: 12.5,
    images: [], variations: [], colors: [], stock: 10, stockStatus: "in-stock",
    featured: false, newArrival: false, onSale: false,
  }, isLoading: false, isError: false }),
}));
vi.mock("@/hooks/useSimilarProducts", () => ({ useSimilarProducts: () => ({ data: [] }) }));
vi.mock("@/hooks/useProductAnalytics", () => ({ useProductAnalytics: () => ({ trackProductView: mocks.trackProductView }) }));
vi.mock("@/stores/useRecentlyViewedStore", () => ({ useRecentlyViewedStore: () => ({ addToRecentlyViewed: mocks.addToRecentlyViewed }) }));
vi.mock("@/stores/useFavoritesStore", () => ({
  useFavoritesStore: Object.assign(() => ({ isFavorite: () => false, toggleFavorite: vi.fn(), removeFavorite: vi.fn() }), {
    getState: () => ({ getFavoriteVariant: () => undefined }),
  }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/utils/image-utils", () => ({ getCdnUrl: (value: string) => value }));
vi.mock("@/utils/undoToast", () => ({ showUndoToast: vi.fn() }));
vi.mock("react-helmet-async", () => ({ Helmet: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/components/products/ProductStickyHeader", () => ({ ProductStickyHeader: () => null }));
vi.mock("@/components/products/SimilarProducts", () => ({ SimilarProducts: () => null }));
vi.mock("@/components/products/SmartRecommendations", () => ({ SmartRecommendations: () => null }));
vi.mock("@/components/products/StockHistoryChart", () => ({ StockHistoryChart: () => null }));
vi.mock("@/components/products/SalesHistoryChart", () => ({ SalesHistoryChart: () => null }));
vi.mock("@/components/compare/SupplierComparisonModal", () => ({ SupplierComparisonModal: () => null }));
vi.mock("@/components/products/VariantPickerDialog", () => ({ VariantPickerDialog: () => null }));
vi.mock("@/components/products/FutureStockModal", () => ({ FutureStockModal: () => null }));
vi.mock("@/components/products/PackagingModal", () => ({ PackagingModal: () => null }));
vi.mock("@/components/compare/FloatingCompareBar", () => ({ FloatingCompareBar: () => null }));
vi.mock("@/components/mobile/MobileProductActions", () => ({ MobileProductActions: () => null }));
vi.mock("@/pages/product-detail/ProductDetailHero", () => ({ ProductDetailHero: () => null }));

import ProductDetail from "@/pages/ProductDetail";

function emptyQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

function renderProductDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const view = render(<QueryClientProvider client={queryClient}><TooltipProvider><ProductDetail /></TooltipProvider></QueryClientProvider>);
  return { ...view, queryClient };
}

describe("ProductDetail — falhas dos indicadores de inteligência", () => {
  beforeEach(() => {
    mocks.retryIntel.mockReset().mockResolvedValue({});
    mocks.retryVelocity.mockReset().mockResolvedValue({});
    mocks.setSearchParams.mockReset();
    mocks.trackProductView.mockReset();
    mocks.addToRecentlyViewed.mockReset();
    mocks.intelligence = emptyQuery({ refetch: mocks.retryIntel });
    mocks.velocity = emptyQuery({ refetch: mocks.retryVelocity });
    mocks.from.mockReset().mockImplementation(() => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
          Promise.resolve({ count: 0, error: null }).then(resolve, reject),
      };
      return query;
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("mostra indisponibilidade e retry sem declarar vazio quando não há cache", async () => {
    mocks.intelligence = emptyQuery({ isError: true, error: new Error("offline"), refetch: mocks.retryIntel });
    mocks.velocity = emptyQuery({ isError: true, error: new Error("offline"), refetch: mocks.retryVelocity });
    const { queryClient } = renderProductDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os indicadores");
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
    expect(screen.queryByText("Sem indicadores de mercado disponíveis para este produto.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mocks.retryIntel).toHaveBeenCalledOnce();
    expect(mocks.retryVelocity).toHaveBeenCalledOnce();
    queryClient.clear();
  });

  it("mantém badges stale e informa falha parcial; vazio só aparece após resposta confirmada", async () => {
    mocks.intelligence = emptyQuery({
      data: { abc_classification: "A", turnover_score: 72, avg_velocity_7d: 4 },
      isError: true,
      error: new Error("refresh failed"),
      refetch: mocks.retryIntel,
    });
    const first = renderProductDetail();

    expect(await screen.findByRole("alert")).toHaveTextContent("dados disponíveis continuam exibidos");
    expect(screen.getByText(/Best-Seller/)).toBeInTheDocument();
    first.queryClient.clear();
    first.unmount();

    mocks.intelligence = emptyQuery({ data: null });
    mocks.velocity = emptyQuery({ data: [] });
    const second = renderProductDetail();
    expect(await screen.findByRole("status")).toHaveTextContent("Sem indicadores de mercado disponíveis");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    second.queryClient.clear();
  });
});
