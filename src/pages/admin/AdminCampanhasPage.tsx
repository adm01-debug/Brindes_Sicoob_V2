import React, { useState, useEffect, useMemo } from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Megaphone, Calendar, Tag, Filter, CheckCircle2, AlertCircle, Users, FileDown, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { logAdminAction } from "@/utils/adminAudit";
// XLSX will be loaded dynamically when needed

export default function AdminCampanhasPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  
  // Advanced filters state
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filters.status]); // Re-fetch on status change


  const handleSave = async (formData: any) => {
    try {
      if (editingCampaign?.id) {
        const { error } = await supabase.from('campaigns').update(formData).eq('id', editingCampaign.id);
        if (error) throw error;
        await logAdminAction({
          event_type: 'UPDATE',
          entity_type: 'campaigns',
          entity_id: editingCampaign.id,
          payload: formData,
          previous_state: editingCampaign
        });
        toast.success("Campanha atualizada com sucesso");
      } else {
        const { data, error } = await supabase.from('campaigns').insert(formData).select().single();
        if (error) throw error;
        await logAdminAction({
          event_type: 'CREATE',
          entity_type: 'campaigns',
          entity_id: data.id,
          payload: formData
        });
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
      await logAdminAction({
        event_type: 'DELETE',
        entity_type: 'campaigns',
        entity_id: id
      });
      toast.success("Campanha excluída com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast.error("Erro ao excluir campanha");
    }
  };

  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (filters.startDate || filters.endDate) {
        const campaignStart = c.start_date ? new Date(c.start_date) : null;
        if (campaignStart) {
          if (filters.startDate && campaignStart < startOfDay(new Date(filters.startDate))) matchesDate = false;
          if (filters.endDate && campaignStart > endOfDay(new Date(filters.endDate))) matchesDate = false;
        } else if (filters.startDate || filters.endDate) {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesDate;
    });
  }, [campaigns, searchTerm, filters]);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    const data = filtered.map(c => ({
      'Nome': c.name,
      'Status': c.status,
      'Orçamento': c.budget,
      'Data Início': c.start_date ? format(new Date(c.start_date), 'dd/MM/yyyy') : '',
      'Data Fim': c.end_date ? format(new Date(c.end_date), 'dd/MM/yyyy') : '',
      'Público-Alvo': c.target_audience || ''
    }));

    if (format === 'xlsx') {
      try {
        const XLSX = await import('@e965/xlsx');
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Campanhas");
        XLSX.writeFile(workbook, `campanhas_admin_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        toast.success("Relatório exportado em XLSX");
      } catch (error) {
        console.error("Error exporting to XLSX:", error);
        toast.error("Erro ao carregar módulo de exportação");
      }
    } else {
      const headers = Object.keys(data[0] || {}).join(",");
      const csvContent = [headers, ...data.map(row => Object.values(row).join(","))].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `campanhas_admin_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      toast.success("Relatório exportado em CSV");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" /> Ativa</Badge>;
      case 'paused': return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Pausada</Badge>;
      case 'completed': return <Badge variant="outline" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Concluída</Badge>;
      default: return <Badge variant="outline" className="gap-1">Rascunho</Badge>;
    }
  };


  return (
    <>
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
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Lista de Campanhas</CardTitle>
              <CardDescription>Monitore e gerencie o status das campanhas</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')} className="gap-2">
                <FileDown className="h-4 w-4" /> XLSX
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-2">
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button onClick={() => { setEditingCampaign(null); setIsFormOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Nova Campanha
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="paused">Pausada</SelectItem>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" value={filters.startDate} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))} className="w-full" />
              <Input type="date" value={filters.endDate} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))} className="w-full" />
            </div>
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

      <CampaignFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        campaign={editingCampaign} 
        onSave={handleSave} 
      />
    </>
  );
}

function CampaignFormDialog({ open, onOpenChange, campaign, onSave }: any) {
  const [formData, setFormData] = useState<any>({ 
    name: '', 
    status: 'draft', 
    budget: 0, 
    start_date: '', 
    end_date: '', 
    description: '',
    target_audience: ''
  });

  useEffect(() => { 
    if (campaign) {
      setFormData({
        ...campaign,
        start_date: campaign.start_date?.split('T')[0] || '',
        end_date: campaign.end_date?.split('T')[0] || ''
      });
    } else {
      setFormData({ name: '', status: 'draft', budget: 0, start_date: '', end_date: '', description: '', target_audience: '' });
    }
  }, [campaign, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{campaign ? 'Editar Campanha' : 'Nova Campanha'}</DialogTitle>
          <DialogDescription>Defina os parâmetros e segmentação da campanha.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="basic" className="py-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="segmentation">Segmentação</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Campanha</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: Black Friday 2024" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="paused">Pausada</SelectItem>
                    <SelectItem value="completed">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="budget">Orçamento (R$)</Label>
                <Input id="budget" type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start">Data Início</Label>
                <Input id="start" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end">Data Fim</Label>
                <Input id="end" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Descrição</Label>
              <Textarea id="desc" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Objetivos da campanha..." />
            </div>
          </TabsContent>

          <TabsContent value="segmentation" className="space-y-4 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="audience">Público-Alvo</Label>
              <Input id="audience" value={formData.target_audience || ''} onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })} placeholder="Ex: Clientes Inativos, Cooperados PAC..." />
            </div>
            <div className="p-4 bg-muted/30 rounded-lg border border-dashed text-center">
              <Users className="h-8 w-8 mx-auto opacity-20 mb-2" />
              <p className="text-xs text-muted-foreground">Filtros avançados de segmentação por comportamento de compra serão habilitados na Onda 3.</p>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(formData)}>Salvar Campanha</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
