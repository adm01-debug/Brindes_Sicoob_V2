import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, Ticket, Copy, History } from "lucide-react";
import { useDuplicateEntity } from "@/hooks/common/useDuplicateEntity";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Coupon = Database["public"]["Tables"]["coupons"]["Row"];
type CouponDraft = Database["public"]["Tables"]["coupons"]["Insert"] & { id?: string };

const EMPTY_COUPON: CouponDraft = {
  code: "",
  discount_type: "percentage",
  discount_value: 0,
};

interface CouponTableProps {
  coupons: Coupon[];
  isLoading: boolean;
  isDuplicating: boolean;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (coupon: Coupon) => void;
}

function CouponTable({ coupons, isLoading, isDuplicating, onDelete, onDuplicate, onEdit }: CouponTableProps) {
  let rows: React.ReactNode;
  if (isLoading) {
    rows = <TableRow><TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell></TableRow>;
  } else if (coupons.length === 0) {
    rows = <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum cupom encontrado</TableCell></TableRow>;
  } else {
    rows = coupons.map((coupon) => (
      <TableRow key={coupon.id}>
        <TableCell className="font-mono font-bold text-primary">{coupon.code}</TableCell>
        <TableCell>{coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value.toLocaleString()}`}</TableCell>
        <TableCell>{coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : "Sem expiração"}</TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">{coupon.usage_count} / {coupon.usage_limit || "∞"}</span>
            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${coupon.usage_limit ? Math.min(((coupon.usage_count ?? 0) / coupon.usage_limit) * 100, 100) : 0}%` }} />
            </div>
          </div>
        </TableCell>
        <TableCell><Badge variant={coupon.is_active ? "default" : "secondary"}>{coupon.is_active ? "Ativo" : "Inativo"}</Badge></TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title="Duplicar" onClick={() => onDuplicate(coupon.id)} disabled={isDuplicating}><Copy className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(coupon)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(coupon.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Desconto</TableHead><TableHead>Vencimento</TableHead><TableHead>Uso</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  );
}

interface CouponFormProps {
  coupon: CouponDraft | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (coupon: CouponDraft) => void;
  setCoupon: (coupon: CouponDraft) => void;
}

function CouponForm({ coupon, open, onOpenChange, onSave, setCoupon }: CouponFormProps) {
  const draft = coupon ?? EMPTY_COUPON;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader><DialogTitle>{coupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Código</Label><Input className="col-span-3" value={draft.code} onChange={(event) => setCoupon({ ...draft, code: event.target.value.toUpperCase() })} /></div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Tipo</Label>
            <div className="col-span-3"><Select value={draft.discount_type || 'percentage'} onValueChange={(value) => setCoupon({ ...draft, discount_type: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Porcentagem (%)</SelectItem><SelectItem value="fixed_amount">Valor Fixo (R$)</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Valor</Label><Input type="number" className="col-span-3" value={draft.discount_value || 0} onChange={(event) => setCoupon({ ...draft, discount_value: parseFloat(event.target.value) })} /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Limite Uso</Label><Input type="number" className="col-span-3" value={draft.usage_limit || 0} onChange={(event) => setCoupon({ ...draft, usage_limit: parseInt(event.target.value) })} /></div>
          <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right">Expira em</Label><Input type="date" className="col-span-3" value={draft.expires_at?.split('T')[0] || ''} onChange={(event) => setCoupon({ ...draft, expires_at: event.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!coupon} onClick={() => coupon && onSave(coupon)}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<CouponDraft | null>(null);
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

  const handleSave = async (formData: CouponDraft) => {
    try {
      if (editingCoupon?.id) {
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="list" className="gap-2">
            <Ticket className="h-4 w-4" /> Cupons Ativos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Histórico de Uso
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
          </div>
          <Button onClick={() => { setEditingCoupon(EMPTY_COUPON); setIsFormOpen(true); }} className="gap-2 h-9">
            <Plus className="h-4 w-4" /> Novo Cupom
          </Button>
        </div>
      </div>

      <TabsContent value="list" className="mt-0">
        <CouponTable
          coupons={filtered}
          isLoading={isLoading}
          isDuplicating={duplicateEntity.isPending}
          onDelete={handleDelete}
          onDuplicate={(id) => duplicateEntity.mutate(id)}
          onEdit={(coupon) => { setEditingCoupon(coupon); setIsFormOpen(true); }}
        />
      </TabsContent>

      <TabsContent value="history" className="mt-0">
        <div className="rounded-md border bg-card p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
            <History className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">Histórico de Uso</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Em breve você poderá visualizar aqui o histórico detalhado de cada utilização dos cupons.
            </p>
          </div>
        </div>
      </TabsContent>

      <CouponForm coupon={editingCoupon} open={isFormOpen} onOpenChange={setIsFormOpen}
        onSave={handleSave} setCoupon={setEditingCoupon} />
      </Tabs>
    </div>
  );
}
