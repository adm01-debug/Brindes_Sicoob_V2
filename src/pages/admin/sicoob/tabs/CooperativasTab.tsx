import { useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type CooperativaRow = Tables<"cooperativas"> & {
  central: Pick<Tables<"sicoob_centrais">, "name"> | null;
};

type CooperativaUpdate = Pick<CooperativaRow, "id"> & TablesUpdate<"cooperativas">;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erro desconhecido";

export const CooperativasTab = () => {
  const { isDev } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCoop, setEditingCoop] = useState<CooperativaRow | null>(null);
  const [centrais, setCentrais] = useState<Array<Pick<Tables<"sicoob_centrais">, "id" | "name">>>([]);
  const [temas, setTemas] = useState<Array<Pick<Tables<"sicoob_temas">, "id" | "name">>>([]);
  const queryClient = useQueryClient();


  const { data: cooperativas, isLoading } = useQuery({
    queryKey: ["cooperativas"],
    queryFn: async () => {
      const [coopRes, centraisRes, temasRes] = await Promise.all([
        supabase.from("cooperativas").select("*, central:sicoob_centrais(name)").order("nome"),
        supabase.from("sicoob_centrais").select("id, name").order("name"),
        supabase.from("sicoob_temas").select("id, name").order("name")
      ]);

      if (coopRes.error) throw coopRes.error;
      if (centraisRes.error) throw centraisRes.error;
      if (temasRes.error) throw temasRes.error;
      
      if (centraisRes.data) setCentrais(centraisRes.data);
      if (temasRes.data) setTemas(temasRes.data);
      
      return coopRes.data as CooperativaRow[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newCoop: TablesInsert<"cooperativas">) => {
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
    onError: (error: unknown) => {
      toast.error(`Erro ao criar cooperativa: ${getErrorMessage(error)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...dataToSave }: CooperativaUpdate) => {
      const { data, error } = await supabase
        .from("cooperativas")
        .update(dataToSave)
        .eq("id", id)
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
    onError: (error: unknown) => {
      toast.error(`Erro ao atualizar cooperativa: ${getErrorMessage(error)}`);
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
    onError: (error: unknown) => {
      toast.error(`Erro ao remover: ${getErrorMessage(error)}`);
    },
  });

  const filtered = cooperativas?.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      nome: formData.get("name") as string,
      codigo: formData.get("code") as string,
      central_id: formData.get("central_id") as string,
      sicoob_tema_id: formData.get("tema_id") === "none" ? null : formData.get("tema_id") as string,
      alcada_superior_threshold: parseFloat(formData.get("alcada") as string || "50000"),
    });
  };

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCoop) return;
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="name">Nome da Cooperativa</label>
                      <Input id="name" name="name" placeholder="Ex: Sicoob Credisul" required />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="code">Código</label>
                      <Input id="code" name="code" placeholder="Ex: 4321" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label>Central Regional</label>
                      <Select name="central_id" required>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {centrais.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label>Curadoria Temática</label>
                      <Select name="tema_id" defaultValue="none">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Catálogo Global</SelectItem>
                          {temas.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="alcada">Limite Alçada Superior (R$)</label>
                    <Input id="alcada" name="alcada" type="number" defaultValue="50000" required />
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
