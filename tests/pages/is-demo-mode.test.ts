import { beforeEach, describe, expect, it } from "vitest";
import { isDemoMode } from "@/pages/trends/is-demo-mode";

describe("modo de demonstração de Tendências", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/tendencias");
  });

  it("usa dados reais por padrão", () => {
    expect(isDemoMode()).toBe(false);
  });

  it("ativa dados de demonstração apenas por opt-in explícito", () => {
    window.history.replaceState({}, "", "/tendencias?demo=1");
    expect(isDemoMode()).toBe(true);
  });

  it("aceita o valor textual true e ignora outros valores", () => {
    window.history.replaceState({}, "", "/tendencias?demo=true");
    expect(isDemoMode()).toBe(true);

    window.history.replaceState({}, "", "/tendencias?demo=0");
    expect(isDemoMode()).toBe(false);

    window.history.replaceState({}, "", "/tendencias?demo=qualquer-coisa");
    expect(isDemoMode()).toBe(false);
  });
});
