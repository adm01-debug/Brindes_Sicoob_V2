import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const crmBridge = read("supabase/functions/crm-db-bridge/index.ts");
const expertChat = read("supabase/functions/expert-chat/index.ts");
const appRoutes = read("src/App.tsx");
const quoteRoutes = read("src/routes/config/quotes.ts");
const clientRoutes = read("src/routes/clientRoutes.ts");
const companySearch = read("src/components/quotes/company-contact/CompanySearchDropdown.tsx");
const companyContactSelector = read("src/components/quotes/CompanyContactSelector.tsx");
const cartCompanyOptions = read("src/components/cart/cart-company-options.ts");
const cartCompanyPicker = read("src/components/cart/CartCompanyPicker.tsx");
const cartCompanyPickerDialog = read("src/components/cart/CartCompanyPickerDialog.tsx");

describe("barreiras estaticas para dados privilegiados de clientes", () => {
  it("carrega todos os papeis e falha fechado para vinculo invalido", () => {
    expect(crmBridge).toContain('.from("user_roles").select("role").eq("user_id", user.id)');
    expect(crmBridge).not.toContain(
      '.from("user_roles").select("role").eq("user_id", user.id).single()',
    );
    expect(crmBridge).toContain("hasActivePortalMembership(profileResult.data, userRoles)");
  });

  it("autoriza o shape completo antes de resolver a credencial service-role externa", () => {
    const authorization = crmBridge.indexOf("if (!canAccessCrmRequest(auth.userRoles, body))");
    const credentialResolution = crmBridge.indexOf(
      "const [urlRes, svcRes, anonRes]",
      authorization,
    );
    const batchDispatch = crmBridge.indexOf('if (operation === "batch")', authorization);

    expect(authorization).toBeGreaterThan(-1);
    expect(credentialResolution).toBeGreaterThan(authorization);
    expect(batchDispatch).toBeGreaterThan(authorization);
    expect(crmBridge).toContain("const parsed = CrmRequestSchema.safeParse(rawBody)");
  });

  it("protege diagnosticos detalhados e mantem ping agregado", () => {
    expect(crmBridge).toContain('if (!diagnosticAuth.userRoles.includes("dev"))');
    expect(crmBridge).not.toContain("svc_last4");
    expect(crmBridge).not.toContain("anon_last4");
  });

  it("nao registra valores de filtros nem previews de registros do CRM", () => {
    expect(crmBridge).not.toContain("filters=${JSON.stringify(filters)}");
    expect(crmBridge).not.toContain("preview: diagnostic.preview");
    expect(crmBridge).toContain('preview: "[redacted]"');
  });

  it("nega clientId antes da primeira busca de PII no expert-chat", () => {
    const authorization = expertChat.indexOf("if (clientId && !canUseClientContext(auth.userRoles))");
    const clientFetch = expertChat.indexOf("if (clientId) {", authorization);

    expect(authorization).toBeGreaterThan(-1);
    expect(clientFetch).toBeGreaterThan(authorization);
    expect(expertChat).toContain("hasActivePortalMembership(membershipProfile, auth.userRoles)");
  });

  it("mantem as rotas de clientes dentro do bloco AdminRoute", () => {
    const adminStart = appRoutes.indexOf("<Route element={<AdminRoute />}>");
    const clientsRoute = appRoutes.indexOf('path="/clientes"');
    const clientDetailRoute = appRoutes.indexOf("path={CLIENT_DETAIL_ROUTE}");

    expect(adminStart).toBeGreaterThan(-1);
    expect(clientsRoute).toBeGreaterThan(adminStart);
    expect(clientDetailRoute).toBeGreaterThan(clientsRoute);
    expect(clientRoutes).toContain('CLIENT_DETAIL_ROUTE = "/clientes/:id"');
  });

  it("mantem a criacao de orcamento na area autenticada compartilhada", () => {
    const quoteRoutesMount = appRoutes.indexOf("{quoteRoutes.map");
    const adminStart = appRoutes.indexOf("<Route element={<AdminRoute />}>");

    expect(quoteRoutes).toContain('path: "/orcamentos/novo"');
    expect(quoteRoutesMount).toBeGreaterThan(-1);
    expect(adminStart).toBeGreaterThan(quoteRoutesMount);
  });

  it("seletores de orcamento usam somente o DTO dedicado do bridge", () => {
    expect(companySearch).toContain("fetchQuoteDirectoryCompanies");
    expect(companySearch).not.toContain("searchCrm(");
    expect(companyContactSelector).toContain("fetchQuoteDirectoryCompanies");
    expect(companyContactSelector).toContain("fetchQuoteDirectoryContacts");
    expect(companyContactSelector).not.toContain("contact_emails");
    expect(companyContactSelector).not.toContain("contact_phones");
    expect(crmBridge).toContain('.eq("is_customer", true)');
    expect(crmBridge).toContain('.is("deleted_at", null)');
    expect(crmBridge).toContain('.in("contact_id", contactIds)');
    expect(crmBridge).toContain('"cnpj", "ramo_atividade"');
  });

  it("seletores de carrinho usam o diretorio restrito e nao o CRM generico", () => {
    expect(cartCompanyOptions).toContain("fetchQuoteDirectoryCompanies");
    expect(cartCompanyOptions).toContain("PAGE_SIZE");
    expect(cartCompanyOptions).toContain("offset");
    expect(cartCompanyOptions).not.toContain("selectCrm(");
    expect(cartCompanyOptions).not.toContain("searchCrm(");
    for (const picker of [cartCompanyPicker, cartCompanyPickerDialog]) {
      expect(picker).toContain("fetchCartCompanyOptions");
      expect(picker).not.toContain("selectCrm(");
      expect(picker).not.toContain("searchCrm(");
      expect(picker).toContain('queryKey: ["cart-sicoob-company-options"]');
      expect(picker).toContain('role="alert"');
      expect(picker).toContain("Tentar novamente");
    }
  });
});
