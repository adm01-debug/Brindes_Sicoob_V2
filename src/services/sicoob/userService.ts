import { supabase } from "@/integrations/supabase/client";
import type { Database, TablesUpdate } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

/**
 * A aba de vínculos grava o papel em `profiles.role` (usado por filtros da
 * aplicação), mas o acesso é decidido por `user_roles` — é de lá que
 * `has_role`, `is_gestor_compras` e `is_gerente_pa` leem. Este mapa traduz o
 * vocabulário da tela para valores que existem em `app_role`; sem ele o botão
 * "definir papel" atualiza a ficha do usuário e não concede nenhum acesso.
 *
 * `gestor_pa` e `gestor_singular` são vocabulário legado de `profiles.role`:
 * não existem no enum `app_role` e continuam sendo gravados como estão para
 * não quebrar os filtros de `orderService`.
 */
export const APP_ROLE_BY_UI_ROLE: Record<string, AppRole> = {
  admin: "admin",
  manager: "manager",
  vendedor: "vendedor",
  supervisor: "supervisor",
  dev: "dev",
  gestor_compras: "gestor_compras",
  comprador_singular: "comprador_singular",
  comprador_pac: "comprador_pac",
  gerente_pa: "gerente_pa",
  gestor_pa: "gerente_pa",
  gestor_singular: "gestor_compras",
};

/** Papel técnico que esta tela nunca remove. */
export const PRESERVED_APP_ROLES: AppRole[] = ["dev"];

/**
 * Espelha em `user_roles` o papel escolhido na aba de vínculos.
 * Substitui os papéis gerenciados pela tela (preservando `dev`) para que a
 * lista de permissões não acumule papéis antigos.
 */
export async function syncUserRole(userId: string, uiRole: string): Promise<AppRole> {
  const appRole = APP_ROLE_BY_UI_ROLE[uiRole];
  if (!appRole) throw new Error(`Papel sem equivalente em app_role: ${uiRole}`);

  const { error: deleteError } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .not("role", "in", `(${PRESERVED_APP_ROLES.join(",")})`);
  if (deleteError) throw deleteError;

  if (PRESERVED_APP_ROLES.includes(appRole)) return appRole;

  const { error: insertError } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role: appRole });
  if (insertError) throw insertError;

  return appRole;
}

export interface SicoobUserAssignment {
  userId: string;
  cooperativaId?: string | null;
  paId?: string | null;
  role?: string;
  approvalThreshold?: number | null;
}

/**
 * Aplica a edição da aba de vínculos: grava a ficha em `profiles` e, quando o
 * papel muda, espelha o equivalente real em `user_roles` — é de lá que as
 * policies e as guardas de rota leem.
 */
export async function updateSicoobUserAssignment(
  assignment: SicoobUserAssignment,
): Promise<{ appRole?: AppRole }> {
  const { userId, cooperativaId, paId, role, approvalThreshold } = assignment;

  const updates: TablesUpdate<"profiles"> = {};
  if (cooperativaId !== undefined) updates.cooperativa_id = cooperativaId;
  if (paId !== undefined) updates.pa_id = paId;
  if (role !== undefined) updates.role = role;
  if (approvalThreshold !== undefined) updates.approval_threshold = approvalThreshold;

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) throw error;

  if (role === undefined) return {};
  return { appRole: await syncUserRole(userId, role) };
}

export const sicoobUserService = {
  async getProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*, postos_atendimento(nome), cooperativas(nome)")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Erro ao buscar perfil:", error);
      return null;
    }

    return data;
  },

  async getRole() {
    const profile = await this.getProfile();
    return profile?.role || null;
  },

  async isGestorPa() {
    const role = await this.getRole();
    return role === "gestor_pa";
  },

  async isGestorSingular() {
    const role = await this.getRole();
    return role === "gestor_singular";
  },

  async isVendedor() {
    const role = await this.getRole();
    return role === "vendedor";
  }
};
