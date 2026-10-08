import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type PaRow = Tables<'postos_atendimento'> & {
  cooperativa: Pick<Tables<'cooperativas'>, 'nome' | 'codigo'> | null;
};

type PaUpdate = Pick<PaRow, 'id'> & TablesUpdate<'postos_atendimento'>;
type Cooperativa = Tables<'cooperativas'>;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro desconhecido';

function CreatePA({
  allowed,
  open,
  setOpen,
  cooperativas,
  submit,
  pending,
}: {
  allowed: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  cooperativas?: Cooperativa[];
  submit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  if (!allowed)
    return (
      <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4" />
        Sem permissão para criar PAs
      </div>
    );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo PA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
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
                  {cooperativas?.map((cooperativa) => (
                    <SelectItem key={cooperativa.id} value={cooperativa.id}>
                      {cooperativa.codigo} - {cooperativa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name">Nome do PA</label>
                <Input id="name" name="name" placeholder="Ex: PA Centro" required />
              </div>
              <div className="space-y-2">
                <label htmlFor="code">Código</label>
                <Input id="code" name="code" placeholder="Ex: 01" required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <label htmlFor="cidade">Cidade</label>
                <Input id="cidade" name="cidade" placeholder="Ex: Vilhena" />
              </div>
              <div className="space-y-2">
                <label htmlFor="uf">UF</label>
                <Input id="uf" name="uf" maxLength={2} placeholder="RO" />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="endereco">Endereço</label>
              <Input id="endereco" name="endereco" placeholder="Rua..." />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PAList({
  pas,
  loading,
  allowed,
  edit,
  remove,
}: {
  pas?: PaRow[];
  loading: boolean;
  allowed: boolean;
  edit: (pa: PaRow) => void;
  remove: (id: string) => void;
}) {
  let content = (
    <TableRow>
      <TableCell colSpan={4} className="py-8 text-center">
        Nenhum PA encontrado.
      </TableCell>
    </TableRow>
  );
  if (loading)
    content = (
      <TableRow>
        <TableCell colSpan={4} className="py-8 text-center">
          Carregando...
        </TableCell>
      </TableRow>
    );
  else if (pas?.length)
    content = (
      <>
        {pas.map((pa) => (
          <TableRow key={pa.id}>
            <TableCell>
              <span className="mr-2 text-xs font-semibold text-muted-foreground">
                {pa.cooperativa?.codigo}
              </span>
              {pa.cooperativa?.nome}
            </TableCell>
            <TableCell className="font-medium">{pa.codigo}</TableCell>
            <TableCell>{pa.nome}</TableCell>
            <TableCell className="space-x-2 text-right">
              {allowed ? (
                <>
                  <Button variant="ghost" size="icon" onClick={() => edit(pa)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm('Deseja realmente remover este PA?')) remove(pa.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <span className="text-xs italic text-muted-foreground">Somente visualização</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </>
    );
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Singular</TableHead>
            <TableHead>Código PA</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{content}</TableBody>
      </Table>
    </div>
  );
}

function EditPA({
  pa,
  cooperativas,
  close,
  submit,
  pending,
}: {
  pa: PaRow | null;
  cooperativas?: Cooperativa[];
  close: () => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  if (!pa) return null;
  return (
    <Dialog open onOpenChange={close}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Editar PA</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label>Singular Responsável</label>
              <Select name="cooperativa_id" defaultValue={pa.cooperativa_id} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Singular" />
                </SelectTrigger>
                <SelectContent>
                  {cooperativas?.map((cooperativa) => (
                    <SelectItem key={cooperativa.id} value={cooperativa.id}>
                      {cooperativa.codigo} - {cooperativa.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="edit-name">Nome do PA</label>
                <Input id="edit-name" name="name" defaultValue={pa.nome} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-code">Código</label>
                <Input id="edit-code" name="code" defaultValue={pa.codigo} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <label htmlFor="edit-cidade">Cidade</label>
                <Input id="edit-cidade" name="cidade" defaultValue={pa.cidade ?? ''} />
              </div>
              <div className="space-y-2">
                <label htmlFor="edit-uf">UF</label>
                <Input id="edit-uf" name="uf" maxLength={2} defaultValue={pa.uf ?? ''} />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-endereco">Endereço</label>
              <Input id="edit-endereco" name="endereco" defaultValue={pa.endereco ?? ''} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const PAsTab = () => {
  const { isSupervisorOrAbove } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPA, setEditingPA] = useState<PaRow | null>(null);
  const queryClient = useQueryClient();

  const { data: pas, isLoading: pasLoading } = useQuery({
    queryKey: ['postos_atendimento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('postos_atendimento')
        .select(
          `
          *,
          cooperativa:cooperativas(nome, codigo)
        `,
        )
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const { data: cooperativas } = useQuery({
    queryKey: ['cooperativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cooperativas').select('*').order('nome');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newPA: TablesInsert<'postos_atendimento'>) => {
      const { data, error } = await supabase
        .from('postos_atendimento')
        .insert([newPA])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postos_atendimento'] });
      toast.success('PA criado com sucesso');
      setIsCreateOpen(false);
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao criar PA: ${getErrorMessage(error)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...dataToSave }: PaUpdate) => {
      const { data, error } = await supabase
        .from('postos_atendimento')
        .update(dataToSave)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postos_atendimento'] });
      toast.success('PA atualizado com sucesso');
      setEditingPA(null);
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao atualizar PA: ${getErrorMessage(error)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('postos_atendimento').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postos_atendimento'] });
      toast.success('PA removido');
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao remover: ${getErrorMessage(error)}`);
    },
  });

  const filtered = pas?.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cooperativa?.nome.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      nome: formData.get('name') as string,
      codigo: formData.get('code') as string,
      cooperativa_id: formData.get('cooperativa_id') as string,
      endereco: formData.get('endereco') as string,
      cidade: formData.get('cidade') as string,
      uf: (formData.get('uf') as string)?.toUpperCase(),
    });
  };

  const handleUpdate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPA) return;
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: editingPA.id,
      nome: formData.get('name') as string,
      codigo: formData.get('code') as string,
      cooperativa_id: formData.get('cooperativa_id') as string,
      endereco: formData.get('endereco') as string,
      cidade: formData.get('cidade') as string,
      uf: (formData.get('uf') as string)?.toUpperCase(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar PA..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <CreatePA
          allowed={isSupervisorOrAbove}
          open={isCreateOpen}
          setOpen={setIsCreateOpen}
          cooperativas={cooperativas}
          submit={handleCreate}
          pending={createMutation.isPending}
        />
      </div>
      <PAList
        pas={filtered}
        loading={pasLoading}
        allowed={isSupervisorOrAbove}
        edit={setEditingPA}
        remove={deleteMutation.mutate}
      />
      <EditPA
        pa={editingPA}
        cooperativas={cooperativas}
        close={() => setEditingPA(null)}
        submit={handleUpdate}
        pending={updateMutation.isPending}
      />
    </div>
  );
};
