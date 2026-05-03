import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Megaphone, Calendar, Tag, Filter, CheckCircle2, AlertCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { logAdminAction } from "@/utils/adminAudit";

export default function AdminCampanhasPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (formData: any) => {
    try {
      if (editingCampaign) {
        const { error } = await supabase.from('campaigns').update(formData).eq('id', editingCampaign.id);
        if (error) throw error;
        toast.success("Campanha atualizada com sucesso");
      } else {
        const { error } = await supabase.from('campaigns').insert(formData);
        if (error) throw error;
        toast.success("Campanha criada com sucesso");
      }
      setIsFormOpen(false);
      setEditingCampaign(null);
      fetchData();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Erro ao salvar campanha");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta campanha?")) return;
    try {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
      toast.success("Campanha excluída com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Erro ao excluir campanha");
    }
  };

  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Ativa</Badge>;
      case 'paused': return <Badge variant="secondary">Pausada</Badge>;
      case 'completed': return <Badge variant="outline">Concluída</Badge>;
      default: return <Badge variant="outline">Rascunho</Badge>;
    }
  };

  return (
    <MainLayout>
      <PageSEO title="Campanhas" description="Gerencie as campanhas de marketing." path="/admin/campanhas" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Campanhas</h1>
            <p className="text-muted-foreground">Gerencie campanhas sazonais e promoções</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Lista de Campanhas</CardTitle><CardDescription>Monitore e gerencie o status das campanhas</CardDescription></div>
            <Button onClick={() => { setEditingCampaign(null); setIsFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Campanha</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Orçamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma campanha encontrada</TableCell></TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" /> {c.start_date ? new Date(c.start_date).toLocaleDateString() : "-"} até {c.end_date ? new Date(c.end_date).toLocaleDateString() : "-"}
                          </div>
                        </TableCell>
                        <TableCell>R$ {c.budget?.toLocaleString() || "-"}</TableCell>
                        <TableCell>{getStatusBadge(c.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setEditingCampaign(c); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Nome</Label><Input className="col-span-3" value={editingCampaign?.name || ''} onChange={(e) => setEditingCampaign({ ...(editingCampaign || {}), name: e.target.value })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Status</Label><div className="col-span-3"><Select value={editingCampaign?.status || 'draft'} onValueChange={(val) => setEditingCampaign({ ...(editingCampaign || {}), status: val })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="active">Ativa</SelectItem><SelectItem value="paused">Pausada</SelectItem><SelectItem value="completed">Concluída</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Orçamento</Label><Input type="number" className="col-span-3" value={editingCampaign?.budget || 0} onChange={(e) => setEditingCampaign({ ...(editingCampaign || {}), budget: parseFloat(e.target.value) })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Início</Label><Input type="date" className="col-span-3" value={editingCampaign?.start_date?.split('T')[0] || ''} onChange={(e) => setEditingCampaign({ ...(editingCampaign || {}), start_date: e.target.value })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Fim</Label><Input type="date" className="col-span-3" value={editingCampaign?.end_date?.split('T')[0] || ''} onChange={(e) => setEditingCampaign({ ...(editingCampaign || {}), end_date: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button><Button onClick={() => handleSave(editingCampaign)}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
