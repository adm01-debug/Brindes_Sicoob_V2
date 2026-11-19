/**
 * Catraca: `salesGoalSchema` precisa reportar as mensagens de campo obrigatório
 * em PT-BR para os enums `goal_type` e `period` quando eles chegam ausentes do
 * formulário — em Zod 4 a ausência cai em `invalid_value`, não em uma mensagem
 * genérica de tipo, e é a opção `error` do `z.enum` que mantém o texto legível
 * na UI (`src/lib/validations/goalSchema.ts:10-15`).
 *
 * Origem: PR #157 (fechada sem merge); reescrita contra a API atual da `main`.
 */
import { describe, expect, it } from "vitest";
import { salesGoalSchema } from "@/lib/validations/goalSchema";

const metaValida = {
  title: "Meta de vendas",
  target_value: 1000,
  goal_type: "revenue",
  period: "monthly",
  start_date: "2026-10-01",
  end_date: "2026-10-31",
};

const semEnums = {
  title: metaValida.title,
  target_value: metaValida.target_value,
  start_date: metaValida.start_date,
  end_date: metaValida.end_date,
};

describe("salesGoalSchema", () => {
  it("preserva as mensagens de campo obrigatório com os enums ausentes", () => {
    const result = salesGoalSchema.safeParse(semEnums);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([
        ["goal_type", "Tipo de meta é obrigatório"],
        ["period", "Período é obrigatório"],
      ]);
    }
  });

  it("preserva as mesmas mensagens com os enums explicitamente indefinidos", () => {
    const result = salesGoalSchema.safeParse({ ...semEnums, goal_type: undefined, period: undefined });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toEqual([
        "Tipo de meta é obrigatório",
        "Período é obrigatório",
      ]);
    }
  });

  it("continua aceitando os valores válidos da meta", () => {
    expect(salesGoalSchema.safeParse(metaValida).success).toBe(true);
  });
});
