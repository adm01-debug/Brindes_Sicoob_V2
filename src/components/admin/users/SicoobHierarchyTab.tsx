import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Building2, MapPin, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { UserService } from "@/services/admin/UserService";

export function SicoobHierarchyTab() {
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead><div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> ID do PA</div></TableHead>
                <TableHead><div className="flex items-center gap-2"><Building2 className="h-4 w-4" /> ID da Singular</div></TableHead>
                <TableHead><div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> ID da Carteira</div></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filteredUsers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.full_name || "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Input 
                      defaultValue={u.pa_id || ""} 
                      onBlur={(e) => handleUpdateHierarchy(u.id, "pa_id", e.target.value)}
                      placeholder="UUID do PA"
                      className="h-8 text-xs font-mono"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      defaultValue={u.singular_id || ""} 
                      onBlur={(e) => handleUpdateHierarchy(u.id, "singular_id", e.target.value)}
                      placeholder="UUID da Singular"
                      className="h-8 text-xs font-mono"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      defaultValue={u.carteira_id || ""} 
                      onBlur={(e) => handleUpdateHierarchy(u.id, "carteira_id", e.target.value)}
                      placeholder="UUID da Carteira"
                      className="h-8 text-xs font-mono"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
