import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Pencil, Trash2, ArrowUpCircle, Copy } from "lucide-react";
import { useDuplicateEntity } from "@/hooks/common/useDuplicateEntity";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { type UserWithRole } from "./types";

interface UserTableProps {
  users: UserWithRole[];
  currentUserId: string | undefined;
  updatingUserId: string | null;
  onEditUser: (user: UserWithRole) => void;
  onChangeRole: (user: UserWithRole) => void;
  onDeleteUser: (user: UserWithRole) => void;
  /** Atalho de promoção rápida (só aparece para agentes ativos). */
  onPromoteUser?: (user: UserWithRole) => void;
}

interface UserRowProps extends Omit<UserTableProps, "users"> {
  user: UserWithRole;
  duplicate: ReturnType<typeof useDuplicateEntity>;
}

function UserActions({ user, currentUserId, updatingUserId, onEditUser, onChangeRole, onDeleteUser, onPromoteUser, duplicate }: UserRowProps) {
  const isCurrentUser = user.user_id === currentUserId;
  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Duplicar usuário" onClick={() => duplicate.mutate(user.id)} disabled={duplicate.isPending}><Copy className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" aria-label="Editar" className="h-8 w-8" onClick={() => onEditUser(user)} title="Editar usuário"><Pencil className="h-4 w-4" /></Button>
      {!isCurrentUser && <>{onPromoteUser && user.role === "vendedor" && <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary" onClick={() => onPromoteUser(user)} title="Promover a Supervisor"><ArrowUpCircle className="h-4 w-4" />Promover</Button>}<Button variant="outline" size="sm" onClick={() => onChangeRole(user)} disabled={updatingUserId === user.user_id}>{updatingUserId === user.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alterar Role"}</Button><Button variant="ghost" size="icon" aria-label="Excluir" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDeleteUser(user)} title="Excluir usuário"><Trash2 className="h-4 w-4" /></Button></>}
    </div>
  );
}

function UserRow(props: UserRowProps) {
  const { user } = props;
  return (
    <TableRow>
      <TableCell className="font-medium"><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ""} /><AvatarFallback className="text-xs bg-muted">{(user.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="flex items-center gap-2">{user.full_name || "Sem nome"}{user.user_id === props.currentUserId && <Badge variant="outline" className="text-xs">Você</Badge>}</div></div></TableCell>
      <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell><TableCell><RoleBadge role={user.role} /></TableCell><TableCell><Badge variant={user.is_active !== false ? "outline" : "secondary"}>{user.is_active !== false ? "Ativo" : "Inativo"}</Badge></TableCell><TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString("pt-BR")}</TableCell><TableCell className="text-right"><UserActions {...props} /></TableCell>
    </TableRow>
  );
}

export function UserTable({ users, currentUserId, updatingUserId, onEditUser, onChangeRole, onDeleteUser, onPromoteUser }: UserTableProps) {
  const duplicate = useDuplicateEntity("profiles", ["users_list"]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Usuário</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => <UserRow key={user.id} user={user} currentUserId={currentUserId} updatingUserId={updatingUserId} onEditUser={onEditUser} onChangeRole={onChangeRole} onDeleteUser={onDeleteUser} onPromoteUser={onPromoteUser} duplicate={duplicate} />)}
      </TableBody>
    </Table>
  );
}
