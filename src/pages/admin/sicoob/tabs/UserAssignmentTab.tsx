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
  PROFILE_AUTHORITY_APP_ROLES,
  ROLE_GRANT_APP_ROLES,
  SICOOB_UI_ROLE_CHOICES,
  updateSicoobUserAssignment,
} from "@/services/sicoob/userService";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro desconhecido";

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

  const { data: actorRoles } = useQuery({
    queryKey: ["current_actor_roles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as string[];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((row) => row.role as string);
    },
  });

  // `user_roles` só aceita escrita de admin estrito (20260429155414:33-45);
  // cooperativa/PA/alçada e `profiles.role` aceitam admin/dev/supervisor
  // (guard_profile_authority_fields). A tela espelha exatamente isso.
  const actorRoleList = actorRoles ?? [];
  const canAssignRoles = actorRoleList.some((r) => (ROLE_GRANT_APP_ROLES as string[]).includes(r));
  const canEditScope = actorRoleList.some((r) =>
    (PROFILE_AUTHORITY_APP_ROLES as string[]).includes(r),
  );

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
                    {canAssignRoles ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                            <RoleBadge role={user.role} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel>Alterar Papel</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {SICOOB_UI_ROLE_CHOICES.map((choice) => (
                            <DropdownMenuItem
                              key={choice.role}
                              onClick={() => updateMutation.mutate({ userId: user.id, role: choice.role })}
                            >
                              <RoleBadge role={choice.role} className="mr-2" /> {choice.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <div
                        className="flex flex-col gap-1"
                        title="Alterar papel exige o papel admin; o banco recusa a concessão para os demais."
                      >
                        <RoleBadge role={user.role} />
                        <span className="text-xs text-muted-foreground">Papel: somente admin</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      disabled={!canEditScope}
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
                      disabled={!canEditScope || !user.cooperativa_id}
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
                      disabled={!canEditScope}
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
