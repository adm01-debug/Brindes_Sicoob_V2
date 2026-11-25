import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const offline = readFileSync("public/offline.html", "utf8");

describe("pagina offline do service worker", () => {
  it("oferece as duas saidas: tentar de novo e voltar para a lista de orcamentos", () => {
    // Sem a segunda opcao o usuario que perde conexao no meio do orcamento fica
    // preso na pagina de fallback: o alerta do app (com "Voltar para orcamentos")
    // nunca chega a renderizar.
    expect(offline).toContain('onclick="location.reload()"');
    expect(offline).toContain('href="/orcamentos/lista"');
  });

  it("mantem o fallback identificavel pelos testes do service worker", () => {
    expect(offline).toContain('data-testid="offline-fallback"');
    expect(offline).toContain('<style>');
  });
});
