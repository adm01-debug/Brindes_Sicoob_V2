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
 * Opções de papel oferecidas na aba de vínculos. Fonte única: a tela renderiza
 * a partir daqui e o teste cobra que todo item tenha equivalente em
 * `APP_ROLE_BY_UI_ROLE`.
 */
export const SICOOB_UI_ROLE_CHOICES = [
  { role: "gestor_singular", label: "Gestor Singular" },
  { role: "gestor_pa", label: "Gestor PA" },
  { role: "vendedor", label: "Vendedor" },
  { role: "supervisor", label: "Supervisor" },
] as const;

/** Papéis que `is_admin_strict` aceita para escrever em `user_roles`. */
export const ROLE_GRANT_APP_ROLES: AppRole[] = ["admin"];

/**
 * Papéis que a policy de UPDATE de `profiles` aceita para editar a ficha de
 * outra pessoa (`sicoob_merged_49a6a498d072653c_update`): admin e supervisor.
 * `guard_profile_authority_fields` também aceita `dev`, mas ele precisa passar
 * pela policy antes — por isso `dev` fica fora desta lista.
 */
export const PROFILE_AUTHORITY_APP_ROLES: AppRole[] = ["admin", "supervisor"];

/**
 * Espelha em `user_roles` o papel escolhido na aba de vínculos.
 * `authUserId` é o id de `auth.users` (ou seja, `profiles.user_id`), não o id
 * da ficha. Substitui os papéis gerenciados pela tela (preservando `dev`) para
 * que a lista de permissões não acumule papéis antigos.
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
 * `user_roles.user_id` referencia `auth.users(id)`, mas a aba de vínculos
 * trabalha com o id da ficha em `profiles` (que tem UUID próprio, gerado por
 * `profiles.id DEFAULT gen_random_uuid()`; `handle_new_user` grava o id da
 * conta em `profiles.user_id`). Gravar o id da ficha violaria a FK.
 */
async function resolveAuthUserId(profileRowId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("id", profileRowId)
    .single();
  if (error) throw error;
  const authUserId = data?.user_id;
  if (!authUserId) throw new Error(`Perfil sem conta vinculada: ${profileRowId}`);
  return authUserId;
}

function buildProfileUpdates(assignment: SicoobUserAssignment): TablesUpdate<"profiles"> {
  const updates: TablesUpdate<"profiles"> = {};
  if (assignment.cooperativaId !== undefined) updates.cooperativa_id = assignment.cooperativaId;
  if (assignment.paId !== undefined) updates.pa_id = assignment.paId;
  if (assignment.role !== undefined) updates.role = assignment.role;
  if (assignment.approvalThreshold !== undefined) {
    updates.approval_threshold = assignment.approvalThreshold;
  }
  return updates;
}

/**
 * `syncUserRole` apaga o papel antigo antes de inserir o novo. Se a conta
 * editada for a do próprio ator, ele perde o `admin` na exclusão e a inserção
 * é recusada pela RLS — a conta fica sem papel nenhum. Trocar o próprio papel
 * é responsabilidade de outro administrador.
 */
async function assertNotOwnRoleChange(authUserId: string | null): Promise<void> {
  if (authUserId === null) return;
  const { data: { user: actor } } = await supabase.auth.getUser();
  if (actor?.id && actor.id === authUserId) {
    throw new Error("Não é possível alterar o próprio papel; peça a outro administrador.");
  }
}

/**
 * Aplica a edição da aba de vínculos: grava a ficha em `profiles` e, quando o
 * papel muda, espelha o equivalente real em `user_roles` — é de lá que as
 * policies e as guardas de rota leem.
 */
export async function updateSicoobUserAssignment(
  assignment: SicoobUserAssignment,
): Promise<{ appRole?: AppRole }> {
  const { userId, role } = assignment;

  // Resolve a conta antes de escrever: assim uma ficha órfã falha sem deixar
  // a ficha atualizada e o acesso não concedido.
  const authUserId = role === undefined ? null : await resolveAuthUserId(userId);
  await assertNotOwnRoleChange(authUserId);

  const { error } = await supabase
    .from("profiles")
    .update(buildProfileUpdates(assignment))
    .eq("id", userId);
  if (error) throw error;

  if (authUserId === null) return {};
  return { appRole: await syncUserRole(authUserId, role as string) };
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
