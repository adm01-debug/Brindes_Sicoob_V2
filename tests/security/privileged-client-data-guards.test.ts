import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const crmBridge = readFileSync('supabase/functions/crm-db-bridge/index.ts', 'utf8');
const expertChat = readFileSync('supabase/functions/expert-chat/index.ts', 'utf8');
const appRoutes = readFileSync('src/App.tsx', 'utf8');
const quoteRoutes = readFileSync('src/routes/config/quotes.ts', 'utf8');
const sellerDashboard = readFileSync('src/pages/sicoob/vendedor/SellerDashboardPage.tsx', 'utf8');
const companySearch = readFileSync(
  'src/components/quotes/company-contact/CompanySearchDropdown.tsx',
  'utf8',
);
const companyContactSelector = readFileSync(
  'src/components/quotes/CompanyContactSelector.tsx',
  'utf8',
);

describe('barreiras estáticas para dados privilegiados de clientes', () => {
  it('carrega todos os papéis e falha fechado para vínculo inválido', () => {
    expect(crmBridge).toContain('.from("user_roles").select("role").eq("user_id", user.id)');
    expect(crmBridge).not.toContain(
      '.from("user_roles").select("role").eq("user_id", user.id).single()',
    );
    expect(crmBridge).toContain('hasActivePortalMembership(profileResult.data, userRoles)');
  });

  it('autoriza o shape completo antes de resolver a credencial service-role externa', () => {
    const authorization = crmBridge.indexOf('if (!canAccessCrmRequest(auth.userRoles, body))');
    const credentialResolution = crmBridge.indexOf(
      'const [urlRes, svcRes, anonRes]',
      authorization,
    );
    const batchDispatch = crmBridge.indexOf('if (operation === "batch")', authorization);

    expect(authorization).toBeGreaterThan(-1);
    expect(credentialResolution).toBeGreaterThan(authorization);
    expect(batchDispatch).toBeGreaterThan(authorization);
    expect(crmBridge).toContain('const parsed = CrmRequestSchema.safeParse(rawBody)');
  });

  it('protege diagnósticos detalhados e mantém ping agregado', () => {
    expect(crmBridge).toContain('if (!diagnosticAuth.userRoles.includes("dev"))');
    expect(crmBridge).toContain('status: crmWarmupCompleted ? "ready" : "starting"');
    expect(crmBridge).not.toContain('svc_last4');
    expect(crmBridge).not.toContain('anon_last4');
  });

  it('não registra valores de filtros nem previews de registros do CRM', () => {
    expect(crmBridge).not.toContain('filters=${JSON.stringify(filters)}');
    expect(crmBridge).not.toContain('preview: diagnostic.preview');
    expect(crmBridge).toContain('preview: "[redacted]"');
    expect(crmBridge).toContain('filter_keys=${filters ? Object.keys(filters)');
  });

  it('nega clientId antes da primeira busca de PII no expert-chat', () => {
    const authorization = expertChat.indexOf(
      'if (clientId && !canUseClientContext(auth.userRoles))',
    );
    const clientFetch = expertChat.indexOf('if (clientId) {', authorization);

    expect(authorization).toBeGreaterThan(-1);
    expect(clientFetch).toBeGreaterThan(authorization);
    expect(expertChat).toContain('hasActivePortalMembership(membershipProfile, auth.userRoles)');
  });

  it('mantém as rotas de clientes dentro do bloco AdminRoute', () => {
    const adminStart = appRoutes.indexOf('<Route element={<AdminRoute />}>');
    const adminEnd = appRoutes.indexOf('<Route element={<SicoobRoute />}>', adminStart);
    const clientsRoute = appRoutes.indexOf('path="/clientes"');
    const clientDetailRoute = appRoutes.indexOf('path="/clientes/:id"');

    expect(adminStart).toBeGreaterThan(-1);
    expect(clientsRoute).toBeGreaterThan(adminStart);
    expect(clientDetailRoute).toBeGreaterThan(clientsRoute);
    expect(adminEnd).toBeGreaterThan(clientDetailRoute);
  });

  it('mantém a criação de orçamento na área autenticada compartilhada', () => {
    const quoteRoutesMount = appRoutes.indexOf('{quoteRoutes.map');
    const adminStart = appRoutes.indexOf('<Route element={<AdminRoute />}>');

    expect(quoteRoutes).toContain('path: "/orcamentos/novo"');
    expect(quoteRoutesMount).toBeGreaterThan(-1);
    expect(adminStart).toBeGreaterThan(quoteRoutesMount);
  });

  it('não oferece ao vendedor atalhos para a área gerencial de clientes', () => {
    expect(sellerDashboard).not.toContain('to="/clientes"');
  });

  it('seletores de orçamento usam somente o DTO dedicado do bridge', () => {
    expect(companySearch).toContain('listQuoteDirectoryCompanies');
    expect(companySearch).not.toContain('selectCrm');
    expect(companySearch).not.toContain('searchCrm');
    expect(companyContactSelector).toContain('listQuoteDirectoryCompanies');
    expect(companyContactSelector).toContain('listQuoteDirectoryContacts');
    expect(companyContactSelector).not.toContain('contact_emails');
    expect(companyContactSelector).not.toContain('contact_phones');
    expect(crmBridge).toContain('.eq("is_customer", true)');
    expect(crmBridge).toContain('.is("deleted_at", null)');
    expect(crmBridge).toContain('.in("contact_id", contactIds)');
  });
});
