/**
 * Matriz central de acesso para integrações que operam com credenciais
 * privilegiadas. As decisões usam o conjunto completo de papéis do usuário.
 */
const CRM_READ_ROLES = new Set(['dev', 'supervisor', 'admin', 'manager']);
const CRM_WRITE_ROLES = new Set(['dev', 'admin']);
const CLIENT_CONTEXT_ROLES = new Set(['dev', 'supervisor', 'admin', 'manager']);
const QUOTE_DIRECTORY_ROLES = new Set(['vendedor', 'agente']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CrmAccessRequest {
  operation?: unknown;
  table?: unknown;
  select?: unknown;
  filters?: unknown;
  orderBy?: unknown;
  limit?: unknown;
  offset?: unknown;
  search?: unknown;
  id?: unknown;
  relations?: unknown;
  count?: unknown;
  head?: unknown;
  data?: unknown;
  returning?: unknown;
  queries?: unknown;
  action?: unknown;
  companyId?: unknown;
  term?: unknown;
}

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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

/**
 * Contrato fechado do diretório de orçamento. O cliente escolhe somente a ação
 * e parâmetros escalares; tabelas, projeções e filtros são impostos pelo Edge.
 */
export function isQuoteDirectoryRequest(request: CrmAccessRequest): boolean {
  if (request.operation !== 'quote_directory') return false;
  if (request.action !== 'companies' && request.action !== 'contacts') return false;

  const forbidden = [
    request.table,
    request.id,
    request.filters,
    request.select,
    request.orderBy,
    request.search,
    request.relations,
    request.count,
    request.head,
    request.data,
    request.returning,
    request.queries,
  ];
  if (forbidden.some((value) => value !== undefined)) return false;

  if (!Number.isInteger(request.limit) || Number(request.limit) < 1) return false;
  if (request.action === 'contacts') {
    return (
      typeof request.companyId === 'string' &&
      UUID_PATTERN.test(request.companyId) &&
      request.term === undefined &&
      request.offset === undefined &&
      Number(request.limit) <= 50
    );
  }

  if (
    request.companyId !== undefined &&
    (typeof request.companyId !== 'string' || !UUID_PATTERN.test(request.companyId))
  ) return false;
  if (
    request.term !== undefined &&
    (typeof request.term !== 'string' ||
      request.term.trim().length < 2 ||
      request.term.length > 100)
  ) return false;
  return (
    Number(request.limit) <= 100 &&
    (request.offset === undefined ||
      (Number.isInteger(request.offset) && Number(request.offset) >= 0 && Number(request.offset) <= 10_000))
  );
}

function hasRelationalProjection(value: unknown): boolean {
  return typeof value === 'string' && /[():!]/.test(value);
}

function usesRelations(request: CrmAccessRequest): boolean {
  if (request.relations !== undefined) return true;
  if (hasRelationalProjection(request.select) || hasRelationalProjection(request.returning)) return true;
  if (!Array.isArray(request.queries)) return false;
  return request.queries.some((query) => isPlainRecord(query) && usesRelations(query));
}

export function canAccessCrmRequest(
  userRoles: readonly string[],
  request: CrmAccessRequest,
): boolean {
  const isDev = userRoles.includes('dev');
  if (!isDev && usesRelations(request)) return false;
  if (request.operation === 'quote_directory') {
    return (
      isQuoteDirectoryRequest(request) &&
      (canReadCrm(userRoles) || hasAllowedRole(userRoles, QUOTE_DIRECTORY_ROLES))
    );
  }
  if (
    request.operation === 'insert' ||
    request.operation === 'update' ||
    request.operation === 'delete'
  ) {
    return canWriteCrm(userRoles);
  }
  if (request.operation === 'batch') return canReadCrm(userRoles);
  if (request.operation !== 'select' && request.operation !== 'search') return false;
  return canReadCrm(userRoles);
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
