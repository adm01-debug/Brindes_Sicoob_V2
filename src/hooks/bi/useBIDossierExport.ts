/**
 * useBIDossierExport — orquestra todos os hooks do BI e gera o PDF do dossiê.
 * Aguarda todos resolverem antes de exportar (nada de PDF parcial).
 */
import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCrmCompanyStrict } from "@/hooks/useCrmCompanies";
import { useClientBI } from "@/hooks/bi/useClientBI";
import { useClientVsIndustry } from "@/hooks/bi/useClientVsIndustry";
import { useClientAffinity } from "@/hooks/bi/useClientAffinity";
import { useIndustryTrends } from "@/hooks/bi/useIndustryTrends";
import { useClientCategoryAffinity } from "@/hooks/bi/useClientCategoryAffinity";
import { useIndustryCategoryTrends } from "@/hooks/bi/useIndustryCategoryTrends";
import { resolveIndustryRecommendation } from "@/lib/bi/industryRecommendations";
import { generateBIDossierPDF, buildDossierFileName } from "@/lib/bi/dossierPdfGenerator";
import { buildCategorySection } from "@/lib/bi/executive-summary";
import { getCompanyDisplayName } from "@/types/crm";
import { isDemoClient } from "@/lib/bi/demoClient";

interface UseBIDossierExport {
  isReady: boolean;
  isError: boolean;
  errorMessage: string | null;
  failedSources: string[];
  isExporting: boolean;
  exportPDF: () => Promise<void>;
  retry: () => Promise<void>;
}

interface DossierSourceErrors {
  company: boolean;
  clientHistory: boolean;
  industryComparison: boolean;
  clientProducts: boolean;
  industryTrends: boolean;
  clientCategories: boolean;
  industryCategories: boolean;
}

function listFailedDossierSources(errors: DossierSourceErrors): string[] {
  return [
    [errors.company, "cadastro do cliente"],
    [errors.clientHistory, "histórico de pedidos do cliente"],
    [errors.industryComparison, "comparação com o setor"],
    [errors.clientProducts, "produtos já cotados pelo cliente"],
    [errors.industryTrends, "tendências do setor"],
    [errors.clientCategories, "categorias do cliente"],
    [errors.industryCategories, "categorias do setor"],
  ].flatMap(([failed, source]) => failed ? [source as string] : []);
}

function evaluateDossierReadiness(input: {
  clientId: string | null;
  hasCompany: boolean;
  loadingStates: boolean[];
  errors: DossierSourceErrors;
}): Pick<UseBIDossierExport, "isReady" | "isError" | "errorMessage" | "failedSources"> {
  const failedSources = listFailedDossierSources(input.errors);
  const isError = failedSources.length > 0;
  return {
    isReady: Boolean(input.clientId && input.hasCompany && !isError && !input.loadingStates.some(Boolean)),
    isError,
    failedSources,
    errorMessage: isError
      ? `Não foi possível carregar todos os dados necessários para o dossiê (${failedSources.join(", ")}). Tente novamente antes de exportar.`
      : null,
  };
}

function requiresIndustryData(ramo: string | null, clientId: string | null): boolean {
  return Boolean(ramo) || isDemoClient(clientId);
}

export function useBIDossierExport(clientId: string | null): UseBIDossierExport {
  const { user, profile } = useAuth();
  const companyQuery = useCrmCompanyStrict(clientId);
  const company = companyQuery.data;
  const companyLoading = companyQuery.isLoading;
  const ramo = company?.ramo_atividade ?? null;

  const clientBI = useClientBI(clientId ?? undefined);
  const vsIndustry = useClientVsIndustry(clientId, ramo);
  const affinityQ = useClientAffinity(clientId ?? undefined);
  const trendsQ = useIndustryTrends(ramo, clientId);
  const catAffinity = useClientCategoryAffinity(clientId ?? undefined);
  const catIndustry = useIndustryCategoryTrends(ramo, clientId);

  const [isExporting, setIsExporting] = useState(false);
  const industryRequired = requiresIndustryData(ramo, clientId);
  const readiness = evaluateDossierReadiness({
    clientId,
    hasCompany: Boolean(company),
    loadingStates: [
      companyLoading,
      clientBI.isLoading,
      vsIndustry.isLoading,
      affinityQ.isLoading,
      catAffinity.isLoading,
      industryRequired && trendsQ.isLoading,
      industryRequired && catIndustry.isLoading,
    ],
    errors: {
    company: companyQuery.isError,
    clientHistory: clientBI.isUnavailable,
    industryComparison: vsIndustry.isError,
    clientProducts: affinityQ.isError,
    industryTrends: industryRequired && trendsQ.isError,
    clientCategories: catAffinity.isError,
    industryCategories: industryRequired && catIndustry.isError,
    },
  });
  const { isReady, isError, errorMessage, failedSources } = readiness;

  const retry = useCallback(async () => {
    const retries: Array<Promise<unknown>> = [
      companyQuery.refetch(),
      clientBI.refetch(),
      vsIndustry.refetch(),
      affinityQ.refetch(),
      catAffinity.refetch(),
      catIndustry.refetch(),
    ];
    if (industryRequired) retries.push(trendsQ.refetch());
    await Promise.allSettled(retries);
  }, [companyQuery, clientBI, vsIndustry, affinityQ, catAffinity, catIndustry, industryRequired, trendsQ]);

  const exportPDF = useCallback(async () => {
    if (!clientId || !company || !isReady) return;
    setIsExporting(true);
    try {
      const blob = generateBIDossierPDF({
        client: {
          name: getCompanyDisplayName(company),
          cnpj: company.cnpj,
          ramo,
          cidade: company.cidade,
          estado: company.estado,
        },
        sellerName: profile?.full_name || user?.email || "—",
        clientBI,
        vsIndustry,
        affinity: affinityQ.data ?? {
          isMock: false,
          realProductsCount: 0,
          categories: [],
          topProducts: [],
        },
        industryTrends: trendsQ.data ?? {
          isMock: false,
          companiesInRamo: 0,
          trends: [],
        },
        empiricalRec: resolveIndustryRecommendation(ramo),
        categorySection: buildCategorySection(catAffinity, catIndustry),
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = buildDossierFileName(getCompanyDisplayName(company));
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  }, [
    clientId,
    company,
    isReady,
    profile,
    user,
    clientBI,
    vsIndustry,
    affinityQ.data,
    trendsQ.data,
    catAffinity,
    catIndustry,
    ramo,
  ]);

  return { isReady, isError, errorMessage, failedSources, isExporting, exportPDF, retry };
}
