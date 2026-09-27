import { describe, expect, it } from "vitest";
import { ensureQuoteMutationApplied, ensureQuotesAreAccessible } from "@/hooks/quotes/quoteStatusMutationGuards";

describe("quoteStatusMutationGuards", () => {
  it("recusa atualização sem linha retornada", () => {
    expect(() => ensureQuoteMutationApplied([], null, 1, "desatualizado")).toThrow("desatualizado");
  });

  it("preserva a falha retornada pelo banco", () => {
    const failure = Object.assign(new Error("RLS recusou"), { code: "42501" });
    expect(() => ensureQuoteMutationApplied(null, failure, 1, "desatualizado")).toThrow("RLS recusou");
  });

  it("recusa lote parcial antes do registro do histórico", () => {
    expect(() => ensureQuotesAreAccessible([{ id: "q1" }], 2)).toThrow(/não foram encontrados/i);
    expect(() => ensureQuoteMutationApplied([{ id: "q1" }], null, 2, "concorrência")).toThrow("concorrência");
  });

  it("aceita somente o número exato de linhas", () => {
    expect(() => ensureQuotesAreAccessible([{ id: "q1" }, { id: "q2" }], 2)).not.toThrow();
    expect(() => ensureQuoteMutationApplied([{ id: "q1" }, { id: "q2" }], null, 2, "concorrência")).not.toThrow();
  });
});
