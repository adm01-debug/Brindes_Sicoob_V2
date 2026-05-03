import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Building2, MapPin, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AdminSingularesPage() {
  const [singulares, setSingulares] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSingular, setEditingSingular] = useState<any>(null);

  const fetchSingulares = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('singulares')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setSingulares(data || []);
    } catch (error) {
      console.error("Error fetching singulares:", error);
      toast.error("Erro ao carregar singulares");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSingulares(); }, []);

  const handleSave = async (formData: any) => {
    try {
      if (editingSingular) {
        const { error } = await supabase.from('singulares').update(formData).eq('id', editingSingular.id);
        if (error) throw error;
        toast.success("Singular atualizada com sucesso");
      } else {
        const { error } = await supabase.from('singulares').insert(formData);
        if (error) throw error;
        toast.success("Singular criada com sucesso");
      }
      setIsFormOpen(false);
      setEditingSingular(null);
      fetchSingulares();
    } catch (error) {
      console.error("Error saving singular:", error);
      toast.error("Erro ao salvar singular");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta singular?")) return;
    try {
      const { error } = await supabase.from('singulares').delete().eq('id', id);
      if (error) throw error;
      toast.success("Singular excluída com sucesso");
      fetchSingulares();
    } catch (error) {
      console.error("Error deleting singular:", error);
      toast.error("Erro ao excluir singular");
    }
  };

  const filtered = singulares.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <MainLayout>
      <PageSEO title="Gerenciar Singulares" description="Administre as cooperativas singulares do sistema." path="/admin/singulares" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Singulares</h1>
            <p className="text-muted-foreground">Gerencie as cooperativas regionais (Singulares)</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Singulares</CardTitle>
              <CardDescription>Visualize e edite as informações das cooperativas singulares</CardDescription>
            </div>
            <Button onClick={() => { setEditingSingular(null); setIsFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Singular
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma singular encontrada</TableCell></TableRow>
                  ) : (
                    filtered.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell><Badge variant="outline">{s.code}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            {s.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</div>}
                            {s.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {s.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingSingular(s); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(s.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <SingularFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} singular={editingSingular} onSave={handleSave} />
    </MainLayout>
  );
}


function SingularFormDialog({ open, onOpenChange, singular, onSave }: any) {
  const [formData, setFormData] = useState<any>({ name: '', code: '', address: '', phone: '', email: '', is_active: true });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    if (singular) setFormData(singular); 
    else setFormData({ name: '', code: '', address: '', phone: '', email: '', is_active: true }); 
  }, [singular, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{singular ? 'Editar Singular' : 'Nova Singular'}</DialogTitle>
          <DialogDescription>Preencha os dados da cooperativa regional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Nome</Label>
            <Input id="name" className="col-span-3" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">Código</Label>
            <Input id="code" className="col-span-3" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required placeholder="Ex: 4001" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" className="col-span-3" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Telefone</Label>
            <Input id="phone" className="col-span-3" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">Endereço</Label>
            <Input id="address" className="col-span-3" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Ativo</Label>
            <div className="col-span-3 flex items-center gap-2">
              <input 
                type="checkbox" 
                id="is_active"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={formData.is_active} 
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
              />
              <Label htmlFor="is_active" className="text-sm font-normal">Habilitado para transações</Label>
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
