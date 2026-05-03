import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageSquare, ChevronDown } from "lucide-react";
import { useState } from "react";

const QUICK_REPLIES = [
  "Aprovado conforme solicitado.",
  "Solicito revisão nas quantidades.",
  "Aguardando confirmação de estoque.",
  "Frete precisa ser renegociado.",
  "Item X indisponível, favor substituir.",
  "Aprovado parcialmente."
];

interface QuickReplySelectorProps {
  onSelect: (reply: string) => void;
}

export function QuickReplySelector({ onSelect }: QuickReplySelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-8 text-xs">
          <MessageSquare className="h-3.5 w-3.5" />
          Respostas Rápidas
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[240px]" align="start">
        <Command>
          <CommandList>
            <CommandGroup heading="Sugestões">
              {QUICK_REPLIES.map((reply) => (
                <CommandItem
                  key={reply}
                  onSelect={() => {
                    onSelect(reply);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  {reply}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
