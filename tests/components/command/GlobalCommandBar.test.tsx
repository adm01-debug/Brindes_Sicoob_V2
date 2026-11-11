/**
 * Tests for GlobalCommandBar (644 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ isDev: false, isAdmin: false, roles: ["agente"] }),
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: vi.fn().mockReturnValue({
    theme: "light",
    actualTheme: "light",
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

describe("GlobalCommandBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports GlobalCommandBar component", async () => {
    const mod = await import("@/components/command/GlobalCommandBar");
    expect(mod.GlobalCommandBar).toBeDefined();
    expect(["function", "object"].includes(typeof mod.GlobalCommandBar)).toBe(true);
  });

  it("exports useCommandBar hook", async () => {
    const { useCommandBar } = await import("@/components/command/GlobalCommandBar");
    expect(typeof useCommandBar).toBe("function");
  });

  it("abre a barra global com Ctrl+K", async () => {
    const { GlobalCommandBar } = await import("@/components/command/GlobalCommandBar");
    renderWithProviders(<GlobalCommandBar />);

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("mantém Ctrl+K exclusivo e reserva Ctrl+Shift+P para o spotlight", async () => {
    const [{ GlobalCommandBar }, { EnhancedSpotlight, EnhancedSpotlightTrigger }] = await Promise.all([
      import("@/components/command/GlobalCommandBar"),
      import("@/components/common/EnhancedSpotlight"),
    ]);
    renderWithProviders(
      <>
        <GlobalCommandBar />
        <EnhancedSpotlight />
        <EnhancedSpotlightTrigger />
      </>,
    );

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Buscar ações, páginas, ferramentas...")).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    fireEvent.keyDown(document, { key: "p", ctrlKey: true, shiftKey: true });

    expect(
      await screen.findByPlaceholderText("Buscar ações, páginas, ferramentas..."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Buscar ações (Ctrl+Shift+P)" }));
    expect(
      await screen.findByPlaceholderText("Buscar ações, páginas, ferramentas..."),
    ).toBeInTheDocument();
  });
});
