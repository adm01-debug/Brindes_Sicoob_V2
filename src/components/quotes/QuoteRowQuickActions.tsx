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
}

const APP_BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function buildShareUrl(quote: Quote) {
  return `${APP_BASE_URL}/orcamentos/${quote.id}`;
}

// ...buildWhatsappUrl omitted for brevity

export function QuoteRowQuickActions({ quote, onDuplicate, onMarkApproved }: QuoteRowQuickActionsProps) {
  const [isDupDialogOpen, setIsDupDialogOpen] = useState(false);
  const [dupMode, setDupMode] = useState<'full' | 'partial'>('full');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  
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

  const handleDuplicate = (e: ReactMouseEvent) => {
    e.stopPropagation();
    if (!quote.id) return;
    onDuplicate(quote.id);
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

      {!isClosed && (
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
