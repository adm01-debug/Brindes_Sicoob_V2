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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const PAsTab = () => {
  const { isSupervisorOrAbove } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPA, setEditingPA] = useState<any>(null);
  const queryClient = useQueryClient();


  const { data: pas, isLoading: pasLoading } = useQuery({
    queryKey: ["postos_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("postos_atendimento")
        .select(`
          *,
          cooperativa:cooperativas(nome, codigo)
        `)
        .order("nome");
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

  const createMutation = useMutation({
    mutationFn: async (newPA: any) => {
      const { data, error } = await supabase
        .from("postos_atendimento")
        .insert([newPA])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postos_atendimento"] });
      toast.success("PA criado com sucesso");
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar PA: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (pa: any) => {
      const { data, error } = await supabase
        .from("postos_atendimento")
        .update({
          nome: pa.nome,
          codigo: pa.codigo,
          cooperativa_id: pa.cooperativa_id,
        })
        .eq("id", pa.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postos_atendimento"] });
      toast.success("PA atualizado com sucesso");
      setEditingPA(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar PA: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("postos_atendimento").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postos_atendimento"] });
      toast.success("PA removido");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const filtered = pas?.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.cooperativa?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      nome: formData.get("name") as string,
      codigo: formData.get("code") as string,
      cooperativa_id: formData.get("cooperativa_id") as string,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingPA.id,
      nome: formData.get("name") as string,
      codigo: formData.get("code") as string,
      cooperativa_id: formData.get("cooperativa_id") as string,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar PA..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo PA
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo PA</DialogTitle>
                <DialogDescription>
                  Adicione um novo Posto de Atendimento vinculado a uma Singular.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label>Singular Responsável</label>
                  <Select name="cooperativa_id" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Singular" />
                    </SelectTrigger>
                    <SelectContent>
                      {cooperativas?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.codigo} - {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="name">Nome do PA</label>
                  <Input id="name" name="name" placeholder="Ex: PA Centro" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="code">Código/Número</label>
                  <Input id="code" name="code" placeholder="Ex: 01" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Salvando..." : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Singular</TableHead>
              <TableHead>Código PA</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pasLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Nenhum PA encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((pa) => (
                <TableRow key={pa.id}>
                  <TableCell>
                    <span className="text-xs font-semibold text-muted-foreground mr-2">
                      {pa.cooperativa?.codigo}
                    </span>
                    {pa.cooperativa?.nome}
                  </TableCell>
                  <TableCell className="font-medium">{pa.codigo}</TableCell>
                  <TableCell>{pa.nome}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingPA(pa)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Deseja realmente remover este PA?")) {
                          deleteMutation.mutate(pa.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingPA && (
        <Dialog open={!!editingPA} onOpenChange={() => setEditingPA(null)}>
          <DialogContent>
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>Editar PA</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label>Singular Responsável</label>
                  <Select
                    name="cooperativa_id"
                    defaultValue={editingPA.cooperativa_id}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a Singular" />
                    </SelectTrigger>
                    <SelectContent>
                      {cooperativas?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.codigo} - {c.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-name">Nome do PA</label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingPA.nome}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-code">Código/Número</label>
                  <Input
                    id="edit-code"
                    name="code"
                    defaultValue={editingPA.codigo}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
