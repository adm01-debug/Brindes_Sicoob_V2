import React from "react";
import { Settings2, LayoutGrid, List, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ColumnSelector, type ColumnCount } from "@/components/products/ColumnSelector";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const viewModes = [
  { value: "grid" as const, label: "Grid", icon: LayoutGrid },
  { value: "list" as const, label: "Lista", icon: List },
  { value: "table" as const, label: "Tabela", icon: Table2 },
];

interface LayoutPopoverProps {
  viewMode: "grid" | "list" | "table";
  setViewMode: (mode: "grid" | "list" | "table") => void;
  gridColumns: ColumnCount;
  setGridColumns: (cols: ColumnCount) => void;
}

function ViewModeSelector({ viewMode, setViewMode }: Pick<LayoutPopoverProps, 'viewMode' | 'setViewMode'>) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">Visualização</p>
      <div className="relative flex items-center gap-0.5 p-1 rounded-xl bg-muted/60 border border-border/40">
        {viewModes.map((mode) => {
          const ModeIcon = mode.icon; const active = viewMode === mode.value;
          return <button key={mode.value} className={cn("relative flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-xs font-medium transition-colors duration-150 z-10", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")} onClick={() => setViewMode(mode.value)}>{active && <motion.div layoutId="viewmode-pill" className="absolute inset-0 rounded-lg bg-primary shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}<span className="relative z-10 flex items-center gap-1.5"><ModeIcon className="h-3.5 w-3.5" />{mode.label}</span></button>;
        })}
      </div>
    </div>
  );
}

export const LayoutPopover = React.forwardRef<HTMLDivElement, LayoutPopoverProps>(
  function LayoutPopover({ viewMode, setViewMode, gridColumns, setGridColumns }, ref) {
    return (
      <div ref={ref}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Settings2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline text-xs">Layout</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 p-4" sideOffset={8}>
            <div className="space-y-4">
              <ViewModeSelector viewMode={viewMode} setViewMode={setViewMode} />

              {/* Column Selector - only in grid mode */}
              {viewMode === "grid" && (
                <>
                  <Separator className="opacity-50" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                      Colunas
                    </p>
                    <ColumnSelector value={gridColumns} onChange={setGridColumns} />
                  </div>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
);
