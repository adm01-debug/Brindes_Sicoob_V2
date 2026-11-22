import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { askConfirm } from '@/stores/useConfirmDialogStore';
import { costCenterService, type CostCenter } from '@/services/sicoob/costCenterService';
import { useAuth } from '@/contexts/AuthContext';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro desconhecido';

// eslint-disable-next-line max-lines-per-function -- pagina preexistente de 185 linhas; esta PR apenas escopa a query por cooperativa
export default function CostCentersPage() {
  const queryClient = useQueryClient();
  const { cooperativaId: cooperativaDoPerfil } = useAuth();
  const [editing, setEditing] = useState<CostCenter | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);

  const { data: cooperatives } = useQuery({
    queryKey: ['cooperativas_options', cooperativaDoPerfil],
    queryFn: async () => {
      const query = supabase.from('cooperativas').select('id, nome').order('nome');
      const scoped = cooperativaDoPerfil ? query.eq('id', cooperativaDoPerfil) : query;
      const { data, error } = await scoped;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: costCenters, isLoading } = useQuery({
    queryKey: ['cost_centers'],
    queryFn: () => costCenterService.list(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cost_centers'] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) {
        // O centro de custo pertence a cooperativa do ator; so admin escolhe
        // livremente. Antes gravava sempre na primeira cooperativa da lista.
        const escolhida = cooperativaDoPerfil ?? cooperatives?.[0]?.id ?? null;
        if (!escolhida)
          throw new Error('Cadastre uma cooperativa antes de criar centros de custo.');
        return costCenterService.create({ cooperativa_id: escolhida, codigo, nome });
      }
      return costCenterService.update(editing.id, { codigo, nome, ativo });
    },
    onSuccess: () => {
      toast.success(editing ? 'Centro de custo atualizado' : 'Centro de custo criado');
      setIsOpen(false);
      void invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => costCenterService.remove(id),
    onSuccess: () => {
      toast.success('Centro de custo removido');
      void invalidate();
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const openCreate = () => {
    setEditing(null);
    setCodigo('');
    setNome('');
    setAtivo(true);
    setIsOpen(true);
  };

  const openEdit = (row: CostCenter) => {
    setEditing(row);
    setCodigo(row.codigo);
    setNome(row.nome);
    setAtivo(row.ativo);
    setIsOpen(true);
  };

  const cooperativaNome = (id: string) => cooperatives?.find((c) => c.id === id)?.nome ?? '—';

  return (
    <>
      <PageSEO title="Centros de Custo" description="Rateio de verba por centro de custo" />
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Building2 className="h-6 w-6" /> Centros de Custo
            </h1>
            <p className="text-sm text-muted-foreground">
              Cada pedido pode ser rateado entre centros de custo. O rateio precisa fechar 100% do
              valor do pedido.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Novo centro de custo
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadastro</CardTitle>
            <CardDescription>
              O código identifica o centro de custo nos relatórios e na verba.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : (costCenters ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum centro de custo cadastrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cooperativa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(costCenters ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">{row.codigo}</TableCell>
                      <TableCell>{row.nome}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cooperativaNome(row.cooperativa_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.ativo ? 'default' : 'secondary'}>
                          {row.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(row)}
                          aria-label="Editar centro de custo"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remover centro de custo"
                          onClick={async () => {
                            const confirmed = await askConfirm({
                              title: 'Remover centro de custo',
                              description: `Remover "${row.nome}"? Pedidos já rateados neste centro bloqueiam a remoção.`,
                            });
                            if (confirmed) removeMutation.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar centro de custo' : 'Novo centro de custo'}</DialogTitle>
            <DialogDescription>
              Código e nome aparecem nos relatórios financeiros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cc-codigo">Código</Label>
              <Input
                id="cc-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                maxLength={40}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cc-nome">Nome</Label>
              <Input
                id="cc-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={120}
              />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch id="cc-ativo" checked={ativo} onCheckedChange={setAtivo} />
                <Label htmlFor="cc-ativo">Ativo</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !codigo.trim() || !nome.trim()}
            >
              {saveMutation.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
