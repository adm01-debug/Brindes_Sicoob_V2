import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import PWAInstallPage from "@/pages/PWAInstallPage";

vi.mock("@/hooks/usePWAInstall", () => ({
  usePWAInstall: vi.fn(),
}));

vi.mock("@/components/seo/PageSEO", () => ({
  PageSEO: () => null,
}));

const usePWAInstallMock = vi.mocked(usePWAInstall);

describe("página de instalação do PWA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa o prompt nativo quando a instalação está disponível", () => {
    const install = vi.fn();
    usePWAInstallMock.mockReturnValue({ isInstallable: true, isInstalled: false, install });

    render(<PWAInstallPage />);
    fireEvent.click(screen.getByRole("button", { name: "Instalar Aplicativo" }));

    expect(install).toHaveBeenCalledOnce();
  });

  it("mostra instruções em português quando não há prompt nativo", () => {
    usePWAInstallMock.mockReturnValue({ isInstallable: false, isInstalled: false, install: vi.fn() });

    render(<PWAInstallPage />);

    expect(screen.getByRole("heading", { name: "Como Instalar Manualmente" })).toBeInTheDocument();
    expect(screen.getByText("Desempenho")).toBeInTheDocument();
    expect(screen.getByText("Segurança")).toBeInTheDocument();
  });
});
