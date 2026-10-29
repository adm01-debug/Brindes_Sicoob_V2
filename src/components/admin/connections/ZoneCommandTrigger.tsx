/**
 * ZoneCommandTrigger — botão pequeno no header que abre o ZoneCommandPalette local.
 */
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ZoneCommandTriggerProps {
  onOpen: () => void;
  className?: string;
}

export function ZoneCommandTrigger({ onOpen, className }: ZoneCommandTriggerProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
          aria-label="Buscar zona ou módulo"
          className={className}
        >
          <Search className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          <span className="text-xs">Buscar</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px]">
        <p className="text-xs">Buscar zona ou módulo</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Expande, mostra e leva direto ao módulo encontrado.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
