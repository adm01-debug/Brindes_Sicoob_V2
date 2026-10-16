import { describe, expect, it } from "vitest";
import { getSlaCycleStartedAt } from "@/lib/sicoob/sla-cycle";

describe("getSlaCycleStartedAt", () => {
  const history = [
    { new_status: "escalated_to_board", created_at: "2026-10-10T12:00:00Z" },
    { new_status: "in_production", created_at: "2026-10-09T12:00:00Z" },
    { new_status: "waiting_approval", created_at: "2026-10-08T12:00:00Z" },
  ];

  it("usa o início da escalada atual, sem reaproveitar o ciclo anterior", () => {
    expect(getSlaCycleStartedAt("escalated_to_board", history)).toBe("2026-10-10T12:00:00Z");
  });

  it("usa a transição mais recente para aprovação pendente", () => {
    expect(getSlaCycleStartedAt("waiting_approval", history)).toBe("2026-10-08T12:00:00Z");
  });

  it("não estima o ciclo para status sem transição registrada", () => {
    expect(getSlaCycleStartedAt("escalated_to_board", [])).toBeUndefined();
    expect(getSlaCycleStartedAt("in_production", history)).toBeUndefined();
    expect(getSlaCycleStartedAt(null, history)).toBeUndefined();
  });
});
