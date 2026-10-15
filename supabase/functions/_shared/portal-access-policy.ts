/**
 * Matriz central de acesso para integrações que operam com credenciais
 * privilegiadas. As decisões usam o conjunto completo de papéis do usuário.
 */
const CRM_READ_ROLES = new Set(['dev', 'supervisor', 'admin', 'manager']);
const CRM_WRITE_ROLES = new Set(['dev', 'admin']);
const CLIENT_CONTEXT_ROLES = new Set(['dev', 'supervisor', 'admin', 'manager']);

export interface PortalMembershipProfile {
  is_active?: boolean | null;
  deleted_at?: string | null;
}

function hasAllowedRole(userRoles: readonly string[], allowedRoles: ReadonlySet<string>): boolean {
  return userRoles.some((role) => allowedRoles.has(role));
}

export function canReadCrm(userRoles: readonly string[]): boolean {
  return hasAllowedRole(userRoles, CRM_READ_ROLES);
}

export function canWriteCrm(userRoles: readonly string[]): boolean {
  return hasAllowedRole(userRoles, CRM_WRITE_ROLES);
}

/**
 * Ainda não existe vínculo canônico entre vendedor e company_id do CRM externo.
 * Até esse vínculo existir, o contexto de cliente fica limitado a papéis de
 * supervisão (incluindo aliases legados admin/manager).
 */
export function canUseClientContext(userRoles: readonly string[]): boolean {
  return hasAllowedRole(userRoles, CLIENT_CONTEXT_ROLES);
}

export function hasActivePortalMembership(
  profile: PortalMembershipProfile | null | undefined,
  userRoles: readonly string[],
): boolean {
  return Boolean(
    profile && profile.is_active === true && profile.deleted_at == null && userRoles.length > 0,
  );
}
