import { supabase } from "@/integrations/supabase/client";
import { untypedFrom } from "@/lib/supabase-untyped";
import { type UserWithRole, type AppRole } from "@/types/users";
import { logger } from "@/lib/logger";

type ProfileHierarchyRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  pa_id: string | null;
  singular_id: string | null;
  carteira_id: string | null;
};

export class UserService {
  static async list(): Promise<UserWithRole[]> {
    const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase.from("profiles").select("id, user_id, full_name, email, avatar_url, is_active, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);

    if (profilesError) throw profilesError;
    if (rolesError) throw rolesError;

    return (profiles || []).map((profile) => {
      const userRole = roles?.find((r) => r.user_id === profile.user_id);
      return {
        id: profile.id,
        user_id: profile.user_id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        role: (userRole?.role as AppRole) || "agente",
        created_at: profile.created_at,
        is_active: profile.is_active,
      };
    });
  }

  static async updateRole(userId: string, newRole: AppRole) {
    const { error } = await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    if (error) throw error;
  }

  static async createUser(params: { full_name: string; email: string; password: string; role: AppRole }) {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { 
        action: "create", 
        email: params.email.trim(), 
        password: params.password, 
        full_name: params.full_name.trim(), 
        role: params.role 
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  static async deleteUser(userId: string) {
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete", user_id: userId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }

  static async updateProfile(userId: string, data: { full_name?: string; email?: string; is_active?: boolean }) {
    const { error } = await supabase.from("profiles").update({
      full_name: data.full_name?.trim() || null,
      email: data.email?.trim() || null,
      is_active: data.is_active,
    }).eq("user_id", userId);
    if (error) throw error;
  }

  static async uploadAvatar(userId: string, file: File) {
    const ext = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${ext}`;
    
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;
    
    const { error: profileError } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
    if (profileError) throw profileError;
    
    return publicUrl;
  }

  static async removeAvatar(userId: string) {
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", userId);
    if (error) throw error;
  }

  static async listHierarchy(): Promise<ProfileHierarchyRow[]> {
    const { data, error } = await untypedFrom<ProfileHierarchyRow>("profiles")
      .select("id, full_name, email, pa_id, singular_id, carteira_id")
      .order("full_name");
    if (error) throw error;
    return data || [];
  }

  static async updateHierarchy(userId: string, field: string, value: string | null) {
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", userId);
    if (error) throw error;
  }
}

