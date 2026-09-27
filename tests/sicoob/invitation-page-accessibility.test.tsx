import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import SicoobInvitationsPage from "@/pages/sicoob/SicoobInvitationsPage";

vi.mock("@/components/seo/PageSEO", () => ({ PageSEO: () => null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isDev: true, cooperativaId: null }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: [], isLoading: false, error: null }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

describe("formulário de convites acessível", () => {
  it("associa erros aos campos e move o foco para o primeiro erro", async () => {
    const user = userEvent.setup();
    const { container } = render(<SicoobInvitationsPage />);

    await user.click(screen.getByRole("button", { name: "Emitir convite" }));

    const email = screen.getByRole("textbox", { name: "Email institucional" });
    const cooperative = screen.getByRole("combobox", { name: "Cooperativa" });
    expect(email).toHaveFocus();
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAccessibleDescription("Informe um email institucional válido.");
    expect(cooperative).toHaveAttribute("aria-invalid", "true");
    expect(cooperative).toHaveAccessibleDescription("Selecione a cooperativa.");
    expect(await axe(container)).toHaveNoViolations();
  });
});
