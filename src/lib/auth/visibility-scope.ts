/**
 * visibility-scope — determina o escopo de visibilidade de dados de vendas
 * para o usuário autenticado, com base nos papéis (user_roles).
 *
 * - "all"    → dev (vê tudo). Legado "admin"/"manager" é normalizado para
 *              "supervisor" em normalizeAssignedRoles antes de chegar aqui.
 * - "team"   → supervisor (vê dados do time / mesma organização)
 * - "self"   → vendedor (vê apenas os próprios dados)
 *
 * O isolamento real é feito por RLS no banco; este helper serve para a UI
 * decidir se aplica filtros adicionais por seller_id e para exibir o
 * badge "Apenas seus dados".
 */
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type SalesScope = "all" | "team" | "self";

export function useSalesScope(): SalesScope {
  const { role, isDev, isSupervisorOrAbove } = useAuth();
  return useMemo<SalesScope>(() => {
    if (isDev) return "all";
    if (isSupervisorOrAbove || role === "supervisor") return "team";
    return "self";
  }, [role, isDev, isSupervisorOrAbove]);
}

export function isOnlySelf(scope: SalesScope): boolean {
  return scope === "self";
}
