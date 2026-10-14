// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: toastMocks }));

import { shareCartLink } from "@/components/cart/cart-utils/CartExport";
import { RBAC_ROUTES } from "@/lib/rbac/route-matrix";
import { quoteRoutes } from "@/routes/config/quotes";

describe("rotas de carrinhos compartilháveis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registra listagem, criação e detalhe no roteador e na matriz RBAC", () => {
    const applicationPaths = quoteRoutes.map(route => route.path);
    const protectedPaths = RBAC_ROUTES
      .filter(route => route.guard === "ProtectedRoute")
      .map(route => route.path);

    expect(applicationPaths).toEqual(expect.arrayContaining([
      "/carrinhos",
      "/carrinhos/novo",
      "/carrinhos/:cartId",
    ]));
    expect(protectedPaths).toEqual(expect.arrayContaining([
      "/carrinhos",
      "/carrinhos/novo",
      "/carrinhos/:cartId",
    ]));
  });

  it("copia a URL pessoal do carrinho e informa sua restrição de acesso", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    await shareCartLink("carrinho-123");

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/carrinhos/carrinho-123`);
    expect(toastMocks.success).toHaveBeenCalledWith("Link pessoal copiado!", {
      description: "Este endereço exige login e só abre para o proprietário do carrinho.",
    });
  });

  it("informa a falha quando o navegador recusa a cópia", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("permissão negada")) },
    });

    await shareCartLink("carrinho-123");

    expect(toastMocks.error).toHaveBeenCalledWith("Não foi possível copiar o link do carrinho");
    expect(toastMocks.success).not.toHaveBeenCalled();
  });

  it("informa a indisponibilidade em navegadores sem Clipboard API", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    await shareCartLink("carrinho-123");

    expect(toastMocks.error).toHaveBeenCalledWith("Não foi possível copiar o link do carrinho");
    expect(toastMocks.success).not.toHaveBeenCalled();
  });
});
