// supabase/functions/_shared/authorize.ts
// --------------------------------------------------------------
// SSOT para autorização de edges: extrai o usuário do JWT do
// Authorization header e valida role via tabela `user_roles`
// (RLS-safe — usa service_role só para a leitura de role).
//
// Por que SSOT? Antes desta camada cada edge fazia:
//   const { data: { user } } = await supabase.auth.getUser(token);
//   const { data: role } = await admin.from("user_roles")...
// Resultado: 12+ implementações divergentes e gaps reais
// (ex: bitrix-sync e github-fix-config sem nenhum role check).
//
// Uso típico:
//   const auth = await authorize(req, { requireRole: "dev" });
//   if (!auth.ok) return auth.response;            // 401/403 já formatado
//   const { user, role, supabaseAdmin } = auth;     // safe to proceed
//
// Roles aceitas: 'dev' > 'supervisor' > 'agente'.
// Hierarquia: requireRole "supervisor" aceita supervisor OU dev.
//             requireRole "agente" aceita qualquer authenticated.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getCorsHeaders } from "./cors.ts";

export type AppRole = "dev" | "supervisor" | "agente";

export interface AuthorizeOptions {
  /** Mínimo exigido (hierárquico). Omita para apenas exigir authenticated. */
  requireRole?: AppRole;
  /** Forçar verificação adicional via has_role() RPC (server-side, RLS-safe). */
  enforceServerSide?: boolean;
}

export type AuthorizeResult =
  | {
      ok: true;
      user: { id: string; email?: string };
      role: AppRole | null;
      token: string;
      supabaseUser: SupabaseClient;
      supabaseAdmin: SupabaseClient;
    }
  | { ok: false; response: Response };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ROLE_RANK: Record<AppRole, number> = {
  agente: 1,
  supervisor: 2,
  dev: 3,
};

// Papel de negócio não concede administração técnica. Valores desconhecidos
// são ignorados; comparar `undefined` com um número permitiria o acesso.
function technicalRole(value: string): AppRole | null {
  if (value === "dev") return "dev";
  if (["supervisor", "admin", "manager"].includes(value)) return "supervisor";
  if (["agente", "vendedor", "gestor_compras", "comprador_singular", "gerente_pa", "comprador_pac"].includes(value)) return "agente";
  return null;
}

function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export async function authorize(
  req: Request,
  opts: AuthorizeOptions = {},
): Promise<AuthorizeResult> {
  const corsHeaders = getCorsHeaders(req);
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");

  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "missing_authorization", message: "Authorization header required" },
        401,
        corsHeaders,
      ),
    };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "missing_token", message: "Bearer token is empty" },
        401,
        corsHeaders,
      ),
    };
  }

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userResp, error: userErr } = await supabaseUser.auth.getUser(token);
  if (userErr || !userResp?.user) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "invalid_token", message: "Token is invalid or expired" },
        401,
        corsHeaders,
      ),
    };
  }

  const userId = userResp.user.id;
  const userEmail = userResp.user.email ?? undefined;

  // Resolve role mais alta. user_roles é a SSOT (nunca confiar em profiles).
  const { data: roles, error: rolesErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesErr) {
    return {
      ok: false,
      response: jsonResponse(
        { error: "role_lookup_failed", message: "Could not verify user role" },
        500,
        corsHeaders,
      ),
    };
  }

  const userRoles = (roles ?? [])
    .map((r) => technicalRole(r.role))
    .filter((role): role is AppRole => role !== null);
  const highestRole = userRoles.reduce<AppRole | null>(
    (highest, role) => !highest || ROLE_RANK[role] > ROLE_RANK[highest] ? role : highest,
    null,
  );

  if (opts.requireRole) {
    const requiredRank = ROLE_RANK[opts.requireRole];
    const userRank = highestRole ? (ROLE_RANK[highestRole] ?? 0) : 0;
    if (userRank < requiredRank) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: "insufficient_role",
            message: `Role '${opts.requireRole}' required (you have '${highestRole ?? "none"}')`,
          },
          403,
          corsHeaders,
        ),
      };
    }

    // Cinto-suspensório: revalida via RPC has_role (não confia só na leitura direta).
    if (opts.enforceServerSide) {
      // Revalida os papéis reais que concederam acesso, preservando aliases e
      // hierarquia. Não consulta um alias técnico ausente no enum do banco.
      const eligibleRoles = [...new Set((roles ?? []).map((r) => r.role as string))]
        .filter((role) => {
          const technical = technicalRole(role);
          return technical !== null && ROLE_RANK[technical] >= requiredRank;
        });
      let confirmed = false;
      for (const role of eligibleRoles) {
        const { data: allowed, error } = await supabaseAdmin.rpc("has_role", {
          _user_id: userId,
          _role: role,
        });
        // Erro de consulta não pode virar sucesso por fallback.
        if (error) { confirmed = false; break; }
        if (allowed === true) { confirmed = true; break; }
      }
      if (!confirmed) {
        return {
          ok: false,
          response: jsonResponse(
            { error: "insufficient_role_server", message: "Server-side role check failed" },
            403,
            corsHeaders,
          ),
        };
      }
    }
  }

  return {
    ok: true,
    user: { id: userId, email: userEmail },
    role: highestRole,
    token,
    supabaseUser,
    supabaseAdmin,
  };
}
