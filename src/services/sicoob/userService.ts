import { supabase } from "@/integrations/supabase/client";

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
