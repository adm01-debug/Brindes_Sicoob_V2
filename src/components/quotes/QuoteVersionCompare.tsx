import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, TrendingUp, TrendingDown, Minus, GitCompare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { QuoteVersion } from "@/hooks/useQuoteVersions";

interface QuoteItem {
  id: string;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number | null;
  color_name: string | null;
}

interface QuoteDetail {
  id: string;
  quote_number: string;
  version: number;
  status: string;
  subtotal: number;
  total: number;
  discount_amount: number;
  discount_percent: number;
  shipping_cost: number | null;
  payment_terms: string | null;
  delivery_time: string | null;
  notes: string | null;
  created_at: string;
  items: QuoteItem[];
}

async function fetchQuoteDetail(id: string): Promise<QuoteDetail | null> {
  const { data: quote } = await supabase
    // rls-allow: lookup por id específico; RLS valida ownership
    .from("quotes")
    .select("id, quote_number, version, status, subtotal, total, discount_amount, discount_percent, shipping_cost, payment_terms, delivery_time, notes, created_at")
    .eq("id", id)
    .single();

  if (!quote) return null;
  const { data: items } = await supabase
    .from("quote_items")
    .select("id, product_name, product_sku, quantity, unit_price, subtotal, color_name")
    .eq("quote_id", id)
    .order("sort_order", { ascending: true });
  return { ...quote, items: items || [] } as QuoteDetail;
}

interface QuoteVersionCompareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: QuoteVersion[];
  currentQuoteId?: string;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

function DiffBadge({ oldVal, newVal, format: fmt }: { oldVal: number; newVal: number; format?: (v: number) => string }) {
  const diff = newVal - oldVal;
  const formatted = fmt ? fmt(Math.abs(diff)) : Math.abs(diff).toString();
  if (diff === 0) return <Badge variant="outline" className="text-muted-foreground"><Minus className="h-3 w-3 mr-1" />Igual</Badge>;
  if (diff > 0) return <Badge className="bg-primary/15 text-primary border-primary/30"><TrendingUp className="h-3 w-3 mr-1" />+{formatted}</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/20"><TrendingDown className="h-3 w-3 mr-1" />-{formatted}</Badge>;
}

