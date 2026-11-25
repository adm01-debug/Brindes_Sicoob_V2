import { describe, expect, it } from "vitest";
import { salesGoalSchema } from "@/lib/validations/goalSchema";

const validGoal = {
  title: "Meta do mês",
  target_value: 1000,
  goal_type: "revenue",
  period: "monthly",
  start_date: "2026-10-01",
  end_date: "2026-10-31",
};

describe("salesGoalSchema", () => {
  it("mantém mensagens específicas quando os enums obrigatórios estão ausentes", () => {
    const result = salesGoalSchema.safeParse({ ...validGoal, goal_type: undefined, period: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((issue) => issue.path[0] === "goal_type")?.message)
        .toBe("Tipo de meta é obrigatório");
      expect(result.error.issues.find((issue) => issue.path[0] === "period")?.message)
        .toBe("Período é obrigatório");
    }
  });

  it("preserva mensagens padrão para valores de enum inválidos", () => {
    const result = salesGoalSchema.safeParse({ ...validGoal, goal_type: "invalido" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.find((issue) => issue.path[0] === "goal_type")?.message)
        .not.toBe("Tipo de meta é obrigatório");
    }
  });
});
