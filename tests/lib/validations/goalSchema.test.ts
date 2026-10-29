import { describe, expect, it } from "vitest";
import { salesGoalSchema } from "@/lib/validations/goalSchema";

const validGoal = {
  title: "Meta de vendas",
  target_value: 1000,
  goal_type: "revenue",
  period: "monthly",
  start_date: "2026-10-01",
  end_date: "2026-10-31",
};

describe("salesGoalSchema", () => {
  it("preserva as mensagens de campo obrigatório sem valores", () => {
    const result = salesGoalSchema.safeParse({ ...validGoal, goal_type: undefined, period: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        "Tipo de meta é obrigatório",
        "Período é obrigatório",
      ]);
    }
  });

  it("continua aceitando os valores válidos da meta", () => {
    expect(salesGoalSchema.safeParse(validGoal).success).toBe(true);
  });
});
