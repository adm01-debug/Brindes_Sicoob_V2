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

  it("com o status repetido, usa a transição mais recente — não a primeira da lista", () => {
    // Cada status aparecia uma vez só: escolher a ocorrência mais ANTIGA também
    // passaria. Aqui cada ciclo aparece duas vezes, com datas distintas.
    const comCiclosRepetidos = [
      { new_status: "escalated_to_board", created_at: "2026-10-10T12:00:00Z" },
      { new_status: "waiting_approval", created_at: "2026-10-08T12:00:00Z" },
      { new_status: "in_production", created_at: "2026-10-07T12:00:00Z" },
      { new_status: "escalated_to_board", created_at: "2026-10-02T12:00:00Z" },
      { new_status: "waiting_approval", created_at: "2026-10-01T12:00:00Z" },
    ];
    expect(getSlaCycleStartedAt("escalated_to_board", comCiclosRepetidos)).toBe("2026-10-10T12:00:00Z");
    expect(getSlaCycleStartedAt("waiting_approval", comCiclosRepetidos)).toBe("2026-10-08T12:00:00Z");
  });

  it("a escolha não depende da ordem em que o histórico chega", () => {
    // A ordem decrescente vinha do `useSicoobOrderHistory`; se aquela consulta
    // mudar, o SLA não pode passar a medir o ciclo anterior em silêncio.
    const crescente = [
      { new_status: "waiting_approval", created_at: "2026-10-01T12:00:00Z" },
      { new_status: "escalated_to_board", created_at: "2026-10-02T12:00:00Z" },
      { new_status: "waiting_approval", created_at: "2026-10-08T12:00:00Z" },
      { new_status: "escalated_to_board", created_at: "2026-10-10T12:00:00Z" },
    ];
    expect(getSlaCycleStartedAt("escalated_to_board", crescente)).toBe("2026-10-10T12:00:00Z");
    expect(getSlaCycleStartedAt("waiting_approval", crescente)).toBe("2026-10-08T12:00:00Z");
  });

  it("não estima o ciclo para status sem transição registrada", () => {
    expect(getSlaCycleStartedAt("escalated_to_board", [])).toBeUndefined();
    expect(getSlaCycleStartedAt("in_production", history)).toBeUndefined();
    expect(getSlaCycleStartedAt(null, history)).toBeUndefined();
  });
});
