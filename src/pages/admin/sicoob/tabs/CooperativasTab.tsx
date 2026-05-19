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
import { Plus, Pencil, Trash2, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const CooperativasTab = () => {
  const { isDev } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoop, setEditingCoop] = useState<any>(null);
  const [centrais, setCentrais] = useState<any[]>([]);
  const [temas, setTemas] = useState<any[]>([]);
  const queryClient = useQueryClient();


  const { data: cooperativas, isLoading } = useQuery({
    queryKey: ["cooperativas"],
    queryFn: async () => {
      const [coopRes, centraisRes, temasRes] = await Promise.all([
        supabase.from("cooperativas").select("*, central:sicoob_centrais(name)").order("nome"),
        supabase.from("sicoob_centrais").select("id, name").order("name"),
        supabase.from("sicoob_temas").select("id, name").order("name")
      ]);
      
      if (centraisRes.data) setCentrais(centraisRes.data);
      if (temasRes.data) setTemas(temasRes.data);
      
      return coopRes.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newCoop: any) => {
      const { data, error } = await supabase
        .from("cooperativas")
        .insert([newCoop])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperativas"] });
      toast.success("Cooperativa criada com sucesso");
      setIsCreateOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar cooperativa: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (coop: any) => {
      const dataToSave = { ...coop };
      delete dataToSave.id;
      delete dataToSave.central; // Remove joined data
      const { data, error } = await supabase
        .from("cooperativas")
        .update(dataToSave)
        .eq("id", coop.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperativas"] });
      toast.success("Cooperativa atualizada com sucesso");
      setEditingCoop(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar cooperativa: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cooperativas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cooperativas"] });
      toast.success("Cooperativa removida");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  const filtered = cooperativas?.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      nome: formData.get("name") as string,
      codigo: formData.get("code") as string,
      central_id: formData.get("central_id"),
      sicoob_tema_id: formData.get("tema_id") === "none" ? null : formData.get("tema_id"),
      alcada_superior_threshold: parseFloat(formData.get("alcada") as string || "50000"),
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingCoop.id,
      nome: formData.get("name") as string,
      codigo: formData.get("code") as string,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar Singular..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isDev ? (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Singular
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Cadastrar Nova Singular</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova cooperativa central (Singular) ao sistema.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="name">Nome da Cooperativa</label>
                    <Input id="name" name="name" placeholder="Ex: Sicoob Credisul" required />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="code">Código/Número</label>
                    <Input id="code" name="code" placeholder="Ex: 4321" required />
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
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md border">
            <ShieldAlert className="h-4 w-4" />
            Apenas desenvolvedores podem criar Singulares
          </div>
        )}
      </div>


      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>PAs</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Nenhuma cooperativa encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered?.map((coop) => (
                <TableRow key={coop.id}>
                  <TableCell className="font-medium">{coop.codigo}</TableCell>
                  <TableCell>{coop.nome}</TableCell>
                  <TableCell>
                    {/* Placeholder for count of PAs */}
                    -
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {isDev ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingCoop(coop)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Deseja realmente remover esta Singular?")) {
                              deleteMutation.mutate(coop.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Somente visualização</span>
                    )}
                  </TableCell>

                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editingCoop && (
        <Dialog open={!!editingCoop} onOpenChange={() => setEditingCoop(null)}>
          <DialogContent>
            <form onSubmit={handleUpdate}>
              <DialogHeader>
                <DialogTitle>Editar Singular</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name">Nome da Cooperativa</label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={editingCoop.nome}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="edit-code">Código/Número</label>
                  <Input
                    id="edit-code"
                    name="code"
                    defaultValue={editingCoop.codigo}
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
