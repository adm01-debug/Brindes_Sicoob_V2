import { describe, expect, it } from "vitest";
import { buildSeasonalityResult } from "@/hooks/bi/useClientSeasonality";

describe("buildSeasonalityResult — sem projeção fictícia", () => {
  it("não cria picos nem curvas quando não há histórico", () => {
    const result = buildSeasonalityResult(undefined, false);

    expect(result.isMock).toBe(false);
    expect(result.hasEnoughData).toBe(false);
    expect(result.hasIndustryData).toBe(false);
    expect(result.client).toHaveLength(12);
    expect(result.client.every((month) => month.quotesCount === 0 && month.totalRevenue === 0)).toBe(true);
    expect(result.topClientMonths).toEqual([]);
    expect(result.nextPeakMonth).toBeNull();
    expect(result.daysToNextPeak).toBeNull();
    expect(result.insight).toBeNull();
  });

  it("não projeta sazonalidade com menos de três meses observados", () => {
    const result = buildSeasonalityResult({
      clientRows: [
        { year: 2026, month: 2, quotes_count: 4, total_revenue: 800, avg_ticket: 200 },
        { year: 2026, month: 4, quotes_count: 2, total_revenue: 500, avg_ticket: 250 },
      ],
      industryRows: [],
      companiesCount: 0,
    }, false);

    expect(result.monthsCovered).toBe(2);
    expect(result.hasEnoughData).toBe(false);
    expect(result.topClientMonths).toEqual([]);
    expect(result.nextPeakMonth).toBeNull();
    expect(result.insight).toBeNull();
  });

  it("calcula os meses de pico somente a partir das linhas reais recebidas", () => {
    const result = buildSeasonalityResult({
      clientRows: [
        { year: 2026, month: 1, quotes_count: 1, total_revenue: 100, avg_ticket: 100 },
        { year: 2026, month: 4, quotes_count: 6, total_revenue: 900, avg_ticket: 150 },
        { year: 2026, month: 7, quotes_count: 3, total_revenue: 600, avg_ticket: 200 },
      ],
      industryRows: [],
      companiesCount: 0,
    }, false);

    expect(result.isMock).toBe(false);
    expect(result.hasEnoughData).toBe(true);
    expect(result.hasIndustryData).toBe(false);
    expect(result.topClientMonths.map((month) => month.month)).toEqual([4, 7, 1]);
    expect(result.topClientMonths.map((month) => month.quotesCount)).toEqual([6, 3, 1]);
    expect(result.insight).toContain("Abr-Jul-Jan");
  });
});
