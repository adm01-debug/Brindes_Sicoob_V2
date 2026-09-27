import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { SicoobRoute } from '@/components/layout/SicoobRoute';
import { SICOOB_ROUTE_ACCESS } from '@/lib/access/role-policy';
import { sicoobRoutes } from '@/routes/config/sicoob';

const mockAuth = vi.hoisted(() => vi.fn());
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockAuth }));
function mostrar(path: string, roles: string[], extra = {}) {
  mockAuth.mockReturnValue({ user: { id: 'usuario-teste' }, roles, rolesLoaded: true, rolesError: null, isLoading: false, profile: { role: 'dev' }, ...extra });
  render(<MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/login" element={<p>Entrar</p>} />
      <Route path="/403" element={<p>Acesso negado</p>} />
      <Route element={<ProtectedRoute />}><Route element={<SicoobRoute />}><Route path={path} element={<p>Conteúdo autorizado</p>} /></Route></Route>
    </Routes>
  </MemoryRouter>);
}

describe('Cenários reais dos guards de compras', () => {
  it.each([
    ['/pa/verba','comprador_pac'], ['/dashboard-pa','gerente_pa'], ['/sicoob/pedidos','comprador_pac'],
    ['/sicoob/pedidos/pedido-teste','vendedor'], ['/gestor/aprovacoes','gestor_compras'],
    ['/gestor/aprovacoes','gerente_pa'], ['/gestor/aprovacoes','comprador_pac'],
    ['/gestor','comprador_singular'], ['/gestor/agregados','gerente_pa'],
    ['/gestor/agregados','comprador_pac'], ['/gestor/convites','gestor_compras'],
    ['/gestor/convites','comprador_singular'], ['/vendedor/dashboard','vendedor'],
  ])('%s permite o papel atribuído %s', (path, role) => {
    mostrar(path, [role]);
    expect(screen.getByText('Conteúdo autorizado')).toBeInTheDocument();
  });
  it.each([
    ['/gestor/auditoria','gerente_pa'], ['/sicoob/vendas','comprador_pac'],
    ['/pa/verba','vendedor'], ['/gestor/convites','gerente_pa'],
    ['/relatorios/sicoob','agente'], ['/rota-sem-politica','dev'],
  ])('%s recusa %s mesmo com profiles.role=dev', (path, role) => {
    mostrar(path, [role]);
    expect(screen.getByText('Acesso negado')).toBeInTheDocument();
  });
  it('considera todos os papéis, sem depender da ordem', () => {
    mostrar('/gestor', ['comprador_pac','comprador_singular']);
    expect(screen.getByText('Conteúdo autorizado')).toBeInTheDocument();
  });
  it('aguarda permissões sem renderizar conteúdo', () => {
    mostrar('/gestor', ['dev'], { rolesLoaded: false });
    expect(screen.queryByText('Conteúdo autorizado')).not.toBeInTheDocument();
    expect(screen.getByText('Carregando permissões...')).toBeInTheDocument();
  });
  it('oferece recuperação quando a consulta de permissões falha', () => {
    mostrar('/pa/verba', [], { rolesError: 'Falha simulada', refreshSession: vi.fn(), signOut: vi.fn() });
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    expect(screen.queryByText('Conteúdo autorizado')).not.toBeInTheDocument();
  });
  it('exige sessão e papéis atribuídos', () => {
    mostrar('/pa/verba', [], { user: null });
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });
  it('toda rota de negócio possui política e nenhuma rota técnica fica nesse grupo', () => {
    for (const route of sicoobRoutes) {
      expect(SICOOB_ROUTE_ACCESS[route.path]?.length).toBeGreaterThan(0);
      expect(route.path).not.toMatch(/^(?:\/admin\/|\/qa\/)/);
    }
    expect(new Set(sicoobRoutes.map(route => route.path)).size).toBe(sicoobRoutes.length);
  });
});
