import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

import {
  fetchPublicFavoriteList,
  fetchPublicFavoriteReactions,
  parsePublicFavoriteListResponse,
} from "@/services/favorites/publicFavoriteListService";

const validPayload = {
  list: {
    id: "list-1",
    name: "Seleção Sicoob",
    description: null,
    color: "#00a651",
    shared_expires_at: null,
  },
  items: [
    {
      id: "item-1",
      product_id: "product-1",
      variant_info: { color_name: "Verde", thumbnail: null },
      note: null,
      added_at: "2026-10-31T00:00:00Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("lista pública de favoritos", () => {
  it("consulta uma única RPC limitada pelo token e retorna lista e itens", async () => {
    mocks.rpc.mockResolvedValue({ data: validPayload, error: null });

    await expect(fetchPublicFavoriteList("x".repeat(48))).resolves.toEqual(validPayload);

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_public_favorite_list", {
      _token: "x".repeat(48),
    });
  });

  it("não consulta a RPC quando o token não existe", async () => {
    await expect(fetchPublicFavoriteList()).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("preserva lista inexistente ou expirada como resposta vazia", () => {
    expect(parsePublicFavoriteListResponse(null)).toBeNull();
  });

  it("rejeita resposta fora do contrato da RPC", () => {
    expect(() => parsePublicFavoriteListResponse({ list: {}, items: [] })).toThrow(
      "Resposta inválida da lista pública de favoritos.",
    );
  });

  it("propaga falhas de autorização ou disponibilidade da RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("permission denied") });

    await expect(fetchPublicFavoriteList("x".repeat(48))).rejects.toThrow("permission denied");
  });

  it("consulta reações pela RPC e só recebe o pseudônimo do visitante atual", async () => {
    const reactions = [{ item_id: "item-1", emoji: "❤️", anon_id: "visitante-123" }];
    mocks.rpc.mockResolvedValue({ data: reactions, error: null });

    await expect(fetchPublicFavoriteReactions("x".repeat(48), "visitante-123"))
      .resolves.toEqual(reactions);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("get_public_favorite_reactions", {
      _token: "x".repeat(48),
      _anon_id: "visitante-123",
    });
  });

  it("não consulta reações sem token ou identidade anônima", async () => {
    await expect(fetchPublicFavoriteReactions(null, "visitante-123")).resolves.toEqual([]);
    await expect(fetchPublicFavoriteReactions("x".repeat(48))).resolves.toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
