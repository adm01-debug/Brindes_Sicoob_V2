/**
 * QuoteBuilderSummaryColumn — Coluna 3: Resumo com cards de itens, desconto e CTAs
 */

import { Fragment, useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { AlertTriangle, Edit, Loader2, Package, Save, ShoppingCart, Trash2, CheckCircle2, X, Layers, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import type { QuoteItem } from "@/hooks/quotes/useQuotes";
import { NegotiationMarkupCard } from "@/components/quote/NegotiationMarkupCard";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { getPriceFreshness } from "@/utils/price-freshness";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";
import { toast } from "sonner";
import { QuoteSummary } from "@/components/quotes/QuoteSummary";

interface Props {
  readOnly?: boolean;
  items: QuoteItem[];
  activeItemIndex: number | null;
  setActiveItemIndex: (i: number | null) => void;
  removeItem: (i: number) => void;
  discountType: "percent" | "amount";
  setDiscountType: (v: "percent" | "amount") => void;
  discountValue: number;
  setDiscountValue: (v: number) => void;
  discountAmount: number;
  total: number;
  isFormValid: boolean;
  isDraftValid: boolean;
  validationErrors: string[];
  quotesLoading: boolean;
  isEditMode: boolean;
  formatCurrency: (v: number) => string;
  calculateItemPersonalizationTotal: (item: QuoteItem) => number;
  calculateItemTotal: (item: QuoteItem) => number;
  onSave: (status: "draft" | "pending" | "pending_approval", sellerNotes?: string) => void;
  maxDiscountPercent?: number | null;
  isDiscountExceeded?: boolean;
  negotiationMarkup?: number;
  setNegotiationMarkup?: (v: number) => void;
  realSubtotal?: number;
  realDiscountPercent?: number;
  profit?: number;
  marginPercent?: number;
  /** Marca um item como "preço confirmado com fornecedor" — suprime alerta stale. */
  confirmItemPrice?: (index: number) => void;
  /** Marca todos os itens com preço aging/stale como confirmados. */
  confirmAllStalePrices?: () => void;
  selectedIndexes?: Set<number>;
  onToggleSelection?: (index: number) => void;
  onGroupItems?: (indexes: number[], kitName: string) => void;
  onUngroup?: (groupId: string) => void;
  onClearSelection?: () => void;
}

function priceCountLabel(count: number) {
  return `${count} ${count === 1 ? "preço" : "preços"}`;
}

function useSummaryModel(props: Props) {
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [onlyStale, setOnlyStale] = useState(false);
  const stale = useMemo(() => {
    const result = new Set<number>();
    props.items.forEach((item, index) => {
      if (!item.price_confirmed_at && getPriceFreshness(item.price_updated_at, item.price_freshness_threshold_days).shouldWarn) result.add(index);
    });
    return result;
  }, [props.items]);
  useEffect(() => { if (onlyStale && stale.size === 0) setOnlyStale(false); }, [onlyStale, stale]);
  const visible = useMemo(() => props.items.map((item, index) => ({ item, index }))
    .filter(({ index }) => !onlyStale || stale.has(index)), [props.items, onlyStale, stale]);
  useEffect(() => {
    if (!props.readOnly) return;
    setApprovalOpen(false);
    setConfirmOpen(false);
  }, [props.readOnly]);
  const remove = (index: number) => {
    if (props.readOnly) return;
    props.removeItem(index);
    if (props.activeItemIndex === index) props.setActiveItemIndex(null);
    else if (props.activeItemIndex !== null && props.activeItemIndex > index) props.setActiveItemIndex(props.activeItemIndex - 1);
  };
  const requestApproval = () => {
    if (props.readOnly) return;
    props.onSave("pending_approval", notes); setApprovalOpen(false); setNotes("");
  };
  const confirmAll = () => {
    if (props.readOnly) return;
    props.confirmAllStalePrices?.(); setConfirmOpen(false); setOnlyStale(false);
    toast.success(`${priceCountLabel(stale.size)} confirmado${stale.size === 1 ? "" : "s"} com fornecedor`);
  };
  return { props, approvalOpen, setApprovalOpen, notes, setNotes, confirmOpen, setConfirmOpen,
    onlyStale, setOnlyStale, stale, visible, remove, requestApproval, confirmAll };
}
type SummaryModel = ReturnType<typeof useSummaryModel>;

function SummaryImage({ item }: { item: QuoteItem }) {
  if (item.product_image_url) return <img src={item.product_image_url} alt={item.product_name}
    className="w-12 h-12 object-cover rounded-lg bg-muted" loading="lazy" />;
  return <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
    <Package className="h-5 w-5 text-muted-foreground" /></div>;
}

function SummaryGroup({ model, item, index }: { model: SummaryModel; item: QuoteItem; index: number }) {
  const previous = index > 0 ? model.props.items[index - 1] : undefined;
  if (!item.kit_group_id || previous?.kit_group_id === item.kit_group_id) return null;
  const groupId = item.kit_group_id;
  return <div className="flex items-center justify-between px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-2 mt-1">
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 uppercase"><Layers className="h-3 w-3" /> Kit: {item.kit_name}</span>
    <Button disabled={model.props.readOnly} variant="ghost" size="sm" className="h-5 text-[9px] text-emerald-700" onClick={() => model.props.onUngroup?.(groupId)}>Desfazer</Button>
  </div>;
}

function SummaryStock({ item, format }: { item: QuoteItem; format: (value: number) => string }) {
  const insufficient = item.stock_available !== null && item.stock_available !== undefined && item.stock_available < item.quantity;
  return <div><div className="flex items-center gap-2 text-xs"><span className="text-muted-foreground">Qtd:</span>
    <span className={cn("font-medium", insufficient && "text-destructive font-bold")}>{item.quantity}</span><span>×</span>
    <span>{format(item.unit_price)}</span><strong className="ml-auto">{format(item.quantity * item.unit_price)}</strong></div>
    {insufficient && <div className="flex items-center gap-1 text-[10px] text-destructive font-semibold">
      <AlertTriangle className="h-3 w-3" /> Estoque insuficiente (Disponível: {item.stock_available})</div>}</div>;
}

function SummaryFreshness({ model, item, index }: { model: SummaryModel; item: QuoteItem; index: number }) {
  if (!item.price_updated_at && !item.price_confirmed_at) return null;
  const confirm = !model.props.readOnly && model.props.confirmItemPrice ? () => {
    model.props.confirmItemPrice?.(index);
    toast.success("Preço confirmado com fornecedor", { description: item.product_name });
  } : undefined;
  return <div onClick={(event) => event.stopPropagation()}><PriceFreshnessBadge priceUpdatedAt={item.price_updated_at}
    thresholdDays={item.price_freshness_threshold_days} confirmedAt={item.price_confirmed_at} variant="inline" onConfirm={confirm} /></div>;
}

function SummaryPersonalizations({ model, item }: { model: SummaryModel; item: QuoteItem }) {
  if (!item.personalizations?.length) return null;
  return <div className="px-3 pb-3"><div className="flex justify-between text-[10px] uppercase text-muted-foreground">
    <span>Gravações ({item.personalizations.length})</span><strong>{model.props.formatCurrency(model.props.calculateItemPersonalizationTotal(item))}</strong>
  </div>{item.personalizations.map((personalization, index) => <div key={index}
    className="flex items-center justify-between px-2 py-1 mt-1 rounded-lg border text-xs">
    <span className="truncate">{index + 1}. {personalization.technique_name}</span>
    <strong>{model.props.formatCurrency(personalization.total_cost || 0)}</strong></div>)}</div>;
}

function SummaryItemCard({ model, item, index }: { model: SummaryModel; item: QuoteItem; index: number }) {
  const active = model.props.activeItemIndex === index;
  const selected = model.props.selectedIndexes?.has(index) ?? false;
  return <Fragment><SummaryGroup model={model} item={item} index={index} /><div
    className={cn("rounded-xl border relative", active ? "border-primary/50 bg-primary/5 ring-1" : "bg-muted/30",
      model.stale.has(index) && "border-warning/40", selected && "ring-2 ring-primary/40")}>
    {model.props.onToggleSelection && <div className="absolute top-2 left-2 z-10"><Checkbox disabled={model.props.readOnly} checked={selected}
      onClick={(event) => event.stopPropagation()}
      onCheckedChange={() => { if (!model.props.readOnly) model.props.onToggleSelection?.(index); }} /></div>}
    <div className={cn("p-3 space-y-2", model.props.onToggleSelection && "pl-8")}><div className="flex items-start gap-3">
      <SummaryImage item={item} /><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{item.product_name}</p>
        <Badge variant="secondary" className="text-[10px] font-mono">{item.product_sku}</Badge>
        {item.color_name && <span className="ml-2 text-[10px] text-muted-foreground">{item.color_name}</span>}</div>
      <Button disabled={model.props.readOnly} variant="ghost" size="icon" aria-label="Editar" className="h-6 w-6"
        onClick={() => model.props.setActiveItemIndex(index)}><Edit className="h-3.5 w-3.5" /></Button>
      <Button disabled={model.props.readOnly} variant="ghost" size="icon" aria-label="Excluir" className="h-6 w-6 text-destructive" onClick={(event) => {
        event.stopPropagation(); model.remove(index);
      }}><Trash2 className="h-3.5 w-3.5" /></Button></div>
      <SummaryStock item={item} format={model.props.formatCurrency} /><SummaryFreshness model={model} item={item} index={index} />
    </div><SummaryPersonalizations model={model} item={item} /></div></Fragment>;
}

function StaleBar({ model }: { model: SummaryModel }) {
  if (model.stale.size === 0) return null;
  return <div className="px-4 pb-3 flex gap-2"><Button disabled={model.props.readOnly} size="sm" variant="outline"
    aria-label={`${model.stale.size} preço a confirmar`} aria-pressed={model.onlyStale}
    onClick={() => model.setOnlyStale((value) => !value)}>
    <AlertTriangle className="h-3.5 w-3.5 mr-1" />Preços a confirmar <Badge className="ml-1">{model.stale.size}</Badge></Button>
    {model.props.confirmAllStalePrices && <Button disabled={model.props.readOnly} size="sm" variant="outline" onClick={() => model.setConfirmOpen(true)}>
      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />Confirmar todos</Button>}</div>;
}

function SelectionBar({ model }: { model: SummaryModel }) {
  const selected = model.props.selectedIndexes ?? new Set<number>();
  return <AnimatePresence>{selected.size > 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="px-4 pb-3"><div className="flex items-center justify-between p-2.5 bg-primary text-primary-foreground rounded-xl">
    <span className="text-xs font-bold">{selected.size} selecionados</span><div><Button disabled={model.props.readOnly} size="sm" variant="ghost" className="text-white" onClick={() => {
      const name = prompt("Nome do Kit:"); if (name) model.props.onGroupItems?.(Array.from(selected), name);
    }}><Layers className="h-3.5 w-3.5 mr-1" />Criar Kit</Button><Button disabled={model.props.readOnly} size="icon" variant="ghost" onClick={model.props.onClearSelection}>
      <X className="h-3.5 w-3.5" /></Button></div></div></motion.div>}</AnimatePresence>;
}

function SummaryItems({ model }: { model: SummaryModel }) {
  if (!model.props.items.length) return <div className="px-4 pb-4 text-center text-xs text-muted-foreground">Nenhum item adicionado</div>;
  if (!model.visible.length) return <div className="px-4 pb-4 text-center text-xs text-warning">
    Todos os preços estão confirmados. <button disabled={model.props.readOnly} className="underline" onClick={() => model.setOnlyStale(false)}>Mostrar todos</button></div>;
  return <div className="px-4 overflow-y-auto max-h-[50vh]"><div className="space-y-3">
    {model.visible.map(({ item, index }) => <SummaryItemCard key={index} model={model} item={item} index={index} />)}</div></div>;
}

function apparentDiscount(props: Props) {
  if (props.discountType === "percent") return props.discountValue;
  const base = props.realSubtotal || 0;
  if (base <= 0) return 0;
  return (props.discountValue / (base * (1 + (props.negotiationMarkup || 0) / 100))) * 100;
}

function DiscountHints({ props }: { props: Props }) {
  return <>{props.maxDiscountPercent !== null && props.maxDiscountPercent !== undefined && <p className="text-xs text-muted-foreground">
    Seu limite: <strong>{props.maxDiscountPercent}%</strong></p>}
    {props.isDiscountExceeded && <p className="text-xs text-amber-600"><AlertTriangle className="inline h-3 w-3 mr-1" />Desconto acima do autorizado</p>}
    {props.marginPercent !== null && props.marginPercent !== undefined && props.marginPercent > 0 && props.marginPercent < 20 && <p className="text-[11px] text-primary">
      <Sparkles className="inline h-3 w-3 mr-1" />Margem atual: {props.marginPercent.toFixed(1)}%</p>}</>;
}

function NegotiationMarkup({ props }: { props: Props }) {
  if (!props.setNegotiationMarkup) return null;
  return <div className="px-4 pt-3"><NegotiationMarkupCard disabled={props.readOnly} value={props.negotiationMarkup || 0}
    onChange={props.setNegotiationMarkup} realSubtotal={props.realSubtotal || 0} apparentDiscountPercent={apparentDiscount(props)}
    realDiscountPercent={props.realDiscountPercent || 0} maxDiscountPercent={props.maxDiscountPercent ?? null} /></div>;
}

function SummaryDiscount({ model }: { model: SummaryModel }) {
  const p = model.props;
  if (!p.items.length) return null;
  return <><div className="px-4 pt-3 space-y-2"><DiscountHints props={p} /><div className="flex gap-2">
    <Select disabled={p.readOnly} value={p.discountType} onValueChange={(value) => p.setDiscountType(value as "percent" | "amount")}>
      <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percent">%</SelectItem>
        <SelectItem value="amount">R$</SelectItem></SelectContent></Select>
    <Input disabled={p.readOnly} type="number" min={0} value={p.discountValue || ""} onChange={(event) => p.setDiscountValue(Number.parseFloat(event.target.value) || 0)} className="h-8" /></div>
    </div><NegotiationMarkup props={p} /></>;
}

function primaryAction(props: Props, manager: boolean, requestApproval: () => void) {
  if (props.isDiscountExceeded) return { click: requestApproval, label: "Solicitar Aprovação" };
  if (manager) return { click: () => props.onSave("pending"), label: "Enviar p/ Aprovação Singular" };
  return { click: () => props.onSave("pending"), label: props.isEditMode ? "Salvar" : "Criar" };
}

function SummaryActions({ model, manager }: { model: SummaryModel; manager: boolean }) {
  const p = model.props;
  const primary = primaryAction(p, manager, () => model.setApprovalOpen(true));
  return <div className="p-4 mt-3 border-t space-y-3"><QuoteSummary subtotal={(p.realSubtotal || 0) || p.total + p.discountAmount}
    discountValue={p.discountValue} discountType={p.discountType} shippingCost={0} total={p.total}
    profit={p.profit} marginPercent={p.marginPercent} isInternal className="border-none bg-transparent shadow-none p-0" />
    {!p.isFormValid && <p className="text-xs text-destructive">Campos pendentes: {p.validationErrors.join(", ")}</p>}
    <Button size="lg" className="w-full" onClick={primary.click} disabled={p.readOnly || p.quotesLoading || !p.isFormValid}>
      {p.quotesLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{primary.label}</Button>
    <Button variant="outline" className="w-full" onClick={() => p.onSave("draft")} disabled={p.readOnly || p.quotesLoading || !p.isDraftValid}>
      <Save className="h-4 w-4 mr-2" />{p.isEditMode ? "Salvar Alterações" : "Salvar Rascunho"}</Button></div>;
}

function SummaryModals({ model }: { model: SummaryModel }) {
  const count = model.stale.size;
  return <><Dialog open={!model.props.readOnly && model.approvalOpen} onOpenChange={model.setApprovalOpen}><DialogContent><DialogHeader>
    <DialogTitle>Solicitar Aprovação de Desconto</DialogTitle><DialogDescription>O desconto excede o limite autorizado.</DialogDescription>
  </DialogHeader><Label>Justificativa</Label><Textarea disabled={model.props.readOnly} value={model.notes} onChange={(event) => model.setNotes(event.target.value)} />
    <DialogFooter><Button disabled={model.props.readOnly} variant="outline" onClick={() => model.setApprovalOpen(false)}>Cancelar</Button>
      <Button disabled={model.props.readOnly} onClick={model.requestApproval}>Enviar para Aprovação</Button></DialogFooter></DialogContent></Dialog>
    <ConfirmDialog open={!model.props.readOnly && model.confirmOpen} onOpenChange={model.setConfirmOpen} variant="warning"
      title="Confirmar preços com o fornecedor?" description={`Você validou ${priceCountLabel(count)} com o fornecedor?`}
      confirmLabel={`Confirmar ${priceCountLabel(count)}`} cancelLabel="Cancelar" onConfirm={model.confirmAll} /></>;
}

export function QuoteBuilderSummaryColumn(props: Props) {
  const { isGerentePa } = useAuth();
  const model = useSummaryModel(props);
  return <div className={cn("lg:col-span-4", props.readOnly && "grayscale-[0.3] opacity-80")} aria-disabled={props.readOnly || undefined}><div className="sticky top-24"><div
    className="flex flex-col rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
    <div className="flex items-center gap-2 p-4 pb-3"><ShoppingCart className="h-4 w-4 text-primary" />
      <h3 className="font-display font-semibold text-base">Resumo</h3></div>
    <StaleBar model={model} /><SelectionBar model={model} /><SummaryItems model={model} />
    <SummaryDiscount model={model} /><SummaryActions model={model} manager={isGerentePa} />
  </div></div><SummaryModals model={model} /></div>;
}
