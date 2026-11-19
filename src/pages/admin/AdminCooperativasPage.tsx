import { useState, useEffect, useCallback } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { askConfirm } from '@/stores/useConfirmDialogStore';

type PartnerCooperative = Tables<'cooperativas_parceiras'>;
type CooperativeDraft = TablesUpdate<'cooperativas_parceiras'>;

const FORM_FIELDS: Array<{ key: keyof CooperativeDraft; label: string; id: string }> = [
  { key: 'name', label: 'Nome', id: 'name' },
  { key: 'registration_number', label: 'CNPJ/Reg', id: 'reg' },
  { key: 'contact_name', label: 'Contato', id: 'contact' },
  { key: 'contact_email', label: 'Email', id: 'email' },
  { key: 'phone', label: 'Telefone', id: 'phone' },
];

async function loadCooperatives() {
  const { data, error } = await supabase
    .from('cooperativas_parceiras')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function persistCooperative(draft: CooperativeDraft) {
  if (draft.id) {
    const { id, ...updates } = draft;
    const { error } = await supabase.from('cooperativas_parceiras').update(updates).eq('id', id);
    if (error) throw error;
    return 'Cooperativa atualizada com sucesso';
  }
  const { error } = await supabase
    .from('cooperativas_parceiras')
    .insert(draft as TablesInsert<'cooperativas_parceiras'>);
  if (error) throw error;
  return 'Cooperativa criada com sucesso';
}

async function removeCooperative(id: string) {
  const { error } = await supabase.from('cooperativas_parceiras').delete().eq('id', id);
  if (error) throw error;
}

function CooperativesHeader() {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-xl bg-primary/10 p-3">
        <Users className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Cooperativas Parceiras</h1>
        <p className="text-muted-foreground">
          Gerencie o cadastro de cooperativas externas e parceiras
        </p>
      </div>
    </div>
  );
}

function CooperativeContact({ cooperative }: { cooperative: PartnerCooperative }) {
  return (
    <div className="flex flex-col text-xs text-muted-foreground">
      {cooperative.contact_name && (
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" /> {cooperative.contact_name}
        </div>
      )}
      {cooperative.contact_email && (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3" /> {cooperative.contact_email}
        </div>
      )}
      {cooperative.phone && (
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" /> {cooperative.phone}
        </div>
      )}
    </div>
  );
}

