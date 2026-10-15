import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useCrmCompany: vi.fn(),
  useClientBI: vi.fn(),
  useClientVsIndustry: vi.fn(),
  useClientAffinity: vi.fn(),
  useIndustryTrends: vi.fn(),
  useClientCategoryAffinity: vi.fn(),
  useIndustryCategoryTrends: vi.fn(),
  isDemoClient: vi.fn(),
  generateBIDossierPDF: vi.fn(),
  buildDossierFileName: vi.fn(),
  buildCategorySection: vi.fn(),
  resolveIndustryRecommendation: vi.fn(),
  getCompanyDisplayName: vi.fn(),
  queries: {} as Record<string, Record<string, unknown>>,
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/hooks/useCrmCompanies", () => ({ useCrmCompany: mocks.useCrmCompany }));
vi.mock("@/hooks/bi/useClientBI", () => ({ useClientBI: mocks.useClientBI }));
vi.mock("@/hooks/bi/useClientVsIndustry", () => ({ useClientVsIndustry: mocks.useClientVsIndustry }));
vi.mock("@/hooks/bi/useClientAffinity", () => ({ useClientAffinity: mocks.useClientAffinity }));
vi.mock("@/hooks/bi/useIndustryTrends", () => ({ useIndustryTrends: mocks.useIndustryTrends }));
vi.mock("@/hooks/bi/useClientCategoryAffinity", () => ({ useClientCategoryAffinity: mocks.useClientCategoryAffinity }));
vi.mock("@/hooks/bi/useIndustryCategoryTrends", () => ({ useIndustryCategoryTrends: mocks.useIndustryCategoryTrends }));
vi.mock("@/lib/bi/demoClient", () => ({ isDemoClient: mocks.isDemoClient }));
vi.mock("@/lib/bi/dossierPdfGenerator", () => ({
  generateBIDossierPDF: mocks.generateBIDossierPDF,
  buildDossierFileName: mocks.buildDossierFileName,
}));
vi.mock("@/lib/bi/executive-summary", () => ({ buildCategorySection: mocks.buildCategorySection }));
vi.mock("@/lib/bi/industryRecommendations", () => ({ resolveIndustryRecommendation: mocks.resolveIndustryRecommendation }));
vi.mock("@/types/crm", () => ({ getCompanyDisplayName: mocks.getCompanyDisplayName }));

import { useBIDossierExport } from "@/hooks/bi/useBIDossierExport";

describe("useBIDossierExport — falhas das fontes obrigatórias", () => {
  beforeEach(() => {
    mocks.queries = {
      company: { data: { id: "cliente-1", ramo_atividade: "Cooperativa" }, isLoading: false, isError: false, refetch: vi.fn() },
      clientBI: { isLoading: false, isUnavailable: false, refetch: vi.fn() },
      vsIndustry: { isLoading: false, isError: false, refetch: vi.fn() },
      affinity: { isLoading: false, isError: false, refetch: vi.fn(), data: {} },
      trends: { isLoading: false, isError: false, refetch: vi.fn(), data: {} },
      categories: { isLoading: false, isError: false, refetch: vi.fn() },
      industryCategories: { isLoading: false, isError: false, refetch: vi.fn() },
    };
    mocks.useAuth.mockReturnValue({ user: { email: "vendedor@sicoob.com.br" }, profile: { full_name: "Vendedor" } });
    mocks.useCrmCompany.mockImplementation(() => mocks.queries.company);
    mocks.useClientBI.mockImplementation(() => mocks.queries.clientBI);
    mocks.useClientVsIndustry.mockImplementation(() => mocks.queries.vsIndustry);
    mocks.useClientAffinity.mockImplementation(() => mocks.queries.affinity);
    mocks.useIndustryTrends.mockImplementation(() => mocks.queries.trends);
    mocks.useClientCategoryAffinity.mockImplementation(() => mocks.queries.categories);
    mocks.useIndustryCategoryTrends.mockImplementation(() => mocks.queries.industryCategories);
    mocks.isDemoClient.mockReturnValue(false);
    mocks.generateBIDossierPDF.mockReset().mockReturnValue(new Blob(["pdf"]));
    mocks.buildDossierFileName.mockReset().mockReturnValue("dossie.pdf");
    mocks.buildCategorySection.mockReset().mockReturnValue({});
    mocks.resolveIndustryRecommendation.mockReset().mockReturnValue(null);
    mocks.getCompanyDisplayName.mockReset().mockReturnValue("Cooperativa Teste");
  });

  it.each([
    ["cadastro", "company", "isError", "cadastro do cliente"],
    ["histórico do cliente", "clientBI", "isUnavailable", "histórico de pedidos do cliente"],
    ["comparação setorial", "vsIndustry", "isError", "comparação com o setor"],
    ["afinidade", "affinity", "isError", "produtos já cotados pelo cliente"],
    ["tendências setoriais", "trends", "isError", "tendências do setor"],
    ["categorias do cliente", "categories", "isError", "categorias do cliente"],
    ["categorias setoriais", "industryCategories", "isError", "categorias do setor"],
  ])("bloqueia a exportação quando falha a consulta de %s", async (_label, queryName, errorProperty, failedSource) => {
    (mocks.queries[queryName as string] as Record<string, unknown>)[errorProperty as string] = true;
    const { result } = renderHook(() => useBIDossierExport("cliente-1"));

    expect(result.current.isReady).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.failedSources).toContain(failedSource);
    expect(result.current.errorMessage).toContain("Tente novamente antes de exportar");
    await result.current.exportPDF();
    expect(mocks.generateBIDossierPDF).not.toHaveBeenCalled();
  });

  it("oferece retry que refaz todas as consultas necessárias", async () => {
    const { result } = renderHook(() => useBIDossierExport("cliente-1"));

    await result.current.retry();

    for (const query of Object.values(mocks.queries)) {
      expect(query.refetch).toHaveBeenCalledTimes(1);
    }
  });
});
