import type { ReactNode } from "react";
import { BarChart3, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface StatItem {
  id: string;
  label: string;
  value: number;
  icon: ReactNode;
}

interface StatsPopoverProps {
  stats: StatItem[];
  /** Whether filters/search are active — shows contextual indicator */
  isFiltered?: boolean;
}

function StatRow({ stat }: { stat: StatItem }) {
  return (
    <div key={stat.id} className="flex items-center justify-between py-1.5 group" role="listitem" aria-label={`${stat.label}: ${stat.value.toLocaleString("pt-BR")}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="text-primary transition-transform group-hover:scale-110">{stat.icon}</span>{stat.label}</div>
      <span className={cn("text-sm font-bold tabular-nums transition-colors", stat.value === 0 ? "text-muted-foreground/50" : "text-foreground")}>{stat.value.toLocaleString("pt-BR")}</span>
    </div>
  );
}

export function StatsPopover({ stats, isFiltered = false }: StatsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5 h-8 transition-all",
            isFiltered ? "border-sicoob-green/50 bg-sicoob-green/5 text-sicoob-green-dark" : "hover:border-sicoob-green/40"
          )}
          aria-label="Resumo de estatísticas do catálogo"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Analytics Sicoob</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 p-3"
        sideOffset={8}
        role="status"
        aria-label="Estatísticas do catálogo"
      >
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Estatísticas</p>
            {isFiltered && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 border-primary/30 text-primary">
                <Filter className="h-2.5 w-2.5" />
                Filtrado
              </Badge>
            )}
          </div>

          {stats.map((stat) => <StatRow key={stat.id} stat={stat} />)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