function CooperativeRow({
  cooperative,
  onEdit,
  onDelete,
}: {
  cooperative: PartnerCooperative;
  onEdit: (cooperative: PartnerCooperative) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{cooperative.name}</TableCell>
      <TableCell>{cooperative.registration_number || '-'}</TableCell>
      <TableCell>
        <CooperativeContact cooperative={cooperative} />
      </TableCell>
      <TableCell>
        <Badge variant={cooperative.is_active ? 'default' : 'secondary'}>
          {cooperative.is_active ? 'Ativa' : 'Inativa'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(cooperative)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => onDelete(cooperative.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function CooperativesBody({
  cooperatives,
  isLoading,
  onEdit,
  onDelete,
}: {
  cooperatives: PartnerCooperative[];
  isLoading: boolean;
  onEdit: (cooperative: PartnerCooperative) => void;
  onDelete: (id: string) => void;
}) {
  if (isLoading)
    return (
      <TableRow>
        <TableCell colSpan={5} className="py-8 text-center">
          Carregando...
        </TableCell>
      </TableRow>
    );
  if (!cooperatives.length)
    return (
      <TableRow>
        <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
          Nenhuma cooperativa encontrada
        </TableCell>
      </TableRow>
    );
  return (
    <>
      {cooperatives.map((cooperative) => (
        <CooperativeRow
          key={cooperative.id}
          cooperative={cooperative}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

function CooperativesTable({
  cooperatives,
  isLoading,
  onEdit,
  onDelete,
}: {
  cooperatives: PartnerCooperative[];
  isLoading: boolean;
  onEdit: (cooperative: PartnerCooperative) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CNPJ / Reg.</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <CooperativesBody
            cooperatives={cooperatives}
            isLoading={isLoading}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </TableBody>
      </Table>
    </div>
  );
}

function CooperativesCard({
  cooperatives,
  isLoading,
  searchTerm,
  onSearch,
  onCreate,
  onEdit,
  onDelete,
}: {
  cooperatives: PartnerCooperative[];
  isLoading: boolean;
  searchTerm: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
  onEdit: (cooperative: PartnerCooperative) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Lista de Cooperativas</CardTitle>
          <CardDescription>
            Visualize e edite as informações das cooperativas parceiras
          </CardDescription>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Cooperativa
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <CooperativesTable
          cooperatives={cooperatives}
          isLoading={isLoading}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </CardContent>
    </Card>
  );
}

function CooperativeFormFields({
  draft,
  onChange,
}: {
  draft: CooperativeDraft | null;
  onChange: (key: keyof CooperativeDraft, value: string | boolean) => void;
}) {
  return (
    <div className="grid gap-4 py-4">
      {FORM_FIELDS.map((field) => (
        <div key={field.id} className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor={field.id} className="text-right">
            {field.label}
          </Label>
          <Input
            id={field.id}
            className="col-span-3"
            value={String(draft?.[field.key] ?? '')}
            onChange={(event) => onChange(field.key, event.target.value)}
          />
        </div>
      ))}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Ativo</Label>
        <div className="col-span-3 flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft?.is_active ?? true}
            onChange={(event) => onChange('is_active', event.target.checked)}
          />
          <span className="text-sm">Habilitado</span>
        </div>
      </div>
    </div>
  );
}

function CooperativeForm({
  open,
  draft,
  onOpenChange,
  onDraftChange,
  onSave,
}: {
  open: boolean;
  draft: CooperativeDraft | null;
  onOpenChange: (open: boolean) => void;
  onDraftChange: (draft: CooperativeDraft) => void;
  onSave: () => void;
}) {
  const changeField = (key: keyof CooperativeDraft, value: string | boolean) =>
    onDraftChange({ ...(draft ?? {}), [key]: value });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{draft?.id ? 'Editar Cooperativa' : 'Nova Cooperativa'}</DialogTitle>
        </DialogHeader>
        <CooperativeFormFields draft={draft} onChange={changeField} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function saveDraft(
  draft: CooperativeDraft | null,
  onSaved: () => void,
  refresh: () => Promise<void>,
) {
  if (!draft?.name?.trim()) {
    toast.error('Nome é obrigatório');
    return;
  }
  try {
    toast.success(await persistCooperative(draft));
    onSaved();
    await refresh();
  } catch (error) {
    console.error('Error saving cooperativa:', error);
    toast.error('Erro ao salvar cooperativa');
  }
}

async function deleteCooperative(id: string, refresh: () => Promise<void>) {
  if (!(await askConfirm({ title: 'Excluir cooperativa?', description: 'Esta ação não pode ser desfeita.', variant: 'destructive', confirmLabel: 'Excluir' }))) return;
  try {
    await removeCooperative(id);
    toast.success('Cooperativa excluída com sucesso');
    await refresh();
  } catch (error) {
    console.error('Error deleting cooperativa:', error);
    toast.error('Erro ao excluir cooperativa');
  }
}

function useCooperativesAdmin() {
  const [cooperativas, setCooperativas] = useState<PartnerCooperative[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoop, setEditingCoop] = useState<CooperativeDraft | null>(null);
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setCooperativas(await loadCooperatives());
    } catch (error) {
      console.error('Error fetching cooperativas:', error);
      toast.error('Erro ao carregar Cooperativas Parceiras');
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const save = () =>
    saveDraft(
      editingCoop,
      () => {
        setIsFormOpen(false);
        setEditingCoop(null);
      },
      refresh,
    );
  const remove = (id: string) => deleteCooperative(id, refresh);
  const filtered = cooperativas.filter((cooperative) =>
    cooperative.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  return {
    filtered,
    isLoading,
    searchTerm,
    setSearchTerm,
    isFormOpen,
    setIsFormOpen,
    editingCoop,
    setEditingCoop,
    save,
    remove,
  };
}

export default function AdminCooperativasPage() {
  const state = useCooperativesAdmin();

  return (
    <>
      <PageSEO
        title="Cooperativas Parceiras"
        description="Gerencie as cooperativas parceiras."
        path="/admin/cooperativas"
        noIndex
      />
      <div className="mx-auto w-full max-w-[1920px] space-y-6 px-4 py-6">
        <CooperativesHeader />
        <CooperativesCard
          cooperatives={state.filtered}
          isLoading={state.isLoading}
          searchTerm={state.searchTerm}
          onSearch={state.setSearchTerm}
          onCreate={() => {
            state.setEditingCoop(null);
            state.setIsFormOpen(true);
          }}
          onEdit={(cooperative) => {
            state.setEditingCoop(cooperative);
            state.setIsFormOpen(true);
          }}
          onDelete={(id) => void state.remove(id)}
        />
      </div>

      <CooperativeForm
        open={state.isFormOpen}
        draft={state.editingCoop}
        onOpenChange={state.setIsFormOpen}
        onDraftChange={state.setEditingCoop}
        onSave={() => void state.save()}
      />
    </>
  );
}
