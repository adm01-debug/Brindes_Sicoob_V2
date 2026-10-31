import { useState, useCallback } from "react";
import { toast } from "sonner";
import { type UserWithRole, type AppRole } from "@/types/users";
import { UserService } from "@/services/admin/UserService";
import { getErrorMessage } from "@/components/admin/utils/errors";

function hasRequiredCredentials(form: { email: string; password: string }): boolean {
  return Boolean(form.email && form.password);
}

function isStrongPassword(password: string): boolean {
  return /[A-Z]/.test(password)
    && /[a-z]/.test(password)
    && /[0-9]/.test(password)
    && /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

function isDuplicateUserMessage(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("already been registered") || normalized.includes("already exists");
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await UserService.list();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    setUpdatingUserId(userId);
    try {
      await UserService.updateRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? { ...u, role: newRole } : u)));
      
      const label =
        newRole === "dev" ? "Dev"
        : newRole === "supervisor" ? "Supervisor"
        : "Agente";
      toast.success(`Usuário alterado para ${label}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error("Erro ao atualizar permissão");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async (form: { full_name: string; email: string; password: string; role: AppRole }) => {
    if (!hasRequiredCredentials(form)) {
      toast.error("Email e senha são obrigatórios");
      return false;
    }
    if (form.password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return false;
    }
    if (!isStrongPassword(form.password)) {
      toast.error("A senha deve conter maiúscula, minúscula, número e caractere especial");
      return false;
    }
    try {
      await UserService.createUser(form);
      toast.success("Usuário criado com sucesso");
      await fetchUsers();
      return true;
    } catch (error: unknown) {
      const msg = getErrorMessage(error, "");
      if (isDuplicateUserMessage(msg)) {
        toast.error("Este e-mail já está cadastrado", { description: "Já existe um usuário com este e-mail no sistema." });
      } else {
        toast.error("Erro ao criar usuário", { description: msg });
      }
      return false;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await UserService.deleteUser(userId);
      toast.success("Usuário excluído com sucesso");
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      return true;
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      toast.error("Erro ao excluir usuário", { description: getErrorMessage(error) });
      return false;
    }
  };

  const handleSaveEdit = async (userId: string, form: { full_name: string; email: string; is_active: boolean }) => {
    try {
      await UserService.updateProfile(userId, form);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId
            ? { ...u, full_name: form.full_name.trim() || null, email: form.email.trim() || null, is_active: form.is_active }
            : u
        )
      );
      toast.success("Usuário atualizado com sucesso");
      return true;
    } catch (error: unknown) {
      console.error("Error updating user:", error);
      toast.error("Erro ao atualizar usuário", { description: getErrorMessage(error) });
      return false;
    }
  };

  const handleAvatarUpload = async (userId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return null;
    }
    try {
      const publicUrl = await UserService.uploadAvatar(userId, file);
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, avatar_url: publicUrl } : u));
      toast.success("Foto atualizada com sucesso");
      return publicUrl;
    } catch (error: unknown) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao enviar foto", { description: getErrorMessage(error) });
      return null;
    }
  };

  const handleRemoveAvatar = async (userId: string) => {
    try {
      await UserService.removeAvatar(userId);
      setUsers((prev) => prev.map((u) => u.user_id === userId ? { ...u, avatar_url: null } : u));
      toast.success("Foto removida");
      return true;
    } catch {
      toast.error("Erro ao remover foto");
      return false;
    }
  };

  return {
    users,
    isLoading,
    updatingUserId,
    fetchUsers,
    handleRoleChange,
    handleCreateUser,
    handleDeleteUser,
    handleSaveEdit,
    handleAvatarUpload,
    handleRemoveAvatar,
  };
}
