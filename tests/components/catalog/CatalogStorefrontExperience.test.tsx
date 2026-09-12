import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../render-helpers";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { CatalogStorefrontHero } from "@/components/catalog/CatalogStorefrontHero";

vi.mock("@/components/search", () => ({
  SmartSearchInput: () => <input aria-label="Busca do catálogo" />,
}));

vi.mock("@/components/products/RecentlyViewedPopover", () => ({
  RecentlyViewedPopover: () => null,
}));

describe("experiência comercial do catálogo", () => {
  it("inicia a seleção por uma faixa de investimento", async () => {
    const user = userEvent.setup();
    const onSelectBudget = vi.fn();

    renderWithProviders(<CatalogStorefrontHero onBrowse={vi.fn()} onSelectIntent={vi.fn()} onSelectBudget={onSelectBudget} />);

    await user.click(
      screen.getByRole("button", {
        name: "Filtrar produtos por investimento: Até R$ 25",
      }),
    );

    expect(onSelectBudget).toHaveBeenCalledWith(0, 25);
  });

  it("retoma uma busca recente pelo cabeçalho", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onClearSearchHistory = vi.fn();

    renderWithProviders(
      <CatalogHeader
        shouldShowCatalogSkeleton={false}
        totalEstimate={120}
        filteredCount={120}
        hasNextPage={false}
        onSelect={onSelect}
        searchHistory={["garrafas", "kits de evento"]}
        onClearSearchHistory={onClearSearchHistory}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Abrir 2 buscas recentes" }));
    await user.click(screen.getByRole("button", { name: "garrafas" }));

    expect(onSelect).toHaveBeenCalledWith({
      type: "history",
      id: "history-0",
      label: "garrafas",
    });
    expect(screen.queryByText("kits de evento")).not.toBeInTheDocument();
  });

  it("limpa o histórico pelo cabeçalho", async () => {
    const user = userEvent.setup();
    const onClearSearchHistory = vi.fn();

    renderWithProviders(
      <CatalogHeader
        shouldShowCatalogSkeleton={false}
        totalEstimate={120}
        filteredCount={120}
        hasNextPage={false}
        onSelect={vi.fn()}
        searchHistory={["garrafas", "kits de evento"]}
        onClearSearchHistory={onClearSearchHistory}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Abrir 2 buscas recentes" }));
    await user.click(screen.getByRole("button", { name: "Limpar" }));
    expect(onClearSearchHistory).toHaveBeenCalledOnce();
  });
});
