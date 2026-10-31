import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrderCommentsTab } from "@/components/sicoob/orders/OrderCommentsTab";

const mocks = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { id: "perfil-1" }, isSupervisorOrAbove: true }),
}));

vi.mock("@/hooks/orders/extensions", () => ({
  useOrderComments: () => ({
    comments: [],
    addComment: { mutate: mocks.mutate, isPending: false },
    isLoading: false,
  }),
}));

describe("comentários do pedido acessíveis", () => {
  beforeEach(() => mocks.mutate.mockClear());

  it("oferece nome acessível ao campo e não envia o formulário ao escolher uma menção", async () => {
    const user = userEvent.setup();
    render(<OrderCommentsTab orderId="pedido-1" />);

    const textarea = screen.getByRole("textbox", { name: "Comentário do pedido" });
    await user.type(textarea, "Olá @");
    await user.click(screen.getByRole("button", { name: /Admin Central/i }));

    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Olá @Admin Central ");
  });

  it("não apresenta violações automáticas de acessibilidade no estado inicial", async () => {
    const { container } = render(<OrderCommentsTab orderId="pedido-1" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
