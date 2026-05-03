import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, MapPin, Building, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPAsPage() {
  const [pas, setPas] = useState<any[]>([]);
  const [singulares, setSingulares] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPa, setEditingPa] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: pasData, error: pasError } = await supabase
        .from('postos_atendimento')
        .select('*, singulares(name)')
        .order('nome', { ascending: true });
      if (pasError) throw pasError;
      
      const { data: singularesData, error: singError } = await supabase
        .from('singulares')
        .select('id, name')
        .order('name', { ascending: true });
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

  const handleSave = async (formData: any) => {
    try {
      const dataToSave = { ...formData };
      delete dataToSave.singulares; // Remove joined data

      if (editingPa) {
        const { error } = await supabase.from('postos_atendimento').update(dataToSave).eq('id', editingPa.id);
        if (error) throw error;
        toast.success("PA atualizado com sucesso");
      } else {
        const { error } = await supabase.from('postos_atendimento').insert(dataToSave);
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
    pa.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <PageSEO title="Gerenciar PAs" description="Administre os Postos de Atendimento (PAs)." path="/admin/pas" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Postos de Atendimento (PAs)</h1>
            <p className="text-muted-foreground">Gerencie os pontos de serviço vinculados às singulares</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de PAs</CardTitle>
              <CardDescription>Visualize e edite os Postos de Atendimento</CardDescription>
            </div>
            <Button onClick={() => { setEditingPa(null); setIsFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo PA
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, código ou cidade..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome / Código</TableHead>
                    <TableHead>Singular</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum PA encontrado</TableCell></TableRow>
                  ) : (
                    filtered.map((pa) => (
                      <TableRow key={pa.id}>
                        <TableCell>
                          <div className="font-medium">{pa.nome}</div>
                          <div className="text-xs text-muted-foreground">{pa.codigo}</div>
                        </TableCell>
                        <TableCell>{pa.singulares?.name || "Não vinculada"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {pa.cidade} - {pa.uf}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={pa.is_active ? "default" : "secondary"}>{pa.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingPa(pa); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(pa.id)}><Trash2 className="h-4 w-4" /></Button>
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
    </MainLayout>
  );
}


function PAFormDialog({ open, onOpenChange, pa, onSave, singulares }: any) {
  const [formData, setFormData] = useState<any>({ nome: '', codigo: '', cooperativa_id: null, endereco: '', cidade: '', uf: '', is_active: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    if (pa) setFormData(pa); 
    else setFormData({ nome: '', codigo: '', cooperativa_id: singulares[0]?.id || null, endereco: '', cidade: '', uf: '', is_active: true }); 
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{pa ? 'Editar PA' : 'Novo PA'}</DialogTitle>
          <DialogDescription>Cadastre um novo Posto de Atendimento vinculado a uma singular.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nome" className="text-right">Nome</Label>
            <Input id="nome" className="col-span-3" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="codigo" className="text-right">Código</Label>
            <Input id="codigo" className="col-span-3" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required placeholder="Ex: 01" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Singular</Label>
            <div className="col-span-3">
              <Select value={formData.cooperativa_id || ""} onValueChange={(val) => setFormData({ ...formData, cooperativa_id: val })}>
                <SelectTrigger><SelectValue placeholder="Selecione a Singular" /></SelectTrigger>
                <SelectContent>{singulares.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cidade" className="text-right">Cidade</Label>
            <Input id="cidade" className="col-span-3" value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="uf" className="text-right">UF</Label>
            <Input id="uf" maxLength={2} className="col-span-3" value={formData.uf} onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="endereco" className="text-right">Endereço</Label>
            <Input id="endereco" className="col-span-3" value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Ativo</Label>
            <div className="col-span-3 flex items-center gap-2">
              <input 
                type="checkbox" 
                id="pa_active"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={formData.is_active} 
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
              />
              <Label htmlFor="pa_active" className="text-sm font-normal">Habilitado para pedidos</Label>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
