import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Building2, MapPin, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { UserService } from "@/services/admin/UserService";

type HierarchyUser = Awaited<ReturnType<typeof UserService.listHierarchy>>[number];
type HierarchyField = "pa_id" | "singular_id" | "carteira_id";

function HierarchyRow({ user, onUpdate }: { user: HierarchyUser; onUpdate: (userId: string, field: HierarchyField, value: string) => void }) {
  return <TableRow><TableCell><div className="font-medium">{user.full_name || "Sem nome"}</div><div className="text-xs text-muted-foreground">{user.email}</div></TableCell><TableCell><Input defaultValue={user.pa_id || ""} onBlur={event => onUpdate(user.id, "pa_id", event.target.value)} placeholder="UUID do PA" className="h-8 text-xs font-mono" /></TableCell><TableCell><Input defaultValue={user.singular_id || ""} onBlur={event => onUpdate(user.id, "singular_id", event.target.value)} placeholder="UUID da Singular" className="h-8 text-xs font-mono" /></TableCell><TableCell><Input defaultValue={user.carteira_id || ""} onBlur={event => onUpdate(user.id, "carteira_id", event.target.value)} placeholder="UUID da Carteira" className="h-8 text-xs font-mono" /></TableCell></TableRow>;
}

function HierarchyTable({ users, loading, onUpdate }: { users: HierarchyUser[]; loading: boolean; onUpdate: (userId: string, field: HierarchyField, value: string) => void }) {
  return <div className="rounded-md border"><Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead><div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> ID do PA</div></TableHead><TableHead><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> ID da Singular</div></TableHead><TableHead><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> ID da Carteira</div></TableHead></TableRow></TableHeader><TableBody>{loading ? <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow> : users.map(user => <HierarchyRow key={user.id} user={user} onUpdate={onUpdate} />)}</TableBody></Table></div>;
}

function useSicoobHierarchy() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["sicoob-users-hierarchy"],
    queryFn: () => UserService.listHierarchy()
  });

  const handleUpdateHierarchy = async (
    userId: string,
    field: "pa_id" | "singular_id" | "carteira_id",
    value: string,
  ) => {
    try {
      const uuidValue = value.trim() || null;
      await UserService.updateHierarchy(userId, field, uuidValue);
      
      toast({
        title: "Sucesso",
        description: "Hierarquia atualizada com sucesso.",
      });
      refetch();
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Não foi possível atualizar a hierarquia.",
      });
    }
  };


  const filteredUsers = users.filter(u => 
    (u.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return { searchQuery, setSearchQuery, filteredUsers, isLoading, handleUpdateHierarchy };
}

export function SicoobHierarchyTab() {
  const state = useSicoobHierarchy();
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>Hierarquia SICOOB</CardTitle>
        <CardDescription>
          Vincule usuários a PAs, Singulares e Carteiras para controle de verba e visibilidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuário..."
            value={state.searchQuery}
            onChange={(e) => state.setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <HierarchyTable users={state.filteredUsers} loading={state.isLoading} onUpdate={state.handleUpdateHierarchy} />
      </CardContent>
    </Card>
  );
}
