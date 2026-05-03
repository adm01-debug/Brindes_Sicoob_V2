import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Users, Mail, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function AdminCooperativasPage() {
  const [cooperativas, setCooperativas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoop, setEditingCoop] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cooperativas_parceiras')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCooperativas(data || []);
    } catch (error) {
      console.error("Error fetching cooperativas:", error);
      toast.error("Erro ao carregar Cooperativas Parceiras");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (formData: any) => {
    try {
      if (editingCoop) {
        const { error } = await supabase.from('cooperativas_parceiras').update(formData).eq('id', editingCoop.id);
        if (error) throw error;
        toast.success("Cooperativa atualizada com sucesso");
      } else {
        const { error } = await supabase.from('cooperativas_parceiras').insert(formData);
        if (error) throw error;
        toast.success("Cooperativa criada com sucesso");
      }
      setIsFormOpen(false);
      setEditingCoop(null);
      fetchData();
    } catch (error) {
      console.error("Error saving cooperativa:", error);
      toast.error("Erro ao salvar cooperativa");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta cooperativa?")) return;
    try {
      const { error } = await supabase.from('cooperativas_parceiras').delete().eq('id', id);
      if (error) throw error;
      toast.success("Cooperativa excluída com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting cooperativa:", error);
      toast.error("Erro ao excluir cooperativa");
    }
  };

  const filtered = cooperativas.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <MainLayout>
      <PageSEO title="Cooperativas Parceiras" description="Gerencie as cooperativas parceiras." path="/admin/cooperativas" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Handshake className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Cooperativas Parceiras</h1>
            <p className="text-muted-foreground">Gerencie o cadastro de cooperativas externas e parceiras</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Lista de Cooperativas</CardTitle>
              <CardDescription>Visualize e edite as informações das cooperativas parceiras</CardDescription>
            </div>
            <Button onClick={() => { setEditingCoop(null); setIsFormOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Nova Cooperativa
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
            </div>

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
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma cooperativa encontrada</TableCell></TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.registration_number || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col text-xs text-muted-foreground">
                            {c.contact_name && <div className="flex items-center gap-1"><User className="h-3 w-3" /> {c.contact_name}</div>}
                            {c.contact_email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {c.contact_email}</div>}
                            {c.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativa" : "Inativa"}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingCoop(c); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingCoop ? 'Editar Cooperativa' : 'Nova Cooperativa'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name" className="text-right">Nome</Label><Input id="name" className="col-span-3" value={editingCoop?.name || ''} onChange={(e) => setEditingCoop({ ...(editingCoop || {}), name: e.target.value })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="reg" className="text-right">CNPJ/Reg</Label><Input id="reg" className="col-span-3" value={editingCoop?.registration_number || ''} onChange={(e) => setEditingCoop({ ...(editingCoop || {}), registration_number: e.target.value })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="contact" className="text-right">Contato</Label><Input id="contact" className="col-span-3" value={editingCoop?.contact_name || ''} onChange={(e) => setEditingCoop({ ...(editingCoop || {}), contact_name: e.target.value })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email" className="text-right">Email</Label><Input id="email" className="col-span-3" value={editingCoop?.contact_email || ''} onChange={(e) => setEditingCoop({ ...(editingCoop || {}), contact_email: e.target.value })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone" className="text-right">Telefone</Label><Input id="phone" className="col-span-3" value={editingCoop?.phone || ''} onChange={(e) => setEditingCoop({ ...(editingCoop || {}), phone: e.target.value })} /></div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Ativo</Label>
              <div className="col-span-3 flex items-center gap-2"><input type="checkbox" checked={editingCoop?.is_active ?? true} onChange={(e) => setEditingCoop({ ...(editingCoop || {}), is_active: e.target.checked })} /><span className="text-sm">Habilitado</span></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button><Button onClick={() => handleSave(editingCoop)}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
