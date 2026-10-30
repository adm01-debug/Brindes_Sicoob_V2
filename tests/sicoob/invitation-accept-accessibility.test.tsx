import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import SicoobInvitationAcceptPage from "@/pages/sicoob/SicoobInvitationAcceptPage";

vi.mock("@/components/seo/PageSEO", () => ({ PageSEO: () => null }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, refreshSession: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      invitation_id: "convite-1",
      masked_email: "c***@sicoob.com.br",
      cooperative_name: "Sicoob Teste",
      pa_name: "PA Centro",
      pa_code: "001",
      invited_role: "comprador_pac",
      invitation_status: "pending",
      invitation_expires_at: "2026-10-01T12:00:00Z",
    },
    isLoading: false,
    error: null,
  }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

describe("aceite de convite acessível", () => {
  it("possui título principal, ação nomeada e nenhuma violação axe", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/convite/token-valido"]}>
        <Routes><Route path="/convite/:token" element={<SicoobInvitationAcceptPage />} /></Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Convite institucional" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Entrar com o email convidado" })).toHaveAttribute("href", expect.stringContaining("redirect="));
    expect(await axe(container)).toHaveNoViolations();
  });
});
