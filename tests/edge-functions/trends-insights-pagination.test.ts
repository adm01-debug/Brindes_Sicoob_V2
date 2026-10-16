import { describe, expect, it, vi } from "vitest";
import {
  loadAllTrendActivity,
  trendCursorFilter,
} from "../../supabase/functions/trends-insights/pagination.ts";

function row(index: number, createdAt = "2026-10-15T12:00:00.000Z") {
  return {
    id: `evento-${String(index).padStart(4, "0")}`,
    created_at: createdAt,
    value: index,
  };
}

describe("paginação dos insights de tendências", () => {
  it("carrega todas as páginas, remove sobreposição e usa o último cursor", async () => {
    const first = Array.from({ length: 1000 }, (_, index) => row(index));
    const second = [first[999]!, row(1000, "2026-10-14T12:00:00.000Z")];
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ data: first, error: null })
      .mockResolvedValueOnce({ data: second, error: null });

    const result = await loadAllTrendActivity("eventos", fetchPage);

    expect(result).toHaveLength(1001);
    expect(new Set(result.map((item) => item.id)).size).toBe(1001);
    expect(fetchPage).toHaveBeenNthCalledWith(1, null);
    expect(fetchPage).toHaveBeenNthCalledWith(2, {
      id: "evento-0999",
      created_at: "2026-10-15T12:00:00.000Z",
    });
  });

  it("propaga falha de qualquer página sem devolver totais parciais", async () => {
    const fetchPage = vi.fn()
      .mockResolvedValueOnce({ data: Array.from({ length: 1000 }, (_, index) => row(index)), error: null })
      .mockResolvedValueOnce({ data: null, error: { message: "timeout" } });

    await expect(loadAllTrendActivity("buscas", fetchPage))
      .rejects.toThrow("Falha ao consultar buscas: timeout");
  });

  it("interrompe se uma página cheia repetir o mesmo cursor", async () => {
    const page = Array.from({ length: 1000 }, (_, index) => row(index));
    const fetchPage = vi.fn().mockResolvedValue({ data: page, error: null });

    await expect(loadAllTrendActivity("eventos", fetchPage))
      .rejects.toThrow("não avançou para o próximo cursor");
  });

  it("monta o filtro keyset composto por data e id", () => {
    expect(trendCursorFilter({ id: "evento-10", created_at: "2026-10-15T12:00:00.000Z" }))
      .toBe("created_at.lt.2026-10-15T12:00:00.000Z,and(created_at.eq.2026-10-15T12:00:00.000Z,id.lt.evento-10)");
  });
});
