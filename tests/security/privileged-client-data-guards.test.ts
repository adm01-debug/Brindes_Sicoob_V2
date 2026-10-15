import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const crmBridge = readFileSync('supabase/functions/crm-db-bridge/index.ts', 'utf8');
const expertChat = readFileSync('supabase/functions/expert-chat/index.ts', 'utf8');
const appRoutes = readFileSync('src/App.tsx', 'utf8');
const sellerDashboard = readFileSync('src/pages/sicoob/vendedor/SellerDashboardPage.tsx', 'utf8');

describe('barreiras estáticas para dados privilegiados de clientes', () => {
  it('carrega todos os papéis e falha fechado para vínculo inválido', () => {
    expect(crmBridge).toContain('.from("user_roles").select("role").eq("user_id", user.id)');
    expect(crmBridge).not.toContain(
      '.from("user_roles").select("role").eq("user_id", user.id).single()',
    );
    expect(crmBridge).toContain('hasActivePortalMembership(profileResult.data, userRoles)');
  });

  it('autoriza leitura antes de resolver a credencial service-role externa', () => {
    const authorization = crmBridge.indexOf('if (!canReadCrm(auth.userRoles))');
    const credentialResolution = crmBridge.indexOf(
      'const [urlRes, svcRes, anonRes]',
      authorization,
    );
    const batchDispatch = crmBridge.indexOf('if (operation === "batch")', authorization);

    expect(authorization).toBeGreaterThan(-1);
    expect(credentialResolution).toBeGreaterThan(authorization);
    expect(batchDispatch).toBeGreaterThan(authorization);
    expect(crmBridge).toContain('!canWriteCrm(auth.userRoles)');
  });

  it('protege diagnósticos detalhados e mantém ping agregado', () => {
    expect(crmBridge).toContain('if (!diagnosticAuth.userRoles.includes("dev"))');
    expect(crmBridge).toContain('status: crmWarmupCompleted ? "ready" : "starting"');
    expect(crmBridge).not.toContain('svc_last4');
    expect(crmBridge).not.toContain('anon_last4');
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

  it('não oferece ao vendedor atalhos para a área gerencial de clientes', () => {
    expect(sellerDashboard).not.toContain('to="/clientes"');
  });
});
