import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import { AIRecommendationsPanel } from "@/components/ai/AIRecommendationsPanel";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";

const mockFetchRecommendations = vi.fn();
const mockReset = vi.fn();

const products = [
  {
    id: "prod-1",
    name: "Caneta Esferográfica",
    category: "Escritório",
    description: "Caneta azul",
  },
  {
    id: "prod-2",
    name: "Mochila Executiva",
    category: "Bolsas",
  },
];

const baseHookState = {
  data: null,
  recommendations: [],
  insights: "",
  isLoading: false,
  error: null,
  fetchRecommendations: mockFetchRecommendations,
  reset: mockReset,
  clearCache: vi.fn(),
};

vi.mock("@/hooks/useAIRecommendations", () => ({
  useAIRecommendations: vi.fn(),
}));

describe("AIRecommendationsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAIRecommendations).mockReturnValue({ ...baseHookState });
  });

  it("exibe perfil, total de produtos e estado inicial", () => {
    renderWithProviders(<AIRecommendationsPanel products={products} />);

    expect(screen.getByRole("heading", { name: "Perfil do cliente" })).toBeInTheDocument();
    expect(screen.getByText("2 produtos disponíveis")).toBeInTheDocument();
    expect(screen.getByText(/Preencha o perfil e clique/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar recomendações" })).toBeDisabled();
  });

  it("habilita a ação com cliente inicial e catálogo disponível", () => {
    renderWithProviders(
      <AIRecommendationsPanel products={products} initialClient={{ name: "Cooperativa Centro" }} />,
    );

    expect(screen.getByRole("button", { name: "Gerar recomendações" })).toBeEnabled();
    expect(screen.getByLabelText("Nome do cliente")).toHaveValue("Cooperativa Centro");
  });

  it("envia o perfil editado e os produtos ao hook", () => {
    renderWithProviders(<AIRecommendationsPanel products={products} />);

    fireEvent.change(screen.getByLabelText("Nome do cliente"), {
      target: { value: "Sicoob União" },
    });
    fireEvent.change(screen.getByLabelText("Segmento"), {
      target: { value: "Cooperativa de crédito" },
    });
    fireEvent.change(screen.getByLabelText("Preferências"), {
      target: { value: "sustentável, premium" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gerar recomendações" }));

    expect(mockFetchRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Sicoob União",
        industry: "Cooperativa de crédito",
        preferences: ["sustentável", "premium"],
      }),
      products,
    );
  });

  it("mantém a ação desabilitada quando o catálogo está vazio", () => {
    renderWithProviders(
      <AIRecommendationsPanel products={[]} initialClient={{ name: "Sicoob" }} />,
    );

    expect(screen.getByText("0 produtos disponíveis")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar recomendações" })).toBeDisabled();
  });

  it("apresenta o estado de carregamento", () => {
    vi.mocked(useAIRecommendations).mockReturnValue({
      ...baseHookState,
      isLoading: true,
    });

    renderWithProviders(
      <AIRecommendationsPanel products={products} initialClient={{ name: "Sicoob" }} />,
    );

    expect(screen.getByRole("button", { name: "Gerar recomendações" })).toHaveTextContent("Analisando...");
    expect(screen.getByRole("button", { name: "Gerar recomendações" })).toBeDisabled();
  });

  it("apresenta erro da recomendação em região de alerta", () => {
    vi.mocked(useAIRecommendations).mockReturnValue({
      ...baseHookState,
      error: "Falha na conexão com a IA",
    });

    renderWithProviders(<AIRecommendationsPanel products={products} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falha na conexão com a IA");
  });

  it("renderiza recomendações conhecidas com ranking, score e motivo", () => {
    vi.mocked(useAIRecommendations).mockReturnValue({
      ...baseHookState,
      data: { recommendations: [], insights: "" },
      recommendations: [
        { productId: "prod-1", score: 0.91, reason: "Boa aderência à marca" },
        { productId: "inexistente", score: 0.8, reason: "Não deve renderizar" },
      ],
    });

    renderWithProviders(<AIRecommendationsPanel products={products} />);

    expect(screen.getByText("Caneta Esferográfica")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText("Boa aderência à marca")).toBeInTheDocument();
    expect(screen.queryByText("Não deve renderizar")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Posição 1")).toBeInTheDocument();
  });

  it("aciona o callback do produto por clique", () => {
    const onProductClick = vi.fn();
    vi.mocked(useAIRecommendations).mockReturnValue({
      ...baseHookState,
      data: { recommendations: [], insights: "" },
      recommendations: [
        { productId: "prod-2", score: 0.75, reason: "Útil para equipes" },
      ],
    });

    renderWithProviders(
      <AIRecommendationsPanel products={products} onProductClick={onProductClick} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver produto Mochila Executiva" }));

    expect(onProductClick).toHaveBeenCalledWith("prod-2");
  });

  it("permite acionar um produto pelo teclado", () => {
    const onProductClick = vi.fn();
    vi.mocked(useAIRecommendations).mockReturnValue({
      ...baseHookState,
      data: { recommendations: [], insights: "" },
      recommendations: [
        { productId: "prod-1", score: 0.85, reason: "Alta afinidade" },
      ],
    });

    renderWithProviders(
      <AIRecommendationsPanel products={products} onProductClick={onProductClick} />,
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Ver produto Caneta Esferográfica" }), {
      key: "Enter",
    });

    expect(onProductClick).toHaveBeenCalledWith("prod-1");
  });

  it("exibe insights e permite limpar resultados", () => {
    vi.mocked(useAIRecommendations).mockReturnValue({
      ...baseHookState,
      data: { recommendations: [], insights: "Priorizar materiais reciclados." },
      recommendations: [
        { productId: "prod-1", score: 0.88, reason: "Perfil sustentável" },
      ],
      insights: "Priorizar materiais reciclados.",
    });

    renderWithProviders(<AIRecommendationsPanel products={products} />);

    expect(screen.getByText("Insights da IA")).toBeInTheDocument();
    expect(screen.getByText("Priorizar materiais reciclados.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar resultados" }));
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("oculta o formulário no modo automático", () => {
    renderWithProviders(
      <AIRecommendationsPanel
        products={products}
        initialClient={{ name: "Sicoob Norte" }}
        hideClientForm
      />,
    );

    expect(screen.queryByText("Perfil do cliente")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar recomendações" })).toBeEnabled();
  });
});
