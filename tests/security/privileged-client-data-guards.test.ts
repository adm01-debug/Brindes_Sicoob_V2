import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

/** Linha do `</Route>` que fecha o bloco `<Route element={<AdminRoute />}>`, contando aninhamento. */
function adminBlockEnd(lines: string[]): number {
  const start = lines.findIndex((line) => line.trim() === "<Route element={<AdminRoute />}>");
  if (start === -1) return -1;
  let depth = 0;
  for (let i = start; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("<Route") && !trimmed.endsWith("/>")) depth += 1;
    else if (trimmed === "</Route>") depth -= 1;
    if (depth === 0 && i > start) return i;
  }
  return -1;
}

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
    const code = crmBridge
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("import "))
      .join("\n");
    const authorization = code.indexOf("if (!canAccessCrmRequest(auth.userRoles, body))");
    const credentialResolution = code.indexOf("const [urlRes, svcRes, anonRes]");
    const batchDispatch = code.indexOf('if (operation === "batch")');
    const serviceClient = code.indexOf("const adminClient = createClient(supabaseUrl, supabaseServiceKey)");

    expect(authorization).toBeGreaterThan(-1);
    // Primeira ocorrência do arquivo, não a partir da autorização: nada de credencial
    // ou despacho em lote antes da checagem de papel.
    expect(credentialResolution).toBeGreaterThan(authorization);
    expect(batchDispatch).toBeGreaterThan(authorization);
    // Cliente criado com `createClient(url, key)` só existe dentro do helper interno,
    // alimentado pelas credenciais resolvidas depois da autorização.
    expect(code).not.toMatch(/createClient\(\s*["'`]/);
    expect(serviceClient).toBeGreaterThan(-1);
    expect(crmBridge).toContain("const parsed = CrmRequestSchema.safeParse(rawBody)");
  });

  it("protege diagnosticos detalhados e mantem ping agregado", () => {
    expect(crmBridge).toContain('if (!diagnosticAuth.userRoles.includes("dev"))');
    expect(crmBridge).not.toContain("svc_last4");
    expect(crmBridge).not.toContain("anon_last4");

    // Contrato do ping sem autenticação: só `ok` e `status`, nunca o snapshot.
    const ping = crmBridge.indexOf('if (diagOp === "ping") {');
    const pingResponse = crmBridge.slice(ping, crmBridge.indexOf("if (diagOp) {", ping));
    expect(ping).toBeGreaterThan(-1);
    expect(pingResponse).toContain(
      'jsonResponse({ ok: true, status: crmWarmupCompleted ? "ready" : "starting" })',
    );
    expect(pingResponse).not.toContain("buildDiagSnapshot");
  });

  it("nao registra valores de filtros nem previews de registros do CRM", () => {
    expect(crmBridge).not.toContain("filters=${JSON.stringify(filters)}");
    expect(crmBridge).not.toContain("preview: diagnostic.preview");
    expect(crmBridge).toContain('preview: "[redacted]"');
  });

  it("nega clientId antes da primeira busca de PII no expert-chat", () => {
    const authorization = expertChat.indexOf("if (clientId && !canUseClientContext(auth.userRoles))");
    const auditInsert = expertChat.indexOf("if (clientId) {");
    const clientDataFetch = expertChat.indexOf("// ── Client data fetch ──");
    const credentialResolution = expertChat.indexOf('resolveCredential("EXTERNAL_CRM_URL")');

    expect(authorization).toBeGreaterThan(-1);
    expect(auditInsert).toBeGreaterThan(authorization);
    // O `if (clientId)` logo após a autorização só registra auditoria: o que prova
    // a barreira é o bloco de dados e a resolução da credencial do CRM externo.
    expect(clientDataFetch).toBeGreaterThan(authorization);
    expect(credentialResolution).toBeGreaterThan(clientDataFetch);
    expect(expertChat).toContain("hasActivePortalMembership(membershipProfile, auth.userRoles)");
  });

  it("monta as rotas de clientes uma unica vez, fora do bloco AdminRoute", () => {
    const lines = appRoutes.split(/\r?\n/);
    const adminStart = lines.findIndex((line) => line.trim() === "<Route element={<AdminRoute />}>");
    const adminEnd = adminBlockEnd(lines);
    const clientsRoutes = lines.filter((line) => line.includes('path="/clientes"'));
    const detailRoutes = lines.filter((line) => line.includes("path={CLIENT_DETAIL_ROUTE}"));
    const clientsRoute = lines.indexOf(clientsRoutes[0] ?? "");
    const clientDetailRoute = lines.findIndex((line) => line.includes("path={CLIENT_DETAIL_ROUTE}"));

    expect(adminStart).toBeGreaterThan(-1);
    expect(adminEnd).toBeGreaterThan(adminStart);
    // Realidade verificada: clientes vivem na area autenticada compartilhada (MainLayout),
    // nao no bloco exclusivo de admin. O risco estatico e duplicacao de rota, que criaria
    // um segundo caminho sem a guarda aplicada ao primeiro.
    expect(clientsRoutes.length).toBe(1);
    expect(detailRoutes.length).toBe(1);
    expect(clientsRoute).toBeGreaterThan(adminEnd);
    expect(clientDetailRoute).toBeGreaterThan(adminEnd);
    expect(clientRoutes).toContain('CLIENT_DETAIL_ROUTE = "/clientes/:id"');
  });

  it("mantem a criacao de orcamento na area autenticada compartilhada", () => {
    const lines = appRoutes.split(/\r?\n/);
    const adminStart = lines.findIndex((line) => line.trim() === "<Route element={<AdminRoute />}>");
    const adminEnd = adminBlockEnd(lines);
    const authenticatedShell = lines.findIndex((line) => line.includes("<AuthenticatedShell />"));
    const quoteRoutesMount = lines.findIndex((line) => line.includes("{quoteRoutes.map"));

    expect(quoteRoutes).toContain('path: "/orcamentos/novo"');
    expect(quoteRoutesMount).toBeGreaterThan(-1);
    expect(adminStart).toBeGreaterThan(-1);
    expect(adminEnd).toBeGreaterThan(adminStart);
    // Area autenticada compartilhada: fora do bloco exclusivo de admin e dentro do shell.
    expect(quoteRoutesMount < adminStart || quoteRoutesMount > adminEnd).toBe(true);
    expect(authenticatedShell).toBeGreaterThan(-1);
    expect(authenticatedShell).toBeLessThan(quoteRoutesMount);
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
