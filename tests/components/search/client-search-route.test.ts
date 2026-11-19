import { beforeEach, describe, expect, it, vi } from "vitest";
import { CLIENT_DETAIL_ROUTE, clientDetailPath } from "@/routes/clientRoutes";
import { executeClientSearch } from "@/components/search/useGlobalSearch";
import { fetchQuoteDirectoryCompanies } from "@/lib/crm-db";

vi.mock("@/lib/crm-db", () => ({
  fetchQuoteDirectoryCompanies: vi.fn(),
}));

const mockFetchQuoteDirectoryCompanies = vi.mocked(fetchQuoteDirectoryCompanies);

describe("rota de detalhe do cliente na busca global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("gera o destino usando o mesmo padrão registrado pelo roteador", () => {
    const clientId = "empresa-123";

    expect(CLIENT_DETAIL_ROUTE).toBe("/clientes/:id");
    expect(clientDetailPath(clientId)).toBe(
      CLIENT_DETAIL_ROUTE.replace(":id", clientId),
    );
  });

  it("codifica o identificador sem alterar o prefixo da rota", () => {
    expect(clientDetailPath("empresa/123")).toBe("/clientes/empresa%2F123");
  });

  it("faz a busca de empresas apontar para a página de detalhe registrada", async () => {
    mockFetchQuoteDirectoryCompanies.mockResolvedValue([
      {
        id: "empresa-123",
        name: "Cooperativa Sicoob",
        nome_fantasia: "Cooperativa Sicoob",
        razao_social: "Cooperativa de Crédito",
        ramo_atividade: "Cooperativa de crédito",
        cnpj: null,
        logo_url: null,
        cidade: null,
        estado: null,
      },
    ]);

    const results = await executeClientSearch({
      type: "client",
      filters: { clientName: "Sicoob" },
      keywords: [],
      originalQuery: "Sicoob",
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      type: "client",
      id: "empresa-123",
      href: CLIENT_DETAIL_ROUTE.replace(":id", "empresa-123"),
    });
  });
});
