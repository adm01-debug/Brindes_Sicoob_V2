/**
 * O que acontece com a tela depois que o orçamento é gravado.
 *
 * O salvamento termina navegando para o detalhe. Quando alguém edita durante a
 * chamada, essa edição não está no orçamento gravado: a saída precisa continuar
 * passando pelo aviso e a referência de versão em memória precisa acompanhar a
 * transição de status, senão o próximo salvamento é recusado.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyQuoteTransition, completeQuoteSave } from "@/hooks/useQuoteBuilderState";
import {
  autorizarSaida,
  limparRegistroDeRotas,
  saidaAutorizada,
} from "@/lib/navigation/dirty-registry";

const result = { id: "orc-1", row_version: 7 } as never;
const transicaoSemImpacto = { aplicada: true, saltosDeVersao: 0, statusVigente: null } as const;

function salvar(opcoes: {
  haEdicaoPosteriorAoEnvio?: boolean;
  isEditMode?: boolean;
  expectedRowVersion?: number | null;
  transicao?: { aplicada: boolean; saltosDeVersao: number; statusVigente: string | null };
}) {
  const navigate = vi.fn();
  const setExpectedRowVersion = vi.fn();
  const setStatusDaTela = vi.fn();
  const transicao = opcoes.transicao ?? transicaoSemImpacto;
  completeQuoteSave({
    result,
    isEditMode: opcoes.isEditMode ?? false,
    expectedRowVersion: opcoes.expectedRowVersion ?? null,
    finalStatus: "draft",
    transitionApplied: transicao.aplicada,
    saltosDeVersao: transicao.saltosDeVersao,
    statusVigente: transicao.statusVigente,
    setExpectedRowVersion,
    setStatusDaTela,
    haEdicaoPosteriorAoEnvio: () => opcoes.haEdicaoPosteriorAoEnvio ?? false,
    navigate,
  });
  return { navigate, setExpectedRowVersion, setStatusDaTela };
}

describe("saída depois de salvar o orçamento", () => {
  beforeEach(() => {
    limparRegistroDeRotas();
  });

  it("libera a saída para o detalhe quando o formulário não mudou durante o salvamento", () => {
    const { navigate } = salvar({});
    expect(navigate).toHaveBeenCalledWith("/orcamentos/orc-1");
    expect(saidaAutorizada()).toBe(true);
  });

  it("não libera a saída quando o formulário mudou durante o salvamento", () => {
    // A edição feita durante a chamada não está no orçamento gravado; quem
    // decidir sair precisa confirmar no aviso de alterações não salvas.
    const { navigate } = salvar({ haEdicaoPosteriorAoEnvio: true });
    expect(navigate).toHaveBeenCalledWith("/orcamentos/orc-1");
    expect(saidaAutorizada()).toBe(false);
  });

  it("mantém a mesma regra quando a transição de status não foi confirmada", () => {
    // Aprovação recusada depois de a reabertura já ter subido a versão: a tela
    // adota o rascunho e a versão em memória avança um salto.
    const { setExpectedRowVersion, setStatusDaTela, navigate } = salvar({
      haEdicaoPosteriorAoEnvio: true,
      isEditMode: true,
      expectedRowVersion: 7,
      transicao: { aplicada: false, saltosDeVersao: 1, statusVigente: "draft" },
    });
    expect(navigate).toHaveBeenCalledWith("/orcamentos/orc-1");
    expect(saidaAutorizada()).toBe(false);
    expect(setExpectedRowVersion).toHaveBeenCalledWith(8);
    expect(setStatusDaTela).toHaveBeenCalledWith("draft");
  });

  it("não apaga a autorização de uma saída que já estava decidida antes do salvamento", () => {
    // Quem chegou aqui já tinha respondido ao aviso (troca de template, por
    // exemplo). O salvamento não pode revogar essa resposta — quem responde é o
    // GlobalExitGuard, que limpa a autorização quando a rota muda de fato.
    autorizarSaida();
    salvar({ haEdicaoPosteriorAoEnvio: true });
    expect(saidaAutorizada()).toBe(true);
  });
});

describe("referência de versão depois de salvar", () => {
  it("acompanha os saltos que a transição de status provocou na linha", () => {
    // Orçamento recusado salvo como rascunho: a RPC reabre e sobe a versão. Sem
    // somar o salto, o próximo salvamento sairia com versão defasada.
    const { setExpectedRowVersion } = salvar({
      isEditMode: true,
      expectedRowVersion: 6,
      transicao: { aplicada: true, saltosDeVersao: 1, statusVigente: "draft" },
    });
    expect(setExpectedRowVersion).toHaveBeenCalledWith(8);
  });

  it("mantém a versão devolvida pela gravação quando não houve transição", () => {
    const { setExpectedRowVersion } = salvar({ isEditMode: true, expectedRowVersion: 6 });
    expect(setExpectedRowVersion).toHaveBeenCalledWith(7);
  });

  it("não mexe na referência em orçamento novo", () => {
    const { setExpectedRowVersion } = salvar({ isEditMode: false });
    expect(setExpectedRowVersion).not.toHaveBeenCalled();
  });
});

describe("status da tela depois de salvar", () => {
  it("acompanha a reabertura: a tela passa a enviar rascunho", () => {
    // Sem isso a próxima gravação mandaria o status antigo (recusado pela RPC
    // com "use o fluxo formal para alterar o status").
    const { setStatusDaTela } = salvar({
      isEditMode: true,
      transicao: { aplicada: true, saltosDeVersao: 1, statusVigente: "draft" },
    });
    expect(setStatusDaTela).toHaveBeenCalledWith("draft");
  });

  it("acompanha o pedido de aprovação", () => {
    const { setStatusDaTela } = salvar({
      isEditMode: true,
      transicao: { aplicada: true, saltosDeVersao: 2, statusVigente: "pending_approval" },
    });
    expect(setStatusDaTela).toHaveBeenCalledWith("pending_approval");
  });

  it("não mexe no status quando a transição não mudou nada", () => {
    const { setStatusDaTela } = salvar({ isEditMode: true });
    expect(setStatusDaTela).not.toHaveBeenCalled();
  });
});

describe("saltos de versão da transição de status", () => {
  const base = {
    quote: { id: "orc-1" } as never,
    finalStatus: "draft" as const,
    maxDiscountPercent: 10,
    realDiscountPercent: 25,
    requestApproval: vi.fn(async () => true),
  };

  it("conta um salto quando reabre um orçamento fora de rascunho", async () => {
    const updateQuoteStatus = vi.fn(async () => true);
    const transicao = await applyQuoteTransition({
      ...base,
      persistedStatus: "rejected",
      updateQuoteStatus,
    });
    expect(updateQuoteStatus).toHaveBeenCalledWith("orc-1", "draft");
    expect(transicao).toEqual({ aplicada: true, saltosDeVersao: 1, statusVigente: "draft" });
  });

  it("conta o segundo salto quando a reabertura desemboca em pedido de aprovação", async () => {
    const transicao = await applyQuoteTransition({
      ...base,
      persistedStatus: "rejected",
      finalStatus: "pending_approval",
      requestApproval: vi.fn(async () => true),
      updateQuoteStatus: vi.fn(async () => true),
    });
    expect(transicao).toEqual({ aplicada: true, saltosDeVersao: 2, statusVigente: "pending_approval" });
  });

  it("adota o rascunho e conta o salto quando a aprovação falha após a reabertura", async () => {
    const transicao = await applyQuoteTransition({
      ...base,
      persistedStatus: "rejected",
      finalStatus: "pending_approval",
      requestApproval: vi.fn(async () => false),
      updateQuoteStatus: vi.fn(async () => true),
    });
    expect(transicao).toEqual({ aplicada: false, saltosDeVersao: 1, statusVigente: "draft" });
  });

  it("não conta salto quando a transição falha", async () => {
    const transicao = await applyQuoteTransition({
      ...base,
      persistedStatus: "rejected",
      updateQuoteStatus: vi.fn(async () => false),
    });
    expect(transicao).toEqual({ aplicada: false, saltosDeVersao: 0, statusVigente: null });
  });

  it("não conta salto quando o status final já é o persistido", async () => {
    const transicao = await applyQuoteTransition({
      ...base,
      persistedStatus: "draft",
      updateQuoteStatus: vi.fn(async () => true),
    });
    expect(transicao).toEqual({ aplicada: true, saltosDeVersao: 0, statusVigente: null });
  });
});
