import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { loadTrendsActivity } from "../../src/pages/trends/trends-queries";

function query(data: unknown[], error: unknown = null) {
  return Object.assign(Promise.resolve({ data, error }), {
    select: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  });
}

describe("consultas de tendências", () => {
  beforeEach(() => vi.clearAllMocks());

  it("filtra cada evento pela coluna de autoria observada no banco", async () => {
    const views = query([{ product_id: "produto", created_at: "2026-09-22" }]);
    const searches = query([{ search_term: "caneta", created_at: "2026-09-22" }]);
    from.mockImplementation(table => table === "product_views" ? views : searches);
    const result = await loadTrendsActivity("2026-09-01", "vendedor");
    expect(views.eq).toHaveBeenCalledWith("seller_id", "vendedor");
    expect(searches.eq).toHaveBeenCalledWith("user_id", "vendedor");
    expect(searches.select).toHaveBeenCalledWith("search_term, created_at");
    expect(views.gte).toHaveBeenCalledWith("created_at", "2026-09-01");
    expect(searches.gte).toHaveBeenCalledWith("created_at", "2026-09-01");
    expect(result.views).toHaveLength(1);
    expect(result.searches).toHaveLength(1);
  });

  it("preserva a visão agregada e propaga falhas sem inventar totais zero", async () => {
    const views = query([]);
    const error = { code: "42501" };
    const searches = query([], error);
    from.mockImplementation(table => table === "product_views" ? views : searches);
    await expect(loadTrendsActivity("2026-09-01", null)).rejects.toEqual(error);
    expect(views.eq).not.toHaveBeenCalled();
    expect(searches.eq).not.toHaveBeenCalled();
  });
});
