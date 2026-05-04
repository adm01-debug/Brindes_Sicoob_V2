import React, { useState, useEffect } from 'react';
import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Wallet, TrendingUp, AlertTriangle, History, Download, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as XLSX from 'xlsx';

export default function AdminVerbasPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [pas, setPas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [newCategoryThreshold, setNewCategoryThreshold] = useState({ pa_id: '', category_id: '', limite_alcada: 0 });

  
  // Budget alert settings
  const [alertConfig, setAlertConfig] = useState({
    warningThreshold: 70, // 70%
    criticalThreshold: 90  // 90%
  });

  const [categoryThresholds, setCategoryThresholds] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const fetchCategoryData = async () => {
    const { data: ctData } = await supabase
      .from('pa_category_thresholds')
      .select('*, postos_atendimento(nome)')
      .order('pa_id');
    setCategoryThresholds(ctData || []);

    const { data: cData } = await supabase
      .from('product_categories')
      .select('id, name')
      .order('name');
    setCategories(cData || []);
  };

  const exportAuditToCSV = () => {
    const ws = XLSX.utils.json_to_sheet(auditLogs.map(log => ({
      Data: format(new Date(log.created_at), 'dd/MM/yyyy HH:mm'),
      Evento: log.event_type,
      Usuario: log.metadata?.user_email || 'Sistema',
      Detalhes: JSON.stringify(log.payload)
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histórico");
    XLSX.writeFile(wb, `auditoria_verbas_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const { data: auditLogs = [] } = useQuery({
    queryKey: ['admin-budgets-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .eq('entity_type', 'pa_budgets')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    }
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: bData, error: bError } = await supabase
        .from('pa_budgets')
        .select('*, postos_atendimento(nome, codigo)')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });
      if (bError) throw bError;
      
      const { data: pData, error: pError } = await supabase
        .from('postos_atendimento')
        .select('id, nome, codigo')
        .order('nome', { ascending: true });
      if (pError) throw pError;

      setBudgets(bData || []);
      setPas(pData || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      toast.error("Erro ao carregar orçamentos/verbas");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (formData: any) => {
    try {
      const dataToSave = { ...formData };
      delete dataToSave.postos_atendimento;

      if (editingBudget) {
        const { error } = await supabase.from('pa_budgets').update(dataToSave).eq('id', editingBudget.id);
        if (error) throw error;
        toast.success("Verba atualizada com sucesso");
      } else {
        const { error } = await supabase.from('pa_budgets').insert(dataToSave);
        if (error) throw error;
        toast.success("Verba criada com sucesso");
      }
      setIsFormOpen(false);
      setEditingBudget(null);
      fetchData();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error("Erro ao salvar verba");
    }
  };

  const handleSaveCategoryThreshold = async () => {
    try {
      if (!newCategoryThreshold.pa_id || !newCategoryThreshold.category_id) {
        toast.error("Preencha todos os campos");
        return;
      }
      const { error } = await supabase
        .from('pa_category_thresholds')
        .insert({
          pa_id: newCategoryThreshold.pa_id,
          category_id: parseInt(newCategoryThreshold.category_id),
          limite_alcada: newCategoryThreshold.limite_alcada
        });
      if (error) throw error;
      toast.success("Limite por categoria salvo!");
      setIsCategoryFormOpen(false);
      fetchCategoryData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar limite");
    }
  };

  const handleDeleteCategoryThreshold = async (id: string) => {
    if (!confirm("Remover este limite específico?")) return;
    try {
      const { error } = await supabase.from('pa_category_thresholds').delete().eq('id', id);
      if (error) throw error;
      toast.success("Limite removido");
      fetchCategoryData();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover");
    }
  };

  const exportBudgets = () => {
    const data = budgets.map(b => ({
      'PA': b.postos_atendimento?.nome,
      'Código': b.postos_atendimento?.codigo,
      'Mês': b.mes,
      'Ano': b.ano,
      'Verba Total': b.verba_total,
      'Consumido': b.verba_consumida,
      'Alçada': b.limite_alcada
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Verbas");
    XLSX.writeFile(workbook, `verbas_admin_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filtered = budgets.filter(b => 
    b.postos_atendimento?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.postos_atendimento?.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <MainLayout>
      <PageSEO title="Gestão de Verbas" description="Administre as verbas dos PAs." path="/admin/verbas" noIndex />
      <div className="w-full max-w-[1920px] mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Gestão de Verbas (Orçamentos)</h1>
            <p className="text-muted-foreground">Controle o limite de crédito e verbas por PA</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Planejado (Mês Atual)</p>
                  <h3 className="text-2xl font-bold mt-1">R$ {budgets.reduce((acc, b) => b.mes === new Date().getMonth() + 1 ? acc + b.verba_total : acc, 0).toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg text-primary"><TrendingUp className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Consumido (Mês Atual)</p>
                  <h3 className="text-2xl font-bold mt-1">R$ {budgets.reduce((acc, b) => b.mes === new Date().getMonth() + 1 ? acc + (b.verba_consumida || 0) : acc, 0).toLocaleString()}</h3>
                </div>
                <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-600"><Wallet className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alertas de Limite</p>
                  <h3 className="text-2xl font-bold mt-1 text-red-600">
                    {budgets.filter(b => (b.verba_consumida / b.verba_total) * 100 > alertConfig.criticalThreshold).length}
                  </h3>
                </div>
                <div className="p-2 bg-red-500/10 rounded-lg text-red-600"><AlertTriangle className="h-5 w-5" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="limits" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="limits" className="gap-2"><Wallet className="h-4 w-4" /> Limites por PA</TabsTrigger>
            <TabsTrigger value="categories" className="gap-2"><Plus className="h-4 w-4" /> Por Categoria</TabsTrigger>
            <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Histórico de Alterações</TabsTrigger>
          </TabsList>

          <TabsContent value="limits">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle>Limites por PA</CardTitle><CardDescription>Gerencie as verbas mensais e limites de alçada</CardDescription></div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={exportBudgets} className="gap-2"><Download className="h-4 w-4" /> Exportar</Button>
                  <Button onClick={() => { setEditingBudget(null); setIsFormOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Nova Verba</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar por PA..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" /></div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PA</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Verba Total</TableHead>
                        <TableHead>Consumido</TableHead>
                        <TableHead>Limite Alçada</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
                      ) : filtered.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma verba encontrada</TableCell></TableRow>
                      ) : (
                        filtered.map((b) => {
                          const percent = (b.verba_consumida / b.verba_total) * 100;
                          return (
                            <TableRow key={b.id}>
                              <TableCell><div className="font-medium">{b.postos_atendimento?.nome}</div><div className="text-xs text-muted-foreground">{b.postos_atendimento?.codigo}</div></TableCell>
                              <TableCell><Badge variant="outline">{String(b.mes).padStart(2, '0')}/{b.ano}</Badge></TableCell>
                              <TableCell className="font-medium">R$ {b.verba_total.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 min-w-[140px]">
                                  <div className="flex justify-between text-[11px] mb-0.5">
                                    <span className={percent > alertConfig.criticalThreshold ? "text-red-600 font-bold" : percent > alertConfig.warningThreshold ? "text-yellow-600 font-bold" : ""}>
                                      R$ {(b.verba_consumida || 0).toLocaleString()}
                                    </span>
                                    <span className="text-muted-foreground">{percent.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden border border-border/20">
                                    <div 
                                      className={`h-full transition-all duration-500 ${percent > alertConfig.criticalThreshold ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" : percent > alertConfig.warningThreshold ? "bg-yellow-500" : "bg-green-500"}`} 
                                      style={{ width: `${Math.min(100, percent)}%` }} 
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>R$ {b.limite_alcada?.toLocaleString() || "-"}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingBudget(b); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Limites por Categoria (Override)</CardTitle>
                  <CardDescription>Defina alçadas específicas para categorias de produtos por PA.</CardDescription>
                </div>
                <Button size="sm" className="gap-2" onClick={() => setIsCategoryFormOpen(true)}>
                  <Plus className="h-4 w-4" /> Novo Limite
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PA</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Limite Alçada</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryThresholds.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum limite específico cadastrado</TableCell></TableRow>
                      ) : (
                        categoryThresholds.map((ct) => (
                          <TableRow key={ct.id}>
                            <TableCell>{ct.postos_atendimento?.nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {categories.find(c => c.id === ct.category_id)?.name || ct.category_id}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-primary">R$ {ct.limite_alcada.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteCategoryThreshold(ct.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Orçamentos</CardTitle>
                <CardDescription>Últimas 50 ações realizadas no módulo de verbas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => exportAuditToCSV()} className="gap-2">
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2">
                    <FileText className="h-4 w-4" /> PDF (Imprimir)
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Detalhes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogs.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum histórico encontrado</TableCell></TableRow>
                      ) : (
                        auditLogs.map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="text-xs">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                            <TableCell><Badge variant="outline" className="text-[10px] uppercase">{log.event_type}</Badge></TableCell>
                            <TableCell className="text-xs">{log.metadata?.user_email || 'Sistema'}</TableCell>
                            <TableCell className="text-xs font-mono max-w-[400px] truncate">{JSON.stringify(log.payload)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <BudgetFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} budget={editingBudget} onSave={handleSave} pas={pas} />

      <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Limite por Categoria</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Posto de Atendimento</Label>
              <Select onValueChange={(v) => setNewCategoryThreshold(prev => ({ ...prev, pa_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o PA" />
                </SelectTrigger>
                <SelectContent>
                  {pas.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select onValueChange={(v) => setNewCategoryThreshold(prev => ({ ...prev, category_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Limite de Alçada (R$)</Label>
              <Input 
                type="number" 
                value={newCategoryThreshold.limite_alcada} 
                onChange={(e) => setNewCategoryThreshold(prev => ({ ...prev, limite_alcada: parseFloat(e.target.value) }))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategoryThreshold}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function BudgetFormDialog({ open, onOpenChange, budget, onSave, pas }: any) {
  const [formData, setFormData] = useState<any>({ pa_id: '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, verba_total: 0, limite_alcada: 0, observacoes: '' });
  useEffect(() => { if (budget) setFormData(budget); else setFormData({ pa_id: pas[0]?.id || '', ano: new Date().getFullYear(), mes: new Date().getMonth() + 1, verba_total: 0, limite_alcada: 0, observacoes: '' }); }, [budget, open, pas]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{budget ? 'Editar Verba' : 'Nova Verba'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">PA</Label>
            <div className="col-span-3">
              <Select value={formData.pa_id || ""} onValueChange={(val) => setFormData({ ...formData, pa_id: val })}>
                <SelectTrigger><SelectValue placeholder="Selecione o PA" /></SelectTrigger>
                <SelectContent>{pas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.codigo})</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Ano/Mês</Label><div className="col-span-3 flex gap-2"><Input type="number" value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })} /><Input type="number" min="1" max="12" value={formData.mes} onChange={(e) => setFormData({ ...formData, mes: parseInt(e.target.value) })} /></div></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Verba Total</Label><Input type="number" className="col-span-3" value={formData.verba_total} onChange={(e) => setFormData({ ...formData, verba_total: parseFloat(e.target.value) })} /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Alçada (Aprovação)</Label><Input type="number" className="col-span-3" value={formData.limite_alcada} onChange={(e) => setFormData({ ...formData, limite_alcada: parseFloat(e.target.value) })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={() => onSave(formData)}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
