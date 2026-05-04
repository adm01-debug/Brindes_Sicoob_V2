import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const QUICK_REPLIES = [
  "Favor revisar a quantidade de itens.",
  "Valor unitário acima do esperado para esta categoria.",
  "PA sem verba suficiente para este pedido este mês.",
  "Brinde em desacordo com as diretrizes de marca.",
  "Aprovado. Favor prosseguir com o faturamento.",
  "Favor solicitar nova cotação com outro fornecedor.",
  "Urgente: favor priorizar a entrega deste item."
];

interface Props {
  onSelect: (reply: string) => void;
  className?: string;
}

export function QuickReplySelector({ onSelect, className }: Props) {
  return (
    <div className={className}>
      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 px-1">Respostas Rápidas</p>
      <ScrollArea className="h-32">
        <div className="flex flex-wrap gap-1.5 p-1">
          {QUICK_REPLIES.map((reply, idx) => (
            <Button 
              key={idx} 
              variant="outline" 
              size="sm" 
              className="h-7 text-[10px] px-2 py-0"
              onClick={() => onSelect(reply)}
            >
              {reply}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
