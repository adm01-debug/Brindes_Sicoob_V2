import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WeeklyActivityRow {
  week_start: string;
  item_count: number;
}

interface WeeklyActivityHeatmapProps {
  data: WeeklyActivityRow[];
  ariaLabel: string;
  totalLabel: string;
}

export function WeeklyActivityHeatmap({ data, ariaLabel, totalLabel }: WeeklyActivityHeatmapProps) {
  if (data.length === 0) return null;
  const total = data.reduce((sum, item) => sum + item.item_count, 0);
  if (total === 0) return null;
  const max = Math.max(...data.map((item) => item.item_count), 1);
  const peak = data.reduce((current, item) => item.item_count > current.item_count ? item : current);
  const peakIndex = data.indexOf(peak);
  const peakMonth = new Date(peak.week_start).toLocaleDateString("pt-BR", { month: "long" });
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card/50">
      <div className="flex items-end gap-0.5 h-8" aria-label={ariaLabel}>
        {data.map((item, index) => <div key={item.week_start}
          className={cn("w-1.5 rounded-sm transition-all", index === peakIndex && item.item_count > 0
            ? "bg-primary" : item.item_count > 0 ? "bg-primary/40" : "bg-muted")}
          style={{ height: `${Math.max(2, (item.item_count / max) * 28)}px` }}
          title={`Semana de ${new Date(item.week_start).toLocaleDateString("pt-BR")}: ${item.item_count} ${item.item_count === 1 ? "item" : "itens"}`} />)}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-foreground flex items-center gap-1">
          <TrendingUp className="h-3 w-3 text-primary" /> {total} {totalLabel} em 8 semanas
        </span>
        <span className="text-[10px] text-muted-foreground">
          Pico em {peakMonth} ({peak.item_count} {peak.item_count === 1 ? "item" : "itens"})
        </span>
      </div>
    </div>
  );
}
