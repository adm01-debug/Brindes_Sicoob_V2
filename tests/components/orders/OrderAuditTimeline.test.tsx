import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { OrderAuditTimeline } from "@/components/orders/OrderAuditTimeline";

vi.mock("@/hooks/orders/extensions", () => ({
  useOrderAudit: () => ({
    auditEvents: [],
    totalCount: 0,
    isLoading: false,
    page: 1,
    setPage: vi.fn(),
    pageSize: 10,
  }),
}));

describe("OrderAuditTimeline", () => {
  it("nomeia os controles de filtro e ordenação e comunica a próxima ordenação", async () => {
    const user = userEvent.setup();
    render(<OrderAuditTimeline orderId="pedido-1" />);

    expect(screen.getByRole("button", { name: "Filtrar eventos da auditoria" })).toBeTruthy();

    const sortButton = screen.getByRole("button", { name: "Ordenar eventos do mais antigo" });
    await user.click(sortButton);

    expect(screen.getByRole("button", { name: "Ordenar eventos do mais recente" })).toBeTruthy();
  });

  it("não apresenta violações automáticas de acessibilidade no estado vazio", async () => {
    const { container } = render(<OrderAuditTimeline orderId="pedido-1" />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
