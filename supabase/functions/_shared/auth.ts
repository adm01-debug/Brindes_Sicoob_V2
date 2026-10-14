// supabase/functions/_shared/auth.ts
// Centralized authentication for Edge Functions

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export interface AuthResult {
  userId: string;
  /** Primeira role retornada (compat). Para checagens, prefira `userRoles` ou `requireDev`. */
  userRole: string;
  /** Todas as roles do usuário (dev, supervisor, agente, admin legado). */
  userRoles: string[];
  localServiceClient: SupabaseClient;
}

export type UserAuthenticationResult =
  | { ok: true; userId: string; error: null }
  | { ok: false; userId: null; error: string };

/** Valida apenas a identidade JWT, sem consultar papéis nem usar service role. */
export async function authenticateUser(req: Request): Promise<UserAuthenticationResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, userId: null, error: 'Não autorizado' };
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { ok: false, userId: null, error: 'Token inválido' };

  return { ok: true, userId: data.user.id, error: null };
}

/**
 * Authenticate a request using the Authorization header (JWT).
 * Returns the user ID, all roles, and a service-role client for further queries.
 * Throws an object with { status, message } on failure.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authentication = await authenticateUser(req);
  if (!authentication.ok) {
    const message = authentication.error === 'Não autorizado'
      ? 'Token de autenticação ausente'
      : 'Token inválido ou expirado';
    throw { status: 401, message };
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userId = authentication.userId;

  // Fetch ALL roles using service role client (bypasses RLS)
  const localServiceClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: roleRows, error: roleError } = await localServiceClient
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  if (roleError) {
    console.error('[auth] Error fetching user roles:', roleError.message);
  }

  const userRoles = (roleRows ?? []).map((r: { role: string }) => r.role);
  const userRole = userRoles[0] ?? 'agente';

  return { userId, userRole, userRoles, localServiceClient };
}

/**
 * Hierarquia: dev > supervisor > agente. `admin` é alias legado de supervisor.
 */
function isDevRole(auth: AuthResult): boolean {
  return auth.userRoles.includes('dev');
}

function isSupervisorOrAbove(auth: AuthResult): boolean {
  return (
    auth.userRoles.includes('dev') ||
    auth.userRoles.includes('supervisor') ||
    auth.userRoles.includes('admin')
  );
}

/**
 * Require the user to have a specific role.
 * `dev` sempre passa (top da hierarquia).
 * `admin` (legado) e `supervisor` são equivalentes.
 */
export function requireRole(auth: AuthResult, requiredRole: string): void {
  if (isDevRole(auth)) return;
  if (requiredRole === 'admin' || requiredRole === 'supervisor') {
    if (isSupervisorOrAbove(auth)) return;
  } else if (auth.userRoles.includes(requiredRole)) {
    return;
  }
  throw { status: 403, message: `Acesso restrito ao papel '${requiredRole}'` };
}

/**
 * Exige papel `dev` — para telemetria, logs técnicos e operações de MCP.
 */
export function requireDev(auth: AuthResult): void {
  if (!isDevRole(auth)) {
    throw { status: 403, message: 'Acesso restrito a desenvolvedores' };
  }
}

/**
 * Helper to create a JSON error response from auth errors.
 */
export function authErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>
): Response {
  const status = (err as any)?.status || 500;
  const message = (err as any)?.message || 'Erro de autenticação';
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
