import type { ReactNode } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="freshness-tooltip">{children}</div>
  ),
}));

import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

const NOW = new Date("2026-04-24T12:00:00.000Z");
const DAY_MS = 86_400_000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS);
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

describe("PriceFreshnessBadge — confirmação e conteúdo do tooltip", () => {
  it("expõe regra, data, hora e recomendação e executa a confirmação", () => {
    const onConfirm = vi.fn();
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(90)}
        thresholdDays={60}
        variant="inline"
        onConfirm={onConfirm}
      />,
    );

    const tooltip = screen.getByTestId("freshness-tooltip");
    expect(tooltip).toHaveTextContent("Possivelmente defasado");
    expect(tooltip).toHaveTextContent(/Atualizado em 24\/01\/2026/);
    expect(tooltip).toHaveTextContent(/Hora local:/);
    expect(tooltip).toHaveTextContent(/Regra: até 30 dias/);
    expect(tooltip).toHaveTextContent(/Confirme o valor com o fornecedor/);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Confirmar que validei este preço com o fornecedor",
      }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("mostra recomendação específica para preço próximo do limite", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(45)}
        thresholdDays={60}
        variant="compact"
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByTestId("freshness-tooltip")).toHaveTextContent(
      "Recomendamos confirmar o valor antes de fechar o orçamento",
    );
    expect(screen.getByRole("button")).toHaveTextContent("Confirmei");
  });

  it("descreve ausência de data no tooltip do estado desconhecido", () => {
    render(<PriceFreshnessBadge priceUpdatedAt={null} variant="inline" />);

    expect(screen.getByTestId("freshness-tooltip")).toHaveTextContent(
      "O fornecedor não informou a data da última atualização deste preço",
    );
  });

  it.each([
    ["agora", NOW, "icon-only"],
    ["agora", "data-inválida", "compact"],
    ["há 15 min", new Date(NOW.getTime() - 15 * 60_000), "inline"],
    ["há 3h", new Date(NOW.getTime() - 3 * 3_600_000), "compact"],
    ["ontem", daysAgo(1), "inline"],
    ["há 8 dias", daysAgo(8), "icon-only"],
    ["15 de março de 2026", daysAgo(40), "inline"],
  ] as const)(
    "renderiza confirmação relativa %s na variante %s",
    (relative, confirmedAt, variant) => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={daysAgo(90)}
          thresholdDays={60}
          variant={variant}
          confirmedAt={confirmedAt}
        />,
      );

      expect(screen.getByRole("status")).toHaveAccessibleName(
        `Preço confirmado por você ${relative}`,
      );
    },
  );

  it("ignora confirmação para preço ainda válido", () => {
    render(
      <PriceFreshnessBadge
        priceUpdatedAt={daysAgo(5)}
        thresholdDays={60}
        variant="inline"
        confirmedAt={NOW}
      />,
    );

    expect(screen.getByRole("status")).toHaveAccessibleName(/Preço atualizado/);
    expect(screen.queryByText("Confirmado com fornecedor")).not.toBeInTheDocument();
  });
});
