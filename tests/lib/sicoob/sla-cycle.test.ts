import { describe, expect, it } from "vitest";
import { getSlaCycleStartedAt, isSlaApprovalStage } from "@/lib/sicoob/sla-cycle";

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

describe("isSlaApprovalStage", () => {
  it("conta o SLA apenas nas etapas em que a aprovação ainda governa o pedido", () => {
    expect(isSlaApprovalStage("pending")).toBe(true);
    expect(isSlaApprovalStage("waiting_approval")).toBe(true);
    expect(isSlaApprovalStage("escalated_to_board")).toBe(true);
  });

  it("não conta pedido já decidido, entregue ou cancelado como urgente", () => {
    // Sem esta guarda o cartão "SLA crítico" somava pedido em produção e
    // entregue, cujo prazo de aprovação já encerrou: número inflado na tela.
    expect(isSlaApprovalStage("approved")).toBe(false);
    expect(isSlaApprovalStage("in_production")).toBe(false);
    expect(isSlaApprovalStage("delivered")).toBe(false);
    expect(isSlaApprovalStage("completed")).toBe(false);
    expect(isSlaApprovalStage("cancelled")).toBe(false);
  });

  it("trata status ausente como fora do fluxo de aprovação", () => {
    expect(isSlaApprovalStage(null)).toBe(false);
    expect(isSlaApprovalStage(undefined)).toBe(false);
    expect(isSlaApprovalStage("")).toBe(false);
  });
});
