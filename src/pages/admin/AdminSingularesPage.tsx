import React, { useState, useEffect } from 'react';
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Building2, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { askConfirm } from '@/stores/useConfirmDialogStore';

type SingularRow = Tables<"cooperativas"> & { sicoob_centrais: Pick<Tables<"sicoob_centrais">, "name"> | null };
type CentralOption = Pick<Tables<"sicoob_centrais">, "id" | "name">;
type TemaOption = Pick<Tables<"sicoob_temas">, "id" | "name">;
type SingularFormData = TablesInsert<"cooperativas">;

export default function AdminSingularesPage() {
  const [singulares, setSingulares] = useState<SingularRow[]>([]);
  const [centrais, setCentrais] = useState<CentralOption[]>([]);
  const [temas, setTemas] = useState<TemaOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSingular, setEditingSingular] = useState<SingularRow | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [singRes, centraisRes, temasRes] = await Promise.all([
        supabase.from('cooperativas').select('*, sicoob_centrais(name)').order('nome', { ascending: true }),
        supabase.from('sicoob_centrais').select('id, name').order('name'),
        supabase.from('sicoob_temas').select('id, name').order('name')
      ]);

      if (singRes.error) throw singRes.error;
      setSingulares(singRes.data || []);
      setCentrais(centraisRes.data || []);
      setTemas(temasRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados do ecossistema Sicoob");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (formData: SingularFormData) => {
    try {
      if (editingSingular) {
        const { error } = await supabase.from('cooperativas').update(formData).eq('id', editingSingular.id);
        if (error) throw error;
        toast.success("Singular atualizada com sucesso");
      } else {
        const { error } = await supabase.from('cooperativas').insert(formData);
        if (error) throw error;
        toast.success("Singular criada com sucesso");
      }
      setIsFormOpen(false);
      setEditingSingular(null);
      fetchData();
    } catch (error) {
      console.error("Error saving singular:", error);
      toast.error("Erro ao salvar singular");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await askConfirm({ title: 'Excluir singular?', description: 'Isso pode afetar usuários vinculados. Esta ação não pode ser desfeita.', variant: 'destructive', confirmLabel: 'Excluir' }))) return;
    try {
      const { error } = await supabase.from('cooperativas').delete().eq('id', id);
      if (error) throw error;
      toast.success("Singular excluída com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting singular:", error);
      toast.error("Erro ao excluir singular (verifique se há PAs vinculados)");
    }
  };

  const filtered = singulares.filter(s => 
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <PageSEO title="Gerenciar Singulares Sicoob" description="Administre as cooperativas singulares do sistema." path="/admin/singulares" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sicoob-green/10">
            <Building2 className="h-8 w-8 text-sicoob-green" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">Singulares (Cooperativas)</h1>
            <p className="text-muted-foreground">Governança regional e curadoria temática por Singular</p>
          </div>
        </div>

        <Card className="border-border/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Ecossistema de Singulares</CardTitle>
              <CardDescription>Configure limites de alçada, centrais e curadoria temática.</CardDescription>
            </div>
            <Button onClick={() => { setEditingSingular(null); setIsFormOpen(true); }} className="gap-2 bg-sicoob-green hover:bg-sicoob-green-dark text-white">
              <Plus className="h-4 w-4" /> Nova Singular
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10 rounded-xl" />
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Singular / Central</TableHead>
                    <TableHead>Código / CNPJ</TableHead>
                    <TableHead>Alçada Superior</TableHead>
                    <TableHead>Tema Padrão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando ecossistema...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma singular encontrada</TableCell></TableRow>
                  ) : (
                    filtered.map((s) => (
                      <TableRow key={s.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell>
                          <div className="font-bold text-sicoob-green-dark">{s.nome}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase font-bold tracking-tighter">
                            <Globe className="h-2.5 w-2.5" /> {s.sicoob_centrais?.name || "Sem Central"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px]">{s.codigo}</Badge>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{s.cnpj || "CNPJ não informado"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">R$ {Number(s.alcada_superior_threshold).toLocaleString('pt-BR')}</div>
                          <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Workflow Board</div>
                        </TableCell>
                        <TableCell>
                          {s.sicoob_tema_id ? (
                            <Badge className="bg-sicoob-green/10 text-sicoob-green border-sicoob-green/20 text-[10px] uppercase font-bold">
                              {temas.find(t => t.id === s.sicoob_tema_id)?.name || "Personalizado"}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Catálogo Global</span>
                          )}
                        </TableCell>
                        <TableCell><Badge variant={s.is_active ? "default" : "secondary"} className={s.is_active ? "bg-sicoob-green" : ""}>{s.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingSingular(s); setIsFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <SingularFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        singular={editingSingular} 
        onSave={handleSave} 
        centrais={centrais}
        temas={temas}
      />
    </>
  );
}


interface SingularFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  singular: SingularRow | null;
  onSave: (formData: SingularFormData) => Promise<void>;
  centrais: CentralOption[];
  temas: TemaOption[];
}

function SingularFormDialog({ open, onOpenChange, singular, onSave, centrais, temas }: SingularFormDialogProps) {
  const [formData, setFormData] = useState<SingularFormData>({
    nome: '',
    codigo: '',
    cnpj: '',
    address: '',
    phone: '',
    email: '',
    is_active: true,
    central_id: null,
    sicoob_tema_id: null,
    alcada_superior_threshold: 50000
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    if (singular) setFormData({
        ...singular,
        alcada_superior_threshold: Number(singular.alcada_superior_threshold) || 50000
    }); 
    else setFormData({ 
        nome: '', 
        codigo: '', 
        cnpj: '',
        address: '', 
        phone: '', 
        email: '', 
        is_active: true,
        central_id: centrais[0]?.id || null,
        sicoob_tema_id: null,
        alcada_superior_threshold: 50000
    }); 
  }, [singular, open, centrais]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.codigo) {
      toast.error("Nome e código são obrigatórios");
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
      <DialogContent className="sm:max-w-[600px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-sicoob-green-dark">{singular ? 'Editar Singular' : 'Nova Singular'}</DialogTitle>
          <DialogDescription>Dados cadastrais e configuração de governança Sicoob.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-xs font-bold uppercase">Nome da Singular</Label>
              <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-xs font-bold uppercase">Código</Label>
              <Input id="codigo" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required placeholder="Ex: 4001" className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="central" className="text-xs font-bold uppercase">Central Regional</Label>
              <Select value={formData.central_id || ""} onValueChange={(val) => setFormData({ ...formData, central_id: val })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione a Central" /></SelectTrigger>
                <SelectContent>
                    {centrais.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tema" className="text-xs font-bold uppercase">Curadoria Temática</Label>
              <Select value={formData.sicoob_tema_id || "none"} onValueChange={(val) => setFormData({ ...formData, sicoob_tema_id: val === 'none' ? null : val })}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Catálogo Padrão" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">Catálogo Global Sicoob</SelectItem>
                    {temas.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cnpj" className="text-xs font-bold uppercase">CNPJ</Label>
              <Input id="cnpj" value={formData.cnpj || ''} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alcada" className="text-xs font-bold uppercase">Limite Alçada Board (R$)</Label>
              <Input 
                id="alcada" 
                type="number" 
                value={formData.alcada_superior_threshold ?? ""}
                onChange={(e) => setFormData({ ...formData, alcada_superior_threshold: parseFloat(e.target.value) })} 
                className="rounded-xl font-bold text-sicoob-green" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold uppercase">Email Institucional</Label>
              <Input id="email" type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-bold uppercase">Telefone</Label>
              <Input id="phone" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="rounded-xl" />
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-xl">
            <input 
              type="checkbox" 
              id="is_active"
              className="h-4 w-4 rounded border-gray-300 text-sicoob-green focus:ring-sicoob-green"
              checked={formData.is_active} 
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
            />
            <Label htmlFor="is_active" className="text-sm font-medium">Singular Habilitada para Operações</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="bg-sicoob-green hover:bg-sicoob-green-dark text-white rounded-xl px-8">
                {isSaving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
