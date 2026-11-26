import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { RoleBadge } from "@/components/ui/RoleBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  sicoobActorGates,
  SICOOB_UI_ROLE_CHOICES,
  updateSicoobUserAssignment,
} from "@/services/sicoob/userService";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro desconhecido";

interface SicoobRoleCellProps {
  role: string | null;
  canAssignRoles: boolean;
  isSelf: boolean;
  onSelect: (role: string) => void;
}

/**
 * Célula de papel: o menu só aparece para admin estrito e nunca na própria
 * linha — a troca apaga o papel antigo antes de gravar o novo, então um admin
 * que trocasse o próprio papel ficaria sem acesso (`is_admin_strict` deixa de
 * valer na inserção seguinte).
 */
const SicoobRoleCell = ({ role, canAssignRoles, isSelf, onSelect }: SicoobRoleCellProps) => {
  if (canAssignRoles && !isSelf) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
            <RoleBadge role={role} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Alterar Papel</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {SICOOB_UI_ROLE_CHOICES.map((choice) => (
            <DropdownMenuItem key={choice.role} onClick={() => onSelect(choice.role)}>
              <RoleBadge role={choice.role} className="mr-2" /> {choice.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <div
      className="flex flex-col gap-1"
      title={
        isSelf
          ? "Trocar o próprio papel pode remover o seu acesso; peça a outro administrador."
          : "Alterar papel exige o papel admin; o banco recusa a concessão para os demais."
      }
    >
      <RoleBadge role={role} />
      <span className="text-xs text-muted-foreground">
        {isSelf ? "Seu papel — outro admin altera" : "Papel: somente admin"}
      </span>
    </div>
  );
};

export const UserAssignmentTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin_profiles_sicoob"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          email,
          role,
          cooperativa_id,
          pa_id,
          approval_threshold,
          cooperativa:cooperativas(nome, codigo),
          pa:postos_atendimento(nome, codigo)
        `)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: cooperativas } = useQuery({
    queryKey: ["cooperativas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cooperativas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: pas } = useQuery({
    queryKey: ["postos_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase.from("postos_atendimento").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { user: actorUser, rolesRaw } = useAuth();
  // `user_roles` só aceita escrita de admin estrito (20260429155414:33-45);
  // cooperativa/PA/alçada de terceiros exigem admin/supervisor na policy de
  // UPDATE de profiles, e a própria ficha aceita ainda `dev`, porque o
  // `guard_profile_authority_fields` usa `is_admin`. Os papéis vêm da sessão
  // (`useAuth`), que é limpo no logout — cache por conta, sem reutilizar papel
  // de quem saiu.
  const gates = sicoobActorGates(rolesRaw ?? []);

  const updateMutation = useMutation({
    mutationFn: async ({
      userId,
      cooperativaId,
      paId,
      role,
      approvalThreshold,
    }: {
      userId: string;
      cooperativaId?: string | null;
      paId?: string | null;
      role?: string;
      approvalThreshold?: number | null;
    }) => {
      await updateSicoobUserAssignment({
        userId,
        cooperativaId,
        paId,
        role,
        approvalThreshold,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_profiles_sicoob"] });
      toast.success("Usuário atualizado com sucesso");
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao atualizar: ${getErrorMessage(error)}`);
    },
  });

  // A policy de UPDATE de `profiles` libera a própria ficha para qualquer
  // conta; ficha de terceiro só para admin/supervisor. O `dev` entra apenas
  // na própria linha, onde a guarda usa `is_admin`.
  const canEditScopeOf = (profileUserId: string | null) => {
    const isSelf = !!actorUser?.id && actorUser.id === profileUserId;
    return isSelf ? gates.canEditOwnProfile : gates.canEditOtherProfile;
  };

  const filtered = users?.filter((u) =>
    (u.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const getPAsForCoop = (coopId: string | null) => {
    if (!coopId) return [];
    return pas?.filter((p) => p.cooperativa_id === coopId) || [];
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel Atual</TableHead>
              <TableHead>Singular</TableHead>
              <TableHead>PA</TableHead>
              <TableHead>Alçada Individual (R$)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.full_name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <SicoobRoleCell
                      role={user.role}
                      canAssignRoles={gates.canGrantRoles}
                      isSelf={actorUser?.id === user.user_id}
                      onSelect={(role) => updateMutation.mutate({ userId: user.id, role })}
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      disabled={!canEditScopeOf(user.user_id)}
                      defaultValue={user.cooperativa_id || "none"}
                      onValueChange={(val) => {
                        updateMutation.mutate({
                          userId: user.id,
                          cooperativaId: val === "none" ? null : val,
                          paId: null, // Reset PA if coop changes
                        });
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sem Singular" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {cooperativas?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      disabled={!canEditScopeOf(user.user_id) || !user.cooperativa_id}
                      defaultValue={user.pa_id || "none"}
                      onValueChange={(val) => {
                        updateMutation.mutate({
                          userId: user.id,
                          cooperativaId: user.cooperativa_id,
                          paId: val === "none" ? null : val,
                        });
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sem PA" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {getPAsForCoop(user.cooperativa_id).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-32 h-9"
                      placeholder="Sem limite"
                      disabled={!canEditScopeOf(user.user_id)}
                      defaultValue={user.approval_threshold || ""}
                      onBlur={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value);
                        if (val !== user.approval_threshold) {
                          updateMutation.mutate({
                            userId: user.id,
                            approvalThreshold: val,
                          });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <UserCheck className="h-4 w-4" />
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
