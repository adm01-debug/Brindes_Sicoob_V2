/**
 * QuoteRowQuickActions — botões inline na linha do orçamento.
 * Duplicar · Compartilhar link · WhatsApp · Marcar ganho.
 * Visíveis no hover da linha (desktop) ou sempre (mobile).
 */
import { useState, type MouseEvent as ReactMouseEvent } from "react";
import { Copy, Share2, MessageCircle, Trophy, ListChecks, FileStack } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Quote } from "@/hooks/useQuotes";
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

// ...buildWhatsappUrl omitted for brevity

export function QuoteRowQuickActions({ quote, onDuplicate, onMarkApproved, isSupervisor = false }: QuoteRowQuickActionsProps) {
  const [isDupDialogOpen, setIsDupDialogOpen] = useState(false);
  const [dupMode, setDupMode] = useState<'full' | 'partial'>('full');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
  const isClosed = quote.status === "approved" || quote.status === "converted" || quote.status === "rejected";

  const buildWhatsappUrl = (quote: Quote) => {
    const text = encodeURIComponent(
      `Olá! Segue a proposta comercial *#${quote.quote_number}* no valor de *${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total || 0)}*.\n\nVisualize os detalhes aqui: ${APP_BASE_URL}/orcamentos/${quote.id}`
    );
    const phone = quote.client_phone?.replace(/\D/g, "");
    return `https://wa.me/${phone ? (phone.startsWith("55") ? phone : "55" + phone) : ""}?text=${text}`;
  };

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

  const handleDuplicate = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!quote.id) return;
    setIsDupDialogOpen(true);
  };

  const confirmDuplicate = () => {
    if (!quote.id) return;
    onDuplicate(quote.id, dupMode === 'partial' ? selectedItems : undefined);
    setIsDupDialogOpen(false);
  };

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleApprove = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!quote.id) return;
    onMarkApproved(quote.id);
  };

  return (
    <div
      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
      onClick={(e) => e.stopPropagation()}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleDuplicate}
            aria-label="Duplicar orçamento"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Duplicar</TooltipContent>
      </Tooltip>

      <Dialog open={isDupDialogOpen} onOpenChange={setIsDupDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Duplicar Orçamento</DialogTitle>
            <DialogDescription>
              Escolha como deseja replicar as informações do orçamento #{quote.quote_number}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="flex gap-4">
              <Button 
                variant={dupMode === 'full' ? 'default' : 'outline'} 
                className={cn("flex-1 gap-2 h-24 flex-col transition-all", dupMode === 'full' && "ring-2 ring-primary ring-offset-2")}
                onClick={() => setDupMode('full')}
              >
                <FileStack className="h-6 w-6" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Inteiro</span>
                  <span className="text-[10px] opacity-70">Todos os itens</span>
                </div>
              </Button>
              <Button 
                variant={dupMode === 'partial' ? 'default' : 'outline'} 
                className={cn("flex-1 gap-2 h-24 flex-col transition-all", dupMode === 'partial' && "ring-2 ring-primary ring-offset-2")}
                onClick={() => setDupMode('partial')}
              >
                <ListChecks className="h-6 w-6" />
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Parcial</span>
                  <span className="text-[10px] opacity-70">Apenas selecionados</span>
                </div>
              </Button>
            </div>

            {dupMode === 'partial' && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Selecione os Itens ({selectedItems.length})</Label>
                {quote.items?.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-2.5 rounded-xl border hover:bg-muted/50 transition-all cursor-pointer" onClick={() => item.id && toggleItem(item.id)}>
                    <Checkbox 
                      id={`item-${item.id}`} 
                      checked={item.id ? selectedItems.includes(item.id) : false} 
                      onCheckedChange={() => item.id && toggleItem(item.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 text-sm truncate">
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">SKU: {item.product_sku}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-bold">{item.quantity} un</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setIsDupDialogOpen(false)} className="flex-1 sm:flex-none">Cancelar</Button>
            <Button onClick={confirmDuplicate} disabled={dupMode === 'partial' && selectedItems.length === 0} className="flex-1 sm:flex-none">
              Replicar Agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleCopyLink}
            aria-label="Copiar link do orçamento"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Copiar link</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-success"
            onClick={handleWhatsapp}
            aria-label="Enviar por WhatsApp"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Enviar por WhatsApp</TooltipContent>
      </Tooltip>

      {!isClosed && isSupervisor && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-success"
              onClick={handleApprove}
              aria-label="Marcar como ganho"
            >
              <Trophy className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Marcar como ganho</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
