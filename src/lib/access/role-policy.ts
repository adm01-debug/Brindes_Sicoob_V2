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
  '/gestor/compras': MANAGERS,
  '/gestor/agregados': MANAGERS,
  '/gestor/aprovacoes': MANAGERS,
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
