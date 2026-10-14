/**
 * Matriz de Permissões SSOT (Single Source of Truth) para testes E2E.
 * Mapeia papéis (roles) para rotas e comportamentos esperados.
 */

export type Role = "agente" | "supervisor" | "dev" | "publico";

export interface PermissionRoute {
  path: string;
  /** Permite testar rotas com parâmetros substituindo placeholders como :id */
  params?: Record<string, string>;
  expectedBehavior: "allow" | "deny_403" | "deny_login";
}

/** Helper para resolver o path real substituindo parâmetros */
export function resolvePath(route: PermissionRoute): string {
  let finalPath = route.path;
  if (route.params) {
    for (const [key, value] of Object.entries(route.params)) {
      // Replaces all occurrences of :parameterName
      finalPath = finalPath.split(`:${key}`).join(value);
    }
  }
  return finalPath;
}

export const PERMISSION_MATRIX: Record<Role, PermissionRoute[]> = {
  publico: [
    { path: "/login", expectedBehavior: "allow" },
    { path: "/produtos", expectedBehavior: "deny_login" },
    { path: "/orcamentos/:id", params: { id: "test-quote-123" }, expectedBehavior: "deny_login" },
    { path: "/admin/usuarios", expectedBehavior: "deny_login" },
  ],
  agente: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/orcamentos", expectedBehavior: "allow" },
    { path: "/orcamentos/:id", params: { id: "test-quote-123" }, expectedBehavior: "allow" },
    { path: "/orcamentos/:id/editar", params: { id: "test-quote-123" }, expectedBehavior: "allow" },
    { path: "/admin/usuarios", expectedBehavior: "deny_403" },
  ],
  supervisor: [
    { path: "/produtos", expectedBehavior: "allow" },
    { path: "/admin/usuarios", expectedBehavior: "allow" },
    { path: "/admin/cadastros", expectedBehavior: "allow" },
    { path: "/admin/telemetria", expectedBehavior: "deny_403" },
  ],
  dev: [
    { path: "/admin/telemetria", expectedBehavior: "allow" },
    { path: "/admin/cadastros", expectedBehavior: "allow" },
  ],
};
