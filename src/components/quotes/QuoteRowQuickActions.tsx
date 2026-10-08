/**
 * QuoteRowQuickActions — botões inline na linha do orçamento.
 * Duplicar · Compartilhar link · WhatsApp · Marcar ganho.
 * Visíveis no hover da linha (desktop) ou sempre (mobile).
 */
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { Copy, Share2, MessageCircle, Trophy, ListChecks, FileStack, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Quote } from "@/hooks/quotes/useQuotes";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface QuoteRowQuickActionsProps {
  quote: Quote;
  onDuplicate: (id: string, itemIds?: string[]) => void;
  onMarkApproved: (id: string) => void;
  isSupervisor?: boolean;
}

const APP_BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function buildShareUrl(quote: Quote) {
  return `${APP_BASE_URL}/orcamentos/${quote.id}`;
}

function buildWhatsappUrl(quote: Quote) {
  const amount = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total || 0);
  const text = encodeURIComponent(`Olá! Segue a proposta comercial *#${quote.quote_number}* no valor de *${amount}*.\n\nVisualize os detalhes aqui: ${buildShareUrl(quote)}`);
  const phone = quote.client_phone?.replace(/\D/g, "");
  const countryPhone = phone && !phone.startsWith("55") ? `55${phone}` : phone || "";
  return `https://wa.me/${countryPhone}?text=${text}`;
}

function QuickAction({ icon, label, onClick, success = false }: {
  icon: LucideIcon; label: string; onClick: (event: ReactMouseEvent) => void; success?: boolean;
}) {
  const ActionIcon = icon;
  return <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon"
    className={cn("h-7 w-7 text-muted-foreground", success ? "hover:text-success" : "hover:text-foreground")}
    onClick={onClick} aria-label={label}><ActionIcon className="h-3.5 w-3.5" /></Button></TooltipTrigger>
    <TooltipContent side="top">{label}</TooltipContent></Tooltip>;
}

function DuplicateDialog({ quote, open, setOpen, mode, setMode, selectedItems, toggleItem, onConfirm }: {
  quote: Quote; open: boolean; setOpen: (open: boolean) => void; mode: 'full' | 'partial';
  setMode: (mode: 'full' | 'partial') => void; selectedItems: string[]; toggleItem: (id: string) => void; onConfirm: () => void;
}) {
  return <Dialog open={open} onOpenChange={setOpen}><DialogContent onClick={(event) => event.stopPropagation()} className="sm:max-w-[450px]">
    <DialogHeader><DialogTitle>Duplicar Orçamento</DialogTitle><DialogDescription>
      Escolha como deseja replicar as informações do orçamento #{quote.quote_number}.</DialogDescription></DialogHeader>
    <div className="grid gap-6 py-4"><div className="flex gap-4">
      <Button variant={mode === 'full' ? 'default' : 'outline'} className={cn('flex-1 gap-2 h-24 flex-col transition-all', mode === 'full' && 'ring-2 ring-primary ring-offset-2')}
        onClick={() => setMode('full')}><FileStack className="h-6 w-6" /><div className="flex flex-col gap-0.5"><span className="font-bold">Inteiro</span><span className="text-[10px] opacity-70">Todos os itens</span></div></Button>
      <Button variant={mode === 'partial' ? 'default' : 'outline'} className={cn('flex-1 gap-2 h-24 flex-col transition-all', mode === 'partial' && 'ring-2 ring-primary ring-offset-2')}
        onClick={() => setMode('partial')}><ListChecks className="h-6 w-6" /><div className="flex flex-col gap-0.5"><span className="font-bold">Parcial</span><span className="text-[10px] opacity-70">Apenas selecionados</span></div></Button>
    </div>{mode === 'partial' && <div className="space-y-3 max-h-60 overflow-y-auto pr-2 animate-in fade-in slide-in-from-top-2 duration-300">
      <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Selecione os Itens ({selectedItems.length})</Label>
      {quote.items?.map((item) => <div key={item.id} className="flex items-center space-x-3 p-2.5 rounded-xl border hover:bg-muted/50 transition-all cursor-pointer"
        onClick={() => { if (item.id) toggleItem(item.id); }}><Checkbox id={`item-${item.id}`} checked={item.id ? selectedItems.includes(item.id) : false}
          onCheckedChange={() => { if (item.id) toggleItem(item.id); }} onClick={(event) => event.stopPropagation()} />
        <div className="flex-1 text-sm truncate"><p className="font-semibold">{item.product_name}</p><p className="text-[10px] text-muted-foreground font-mono">SKU: {item.product_sku}</p></div>
        <Badge variant="secondary" className="text-[10px] font-bold">{item.quantity} un</Badge></div>)}
    </div>}</div>
    <DialogFooter className="gap-2 sm:gap-0"><Button variant="ghost" onClick={() => setOpen(false)} className="flex-1 sm:flex-none">Cancelar</Button>
      <Button onClick={onConfirm} disabled={mode === 'partial' && selectedItems.length === 0} className="flex-1 sm:flex-none">Replicar Agora</Button>
    </DialogFooter>
  </DialogContent></Dialog>;
}

function useDuplicateDialog(quote: Quote, onDuplicate: QuoteRowQuickActionsProps["onDuplicate"]) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'full' | 'partial'>('full');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const show = (event: ReactMouseEvent) => {
    event.stopPropagation();
    if (quote.id) setOpen(true);
  };
  const confirm = () => {
    if (!quote.id) return;
    onDuplicate(quote.id, mode === 'partial' ? selectedItems : undefined);
    setOpen(false);
  };
  const toggleItem = (id: string) => setSelectedItems((previous) =>
    previous.includes(id) ? previous.filter((itemId) => itemId !== id) : [...previous, id]);
  return { open, setOpen, mode, setMode, selectedItems, toggleItem, show, confirm };
}

export function QuoteRowQuickActions({ quote, onDuplicate, onMarkApproved, isSupervisor = false }: QuoteRowQuickActionsProps) {
  const duplicate = useDuplicateDialog(quote, onDuplicate);
  const isClosed = quote.status === "approved" || quote.status === "converted" || quote.status === "rejected";
  const handleCopyLink = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(buildShareUrl(quote));
      toast.success("Link copiado", { description: "Cole onde precisar." });
    } catch {
      toast.error("Falha ao copiar link");
    }
  };

  const handleWhatsapp = (e: ReactMouseEvent) => {
    e.stopPropagation();
    window.open(buildWhatsappUrl(quote), "_blank", "noopener,noreferrer");
  };

  const handleApprove = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!quote.id) return;
    onMarkApproved(quote.id);
  };

  return <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
    onClick={(event) => event.stopPropagation()}>
    <QuickAction icon={Copy} label="Duplicar" onClick={duplicate.show} />
    <DuplicateDialog quote={quote} open={duplicate.open} setOpen={duplicate.setOpen} mode={duplicate.mode}
      setMode={duplicate.setMode} selectedItems={duplicate.selectedItems} toggleItem={duplicate.toggleItem} onConfirm={duplicate.confirm} />
    <QuickAction icon={Share2} label="Copiar link" onClick={handleCopyLink} />
    <QuickAction icon={MessageCircle} label="Enviar por WhatsApp" onClick={handleWhatsapp} success />
    {!isClosed && isSupervisor && <QuickAction icon={Trophy} label="Marcar como ganho" onClick={handleApprove} success />}
  </div>;
}
