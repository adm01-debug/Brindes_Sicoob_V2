import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IntelligenceBadges } from "@/components/common/IntelligenceBadges";

const cachedBadge = {
  type: "best-seller" as const,
  label: "Best-Seller",
  emoji: "🔥",
  tooltip: "Indicador de mercado em cache",
};

describe("IntelligenceBadges — erro e dados de mercado", () => {
  it("mostra erro, mantém indicador em cache e dispara retry", () => {
    const onRetry = vi.fn().mockResolvedValue(undefined);
    render(
      <TooltipProvider>
        <IntelligenceBadges badges={[cachedBadge]} isError hasMarketData onRetry={onRetry} />
      </TooltipProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível atualizar todos os indicadores");
    expect(screen.getByText(/Best-Seller/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("distingue falha sem cache de ausência de dados confirmada", () => {
    const { rerender } = render(
      <TooltipProvider>
        <IntelligenceBadges badges={[]} isError onRetry={vi.fn()} />
      </TooltipProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar os indicadores");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    rerender(
      <TooltipProvider>
        <IntelligenceBadges badges={[]} isEmpty />
      </TooltipProvider>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Sem indicadores de mercado disponíveis");
  });
});
