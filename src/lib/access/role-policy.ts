import type { AppRole } from '@/types/users';

export type RequiredRole = 'dev' | 'supervisor' | 'agente' | 'gestor_compras' | 'gerente_pa' | 'vendedor';

const BASIC_ROLES: readonly string[] = ['dev', 'supervisor', 'agente', 'vendedor', 'gestor_compras', 'comprador_singular', 'gerente_pa', 'comprador_pac'];
export function normalizeAssignedRoles(roles: readonly string[] | null | undefined): AppRole[] {
  return [...new Set((roles ?? []).map(role => role === 'admin' || role === 'manager' ? 'supervisor' : role))]
    .filter((role): role is AppRole => BASIC_ROLES.includes(role));
}

const REQUIRED_ROLES: Record<RequiredRole, readonly AppRole[]> = {
  dev: ['dev'],
  supervisor: ['dev', 'supervisor'],
  agente: BASIC_ROLES as readonly AppRole[],
  gestor_compras: ['dev', 'gestor_compras', 'comprador_singular'],
  gerente_pa: ['dev', 'supervisor', 'gestor_compras', 'comprador_singular', 'gerente_pa', 'comprador_pac'],
  vendedor: ['dev', 'supervisor', 'vendedor'],
};

export function hasRequiredRole(roles: readonly string[], required: RequiredRole = 'agente'): boolean {
  return normalizeAssignedRoles(roles).some(role => REQUIRED_ROLES[required].includes(role));
}

const MANAGERS: readonly AppRole[] = ['dev', 'supervisor', 'gestor_compras', 'comprador_singular'];
const PA_ROLES: readonly AppRole[] = [...MANAGERS, 'gerente_pa', 'comprador_pac'];
const ORDER_ROLES: readonly AppRole[] = [...PA_ROLES, 'vendedor'];

// Define acesso à tela. O escopo dos dados e a decisão de compra pertencem ao servidor.
export const SICOOB_ROUTE_ACCESS: Record<string, readonly AppRole[]> = {
  '/pa/verba': PA_ROLES,
  '/dashboard-pa': PA_ROLES,
  '/gestor': MANAGERS,
  '/gestor/orcamentos': MANAGERS,
  '/gestor/compras': MANAGERS,
  '/gestor/agregados': PA_ROLES,
  '/gestor/convites': MANAGERS,
  '/gestor/aprovacoes': PA_ROLES,
  '/gestor/delegacoes': MANAGERS,
  '/gestor/auditoria': MANAGERS,
  '/vendedor/dashboard': ['dev', 'supervisor', 'vendedor'],
  '/relatorios/sicoob': MANAGERS,
  '/kpis/sicoob': MANAGERS,
  '/sicoob/pedidos': ORDER_ROLES,
  '/sicoob/pedidos/kanban': ORDER_ROLES,
  '/sicoob/pedidos/:id': ORDER_ROLES,
  '/sicoob/logistica': MANAGERS,
  '/sicoob/vendas': ['dev', 'supervisor', 'vendedor'],
};

function matchesRoutePattern(pattern: string, pathname: string): boolean {
  const expected = pattern.toLocaleLowerCase('pt-BR').split('/').filter(Boolean);
  const actual = pathname.split('?')[0]?.toLocaleLowerCase('pt-BR').split('/').filter(Boolean) ?? [];
  return expected.length === actual.length && expected.every((part, index) => (
    part.startsWith(':') || part === actual[index]
  ));
}

export function rolesForSicoobPath(pathname: string): readonly AppRole[] {
  return Object.entries(SICOOB_ROUTE_ACCESS)
    .find(([pattern]) => matchesRoutePattern(pattern, pathname))?.[1] ?? [];
}

export function canAccessSicoobPath(pathname: string, roles: readonly string[]): boolean {
  const requiredRoles = rolesForSicoobPath(pathname);
  if (requiredRoles.length === 0) return true;
  return normalizeAssignedRoles(roles).some((role) => requiredRoles.includes(role));
}
