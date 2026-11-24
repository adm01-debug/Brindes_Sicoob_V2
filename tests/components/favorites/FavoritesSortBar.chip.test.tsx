import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FavoritesSortBar } from "@/components/favorites/FavoritesSortBar";

describe("FavoritesSortBar — chip de quedas", () => {
  it("continua visível com o filtro ligado e nenhuma queda na lista atual", () => {
    const onToggle = vi.fn();
    render(
      <FavoritesSortBar
        value="recent"
        onChange={() => {}}
        onlyPriceDrops
        onTogglePriceDrops={onToggle}
        priceDropCount={0}
      />,
    );

    const chip = screen.getByRole("button", { name: /Quedas/ });
    expect(chip).toHaveAttribute("aria-pressed", "true");
  });

  it("some quando não há queda e o filtro está desligado", () => {
    render(
      <FavoritesSortBar
        value="recent"
        onChange={() => {}}
        onlyPriceDrops={false}
        onTogglePriceDrops={() => {}}
        priceDropCount={0}
      />,
    );

    expect(screen.queryByRole("button", { name: /Quedas/ })).toBeNull();
  });
});
