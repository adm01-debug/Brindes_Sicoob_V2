import React, { useState, useEffect } from 'react';
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Globe, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";
import { askConfirm } from '@/stores/useConfirmDialogStore';

type Central = Tables<"sicoob_centrais">;
interface CentralFormData {
  name: string;
  code: string;
  region: string;
  logo_url: string;
  primary_color: string;
}

interface CentralFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  central: Central | null;
  onSave: (formData: CentralFormData) => Promise<void>;
}

const EMPTY_CENTRAL_FORM: CentralFormData = {
  name: "",
  code: "",
  region: "",
  logo_url: "",
  primary_color: "#003641",
};

export default function AdminCentraisPage() {
  const [centrais, setCentrais] = useState<Central[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCentral, setEditingCentral] = useState<Central | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sicoob_centrais')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setCentrais(data || []);
    } catch (error) {
      console.error("Error fetching centrais:", error);
      toast.error("Erro ao carregar Centrais Regionais");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (formData: CentralFormData) => {
    try {
      if (editingCentral) {
        const { error } = await supabase.from('sicoob_centrais').update(formData).eq('id', editingCentral.id);
        if (error) throw error;
        toast.success("Central Regional atualizada");
      } else {
        const { error } = await supabase.from('sicoob_centrais').insert(formData);
        if (error) throw error;
        toast.success("Central Regional criada");
      }
      setIsFormOpen(false);
      setEditingCentral(null);
      fetchData();
    } catch (error) {
      console.error("Error saving central:", error);
      toast.error("Erro ao salvar Central");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await askConfirm({ title: 'Excluir Central?', description: 'Isso pode desvincular Singulares. Esta ação não pode ser desfeita.', variant: 'destructive', confirmLabel: 'Excluir' }))) return;
    try {
      const { error } = await supabase.from('sicoob_centrais').delete().eq('id', id);
      if (error) throw error;
      toast.success("Central removida com sucesso");
      fetchData();
    } catch (error) {
      console.error("Error deleting central:", error);
      toast.error("Erro ao excluir Central");
    }
  };

  const filtered = centrais.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.code ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <PageSEO title="Gerenciar Centrais Sicoob" description="Administre os nós regionais (Centrais) do ecossistema Sicoob." path="/admin/centrais" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sicoob-green/10">
            <Globe className="h-8 w-8 text-sicoob-green" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">Centrais Regionais Sicoob</h1>
            <p className="text-muted-foreground">Governança de nível superior e regionalização do catálogo</p>
          </div>
        </div>

        <Card className="border-border/40 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Rede Regional</CardTitle>
              <CardDescription>Defina os centros de governança que agrupam as Singulares.</CardDescription>
            </div>
            <Button onClick={() => { setEditingCentral(null); setIsFormOpen(true); }} className="gap-2 bg-sicoob-green hover:bg-sicoob-green-dark text-white rounded-xl h-10 px-6 font-bold uppercase text-[10px] tracking-widest">
              <Plus className="h-4 w-4" /> Nova Central
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, código ou região..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-11 rounded-xl" />
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Central / Identificação</TableHead>
                    <TableHead>Região Atuação</TableHead>
                    <TableHead>Identidade Visual</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Sincronizando infraestrutura regional...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma Central regional configurada.</TableCell></TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell>
                          <div className="font-bold text-sicoob-green-dark">{c.name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase font-bold">CÓDIGO: {c.code}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <MapPin className="h-3.5 w-3.5 text-sicoob-green" /> {c.region || "Território Nacional"}
                          </div>
                        </TableCell>
                        <TableCell>
                           <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full border border-border/60 shadow-inner" style={{ backgroundColor: c.primary_color || '#003641' }} />
                              <span className="text-[10px] font-mono uppercase text-muted-foreground">{c.primary_color || "#003641"}</span>
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setEditingCentral(c); setIsFormOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <CentralFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} central={editingCentral} onSave={handleSave} />
    </>
  );
}


function CentralFormDialog({ open, onOpenChange, central, onSave }: CentralFormDialogProps) {
  const [formData, setFormData] = useState<CentralFormData>(EMPTY_CENTRAL_FORM);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { 
    if (central) {
      setFormData({
        name: central.name,
        code: central.code ?? "",
        region: central.region ?? "",
        logo_url: central.logo_url ?? "",
        primary_color: central.primary_color ?? "#003641",
      });
    } else {
      setFormData(EMPTY_CENTRAL_FORM);
    }
  }, [central, open]);

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
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-display font-bold text-sicoob-green-dark">{central ? 'Editar Central' : 'Nova Central Regional'}</DialogTitle>
          <DialogDescription>Dados de infraestrutura regional e identidade Sicoob.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold uppercase">Nome da Central</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="rounded-xl h-11" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-xs font-bold uppercase">Abreviatura / Código</Label>
              <Input id="code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required placeholder="Ex: SC-RS" className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region" className="text-xs font-bold uppercase">Região Geográfica</Label>
              <Input id="region" value={formData.region} onChange={(e) => setFormData({ ...formData, region: e.target.value })} placeholder="Ex: Sul" className="rounded-xl h-11" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo" className="text-xs font-bold uppercase">Logo URL (Custom)</Label>
              <Input id="logo" value={formData.logo_url || ''} onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })} className="rounded-xl h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color" className="text-xs font-bold uppercase flex items-center gap-2">
                 Cor Principal <div className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: formData.primary_color }} />
              </Label>
              <Input id="color" type="color" value={formData.primary_color || '#003641'} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="rounded-xl h-11 cursor-pointer" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={isSaving} className="bg-sicoob-green hover:bg-sicoob-green-dark text-white rounded-xl px-10 h-11 font-bold">
               {isSaving ? "Gravando..." : "Confirmar Central"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
