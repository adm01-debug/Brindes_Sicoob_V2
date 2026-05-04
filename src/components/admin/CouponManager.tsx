import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Ticket, Percent, DollarSign, Calendar, Copy, History } from "lucide-react";
import { useDuplicateEntity } from "@/hooks/useDuplicateEntity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CouponManager() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("list");
  
  const duplicateEntity = useDuplicateEntity("coupons", ["coupons_list"]);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCoupons(data || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      toast.error("Erro ao carregar cupons");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSave = async (formData: any) => {
    try {
      if (editingCoupon) {
        const { error } = await supabase.from('coupons').update(formData).eq('id', editingCoupon.id);
        if (error) throw error;
        toast.success("Cupom atualizado com sucesso");
      } else {
        const { error } = await supabase.from('coupons').insert(formData);
        if (error) throw error;
        toast.success("Cupom criado com sucesso");
      }
      setIsFormOpen(false);
      setEditingCoupon(null);
      fetchCoupons();
    } catch (error) {
      console.error("Error saving coupon:", error);
      toast.error("Erro ao salvar cupom");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    try {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
      toast.success("Cupom excluído com sucesso");
      fetchCoupons();
    } catch (error) {
      console.error("Error deleting coupon:", error);
      toast.error("Erro ao excluir cupom");
    }
  };

  const filtered = coupons.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => { setEditingCoupon(null); setIsFormOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Cupom
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Uso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cupom encontrado</TableCell></TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                  <TableCell>
                    {c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${c.discount_value.toLocaleString()}`}
                  </TableCell>
                  <TableCell>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Sem expiração"}
                  </TableCell>
                  <TableCell>
                    {c.usage_count} / {c.usage_limit || "∞"}
                  </TableCell>
                  <TableCell><Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setEditingCoupon(c); setIsFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Código</Label><Input className="col-span-3" value={editingCoupon?.code || ''} onChange={(e) => setEditingCoupon({ ...(editingCoupon || {}), code: e.target.value.toUpperCase() })} /></div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tipo</Label>
              <div className="col-span-3">
                <Select value={editingCoupon?.discount_type || 'percentage'} onValueChange={(val) => setEditingCoupon({ ...(editingCoupon || {}), discount_type: val })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percentage">Porcentagem (%)</SelectItem><SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Valor</Label><Input type="number" className="col-span-3" value={editingCoupon?.discount_value || 0} onChange={(e) => setEditingCoupon({ ...(editingCoupon || {}), discount_value: parseFloat(e.target.value) })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Limite Uso</Label><Input type="number" className="col-span-3" value={editingCoupon?.usage_limit || 0} onChange={(e) => setEditingCoupon({ ...(editingCoupon || {}), usage_limit: parseInt(e.target.value) })} /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Expira em</Label><Input type="date" className="col-span-3" value={editingCoupon?.expires_at?.split('T')[0] || ''} onChange={(e) => setEditingCoupon({ ...(editingCoupon || {}), expires_at: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button><Button onClick={() => handleSave(editingCoupon)}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
