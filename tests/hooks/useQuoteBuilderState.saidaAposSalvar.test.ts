import { beforeEach, describe, expect, it, vi } from "vitest";

import { completeQuoteSave } from "@/hooks/useQuoteBuilderState";
import {
  autorizarSaida,
  limparRegistroDeRotas,
  saidaAutorizada,
} from "@/lib/navigation/dirty-registry";

const result = { id: "orc-1", row_version: 7 } as never;

function salvar(haEdicaoPosteriorAoEnvio: boolean, transitionApplied = true) {
  const navigate = vi.fn();
  completeQuoteSave({
    result,
    isEditMode: false,
    expectedRowVersion: null,
    finalStatus: "draft",
    transitionApplied,
    setExpectedRowVersion: () => {},
    haEdicaoPosteriorAoEnvio: () => haEdicaoPosteriorAoEnvio,
    navigate,
  });
  return navigate;
}

describe("saída depois de salvar o orçamento", () => {
  beforeEach(() => {
    limparRegistroDeRotas();
  });

  it("libera a saída para o detalhe quando o formulário não mudou durante o salvamento", () => {
    const navigate = salvar(false);
    expect(navigate).toHaveBeenCalledWith("/orcamentos/orc-1");
    expect(saidaAutorizada()).toBe(true);
  });

  it("não libera a saída quando o formulário mudou durante o salvamento", () => {
    // A edição feita durante a chamada não está no orçamento gravado; quem
    // decidir sair precisa confirmar no aviso de alterações não salvas.
    const navigate = salvar(true);
    expect(navigate).toHaveBeenCalledWith("/orcamentos/orc-1");
    expect(saidaAutorizada()).toBe(false);
  });

  it("mantém a mesma regra quando a transição de status não foi confirmada", () => {
    const navigate = salvar(true, false);
    expect(navigate).toHaveBeenCalledWith("/orcamentos/orc-1");
    expect(saidaAutorizada()).toBe(false);
  });

  it("não deixa autorização vazada de um salvamento anterior", () => {
    autorizarSaida();
    expect(saidaAutorizada()).toBe(true);
    salvar(true);
    expect(saidaAutorizada()).toBe(true);
    limparRegistroDeRotas();
    expect(saidaAutorizada()).toBe(false);
  });
});
