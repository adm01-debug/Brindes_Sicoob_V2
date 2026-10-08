import React, { useState, useEffect } from 'react';
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, MapPin, Building, MapPinned } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type PaRow = Tables<"postos_atendimento"> & { cooperativas: Pick<Tables<"cooperativas">, "nome" | "codigo"> | null };
type SingularOption = Pick<Tables<"cooperativas">, "id" | "nome" | "codigo">;
type PaFormData = TablesInsert<"postos_atendimento">;

export default function AdminPAsPage() {
  const [pas, setPas] = useState<PaRow[]>([]);
  const [singulares, setSingulares] = useState<SingularOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPa, setEditingPa] = useState<PaRow | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: pasData, error: pasError } = await supabase
        .from('postos_atendimento')
        .select('*, cooperativas(nome, codigo)')
        .order('nome', { ascending: true });
      if (pasError) throw pasError;
      
      const { data: singularesData, error: singError } = await supabase
        .from('cooperativas')
        .select('id, nome, codigo')
        .order('nome', { ascending: true });
      if (singError) throw singError;

      setPas(pasData || []);
      setSingulares(singularesData || []);
    } catch (error) {
      console.error("Error fetching PAs:", error);
      toast.error("Erro ao carregar Postos de Atendimento");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (formData: PaFormData) => {
    try {
      if (editingPa) {
        const { error } = await supabase.from('postos_atendimento').update(formData).eq('id', editingPa.id);
        if (error) throw error;
        toast.success("PA atualizado com sucesso");
      } else {
        const { error } = await supabase.from('postos_atendimento').insert(formData);
        if (error) throw error;
        toast.success("PA criado com sucesso");
      }
      setIsFormOpen(false);
      setEditingPa(null);
      fetchData();
    } catch (error) {
      console.error("Error saving PA:", error);
      toast.error("Erro ao salvar PA");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este PA?")) return;
    try {
      const { error } = await supabase.from('postos_atendimento').delete().eq('id', id);
      if (error) throw error;
      toast.success("PA excluído com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting PA:", error);
      toast.error("Erro ao excluir PA");
    }
  };

  const filtered = pas.filter(pa => 
    pa.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    pa.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pa.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pa.cooperativas?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <PageSEO title="Gerenciar PAs Sicoob" description="Administre os Postos de Atendimento (PAs)." path="/admin/pas" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sicoob-green/10">
            <MapPinned className="h-8 w-8 text-sicoob-green" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">Postos de Atendimento (PAs)</h1>
            <p className="text-muted-foreground">Gestão capilarizada dos pontos de serviço Sicoob</p>
          </div>
        </div>

        <Card className="border-border/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rede de Atendimento</CardTitle>
              <CardDescription>Visualize e edite os PAs vinculados às suas respectivas Singulares.</CardDescription>
            </div>
            <Button onClick={() => { setEditingPa(null); setIsFormOpen(true); }} className="gap-2 bg-sicoob-green hover:bg-sicoob-green-dark text-white rounded-xl h-10 px-6">
              <Plus className="h-4 w-4" /> Novo PA
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, código, cidade ou singular..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-11 rounded-xl" />
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>PA / Código</TableHead>
                    <TableHead>Singular Vinculada</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-sm">Sincronizando rede de atendimento...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum PA encontrado no ecossistema.</TableCell></TableRow>
                  ) : (
                    filtered.map((pa) => (
                      <TableRow key={pa.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell>
                          <div className="font-bold text-sicoob-green-dark">{pa.nome}</div>
                          <div className="text-[10px] uppercase font-bold tracking-tighter text-muted-foreground">Unidade: {pa.codigo}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                             <Building className="h-3 w-3 text-muted-foreground" />
                             <span className="text-sm font-medium">{pa.cooperativas?.nome || "Não vinculada"}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">ID: {pa.cooperativas?.codigo}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 text-sicoob-green" /> {pa.cidade} - {pa.uf}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={pa.is_active ? "default" : "secondary"} className={pa.is_active ? "bg-sicoob-green" : ""}>{pa.is_active ? "Ativo" : "Pausado"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingPa(pa); setIsFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10" onClick={() => handleDelete(pa.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <PAFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} pa={editingPa} onSave={handleSave} singulares={singulares} />
    </>
  );
}


interface PaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pa: PaRow | null;
  onSave: (formData: PaFormData) => Promise<void>;
  singulares: SingularOption[];
}

function PAFormDialog({ open, onOpenChange, pa, onSave, singulares }: PaFormDialogProps) {
  const [formData, setFormData] = useState<PaFormData>({ nome: '', codigo: '', cooperativa_id: '', endereco: '', cidade: '', uf: '', is_active: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (pa) setFormData(pa);
    else setFormData({ nome: '', codigo: '', cooperativa_id: singulares[0]?.id || '', endereco: '', cidade: '', uf: '', is_active: true });
  }, [pa, open, singulares]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.codigo || !formData.cooperativa_id) {
      toast.error("Nome, código e singular são obrigatórios");
      return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-sicoob-green-dark">{pa ? 'Editar PA' : 'Novo Posto de Atendimento'}</DialogTitle>
          <DialogDescription>Cadastre ou atualize um ponto de serviço vinculado a uma singular.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-xs font-bold uppercase">Nome do PA</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-xs font-bold uppercase">Código do PA</Label>
              <Input id="codigo" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required placeholder="Ex: 01" className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase">Singular Responsável</Label>
            <Select value={formData.cooperativa_id || ""} onValueChange={(val) => setFormData({ ...formData, cooperativa_id: val })}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Selecione a Singular" /></SelectTrigger>
              <SelectContent>
                {singulares.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome} ({s.codigo})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="cidade" className="text-xs font-bold uppercase">Cidade</Label>
              <Input id="cidade" value={formData.cidade ?? ""} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uf" className="text-xs font-bold uppercase">UF</Label>
              <Input id="uf" maxLength={2} value={formData.uf ?? ""} onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco" className="text-xs font-bold uppercase">Endereço Completo</Label>
            <Input id="endereco" value={formData.endereco ?? ""} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className="rounded-xl" />
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-4 rounded-xl">
            <input 
              type="checkbox" 
              id="pa_active"
              className="h-4 w-4 rounded border-gray-300 text-sicoob-green focus:ring-sicoob-green"
              checked={formData.is_active} 
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
            />
            <Label htmlFor="pa_active" className="text-sm font-medium">Posto de Atendimento Ativo para Pedidos</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="bg-sicoob-green hover:bg-sicoob-green-dark text-white rounded-xl px-8 h-11">
               {isSaving ? "Sincronizando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