function ComparisonRow({ label, valA, valB }: { label: string; valA: string | number | null; valB: string | number | null }) {
  const hasChanged = valA !== valB;
  return (
    <div className={cn("grid grid-cols-12 gap-2 text-xs py-2 border-b last:border-0", hasChanged ? "bg-amber-500/5" : "")}>
      <div className="col-span-2 font-medium text-muted-foreground">{label}</div>
      <div className="col-span-5 text-muted-foreground break-words">{valA || "—"}</div>
      <div className="col-span-5 font-medium break-words">
        {valB || "—"}
        {hasChanged && <Badge variant="outline" className="ml-2 h-4 text-[9px] border-amber-500/30 text-amber-600">Alterado</Badge>}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

function useVersionComparison(versions: QuoteVersion[]) {
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [leftDetail, setLeftDetail] = useState<QuoteDetail | null>(null);
  const [rightDetail, setRightDetail] = useState<QuoteDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (versions.length >= 2) {
      const leftVersion = versions[versions.length - 2];
      const rightVersion = versions[versions.length - 1];
      if (!leftVersion || !rightVersion) return;
      setLeftId(leftVersion.id);
      setRightId(rightVersion.id);
    }
  }, [versions]);

  useEffect(() => {
    if (!leftId || !rightId) return;
    let active = true;
    setLoading(true);
    void Promise.all([fetchQuoteDetail(leftId), fetchQuoteDetail(rightId)])
      .then(([left, right]) => {
        if (!active) return;
        setLeftDetail(left);
        setRightDetail(right);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [leftId, rightId]);
  return { leftId, setLeftId, rightId, setRightId, leftDetail, rightDetail, loading };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado",
};

function VersionSelectors({ versions, leftId, rightId, setLeftId, setRightId }: {
  versions: QuoteVersion[]; leftId: string; rightId: string;
  setLeftId: (id: string) => void; setRightId: (id: string) => void;
}) {
  const selector = (id: string, setId: (value: string) => void) => <Select value={id} onValueChange={setId}>
    <SelectTrigger><SelectValue placeholder="Selecionar versão" /></SelectTrigger><SelectContent>
      {versions.map((version) => <SelectItem key={version.id} value={version.id}>v{version.version} — {version.quote_number}</SelectItem>)}
    </SelectContent></Select>;
  return <div className="flex items-center gap-4 mb-4"><div className="flex-1">
    <label className="text-xs text-muted-foreground mb-1 block">Versão A</label>{selector(leftId, setLeftId)}
  </div><ArrowRight className="h-5 w-5 text-muted-foreground mt-5" /><div className="flex-1">
    <label className="text-xs text-muted-foreground mb-1 block">Versão B</label>{selector(rightId, setRightId)}
  </div></div>;
}

function VersionSummaryCard({ detail, highlighted }: { detail: QuoteDetail; highlighted: boolean }) {
  return <Card className={highlighted ? "border-primary/30" : ""}><CardHeader className="pb-2">
    <CardTitle className="text-sm flex items-center justify-between"><span>v{detail.version} — {detail.quote_number}</span>
      <Badge variant={detail.status === "approved" ? "default" : "outline"}>{STATUS_LABELS[detail.status] || detail.status}</Badge>
    </CardTitle><p className="text-xs text-muted-foreground">
      {format(new Date(detail.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
  </CardHeader><CardContent className="space-y-2 text-sm">
    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium">{formatCurrency(detail.subtotal)}</span></div>
    <div className="flex justify-between"><span className="text-muted-foreground">Desconto</span><span>{detail.discount_percent}% ({formatCurrency(detail.discount_amount)})</span></div>
    <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{formatCurrency(detail.shipping_cost || 0)}</span></div>
    <Separator /><div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(detail.total)}</span></div>
    <div className="flex justify-between text-xs"><span className="text-muted-foreground">Itens</span><span>{detail.items.length}</span></div>
  </CardContent></Card>;
}

function ComparisonDetails({ left, right }: { left: QuoteDetail; right: QuoteDetail }) {
  return <><div className="grid grid-cols-2 gap-4"><VersionSummaryCard detail={left} highlighted={false} />
    <VersionSummaryCard detail={right} highlighted /></div>
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Condições e Termos</CardTitle></CardHeader>
      <CardContent><div className="space-y-2"><ComparisonRow label="Pagamento" valA={left.payment_terms} valB={right.payment_terms} />
        <ComparisonRow label="Entrega" valA={left.delivery_time} valB={right.delivery_time} />
        <ComparisonRow label="Observações" valA={left.notes} valB={right.notes} /></div></CardContent></Card>
    <DifferencesCard left={left} right={right} /><ItemsComparison left={left} right={right} /></>;
}

function DifferencesCard({ left, right }: { left: QuoteDetail; right: QuoteDetail }) {
  return <Card className="bg-muted/30"><CardHeader className="pb-2"><CardTitle className="text-sm">Diferenças</CardTitle></CardHeader>
    <CardContent className="flex flex-wrap gap-3">
      <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Total:</span>
        <DiffBadge oldVal={left.total} newVal={right.total} format={formatCurrency} /></div>
      <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Itens:</span>
        <DiffBadge oldVal={left.items.length} newVal={right.items.length} /></div>
      <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Desconto:</span>
        <DiffBadge oldVal={left.discount_percent} newVal={right.discount_percent} format={(value) => `${value}%`} /></div>
    </CardContent></Card>;
}

function ComparedItem({ item, other }: { item: QuoteItem; other: QuoteDetail }) {
  const otherItem = other.items.find((candidate) => candidate.product_sku === item.product_sku);
  const isNew = !otherItem;
  const changed = otherItem && (otherItem.quantity !== item.quantity || otherItem.unit_price !== item.unit_price);
  const style = isNew ? "border-success/30 bg-success/5/50 dark:bg-success/10"
    : changed ? "border-warning/30 bg-warning/5/50 dark:bg-warning/10" : "border-border";
  return <div className={`p-2 rounded-lg border text-xs ${style}`}><p className="font-medium truncate">{item.product_name}</p>
    <div className="flex justify-between mt-1 text-muted-foreground"><span>{item.quantity}x {formatCurrency(item.unit_price)}</span>
      <span className="font-medium text-foreground">{formatCurrency(item.subtotal || item.quantity * item.unit_price)}</span></div>
    {isNew && <Badge className="mt-1 bg-primary text-[10px] h-4">Novo</Badge>}
    {changed && <Badge className="mt-1 bg-warning text-[10px] h-4">Alterado</Badge>}</div>;
}

function ItemsComparison({ left, right }: { left: QuoteDetail; right: QuoteDetail }) {
  return <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Itens do Orçamento</CardTitle></CardHeader>
    <CardContent><div className="grid grid-cols-2 gap-4">{[left, right].map((detail) => {
      const other = detail === left ? right : left;
      return <div key={detail.id} className="space-y-2"><p className="text-xs font-medium text-muted-foreground mb-2">v{detail.version}</p>
        {detail.items.map((item) => <ComparedItem key={item.id} item={item} other={other} />)}
        {detail.items.length === 0 && <p className="text-xs text-muted-foreground italic">Nenhum item</p>}</div>;
    })}</div></CardContent></Card>;
}

export function QuoteVersionCompare({ open, onOpenChange, versions }: QuoteVersionCompareProps) {
  const comparison = useVersionComparison(versions);

  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            Comparar Versões do Orçamento
          </DialogTitle>
        </DialogHeader>

        <VersionSelectors versions={versions} leftId={comparison.leftId} rightId={comparison.rightId}
          setLeftId={comparison.setLeftId} setRightId={comparison.setRightId} />
        {comparison.loading && <div className="text-center py-8 text-muted-foreground">Carregando...</div>}
        {comparison.leftDetail && comparison.rightDetail && !comparison.loading && <div className="space-y-4">
          <ComparisonDetails left={comparison.leftDetail} right={comparison.rightDetail} />
        </div>}
      </DialogContent>
    </Dialog>;
}
