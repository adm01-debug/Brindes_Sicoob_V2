import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, X, Download, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface BulkAction {
  id: string;
  label: string;
  icon: ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick: (ids: string[]) => void;
  disabled?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  entityLabel?: string;
  actions: BulkAction[];
  onClear: () => void;
  /** Show "select all across pages" banner */
  showSelectAllBanner?: boolean;
  totalCount?: number;
  onSelectAll?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  entityLabel = "item",
  actions,
  onClear,
  showSelectAllBanner,
  totalCount,
  onSelectAll,
}: BulkActionsBarProps) {
  const pluralLabel = selectedCount === 1 ? entityLabel : `${entityLabel}s`;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-1"
        >
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg flex-wrap">
            <span className="text-sm font-medium text-foreground">
              {selectedCount} {pluralLabel} selecionado{selectedCount !== 1 ? "s" : ""}
            </span>

            {actions.map((action) => (
              <Button
                key={action.id}
                variant={action.variant || "secondary"}
                size="sm"
                className="text-xs gap-1.5"
                disabled={action.disabled}
                onClick={() => action.onClick([...selectedIds])}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}

            <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={onClear}>
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          </div>

          {showSelectAllBanner && totalCount && onSelectAll && (
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground">
              <span>
                Todos desta página estão selecionados.
              </span>
              <Button
                variant="link"
                size="sm"
                className="text-xs text-primary p-0 h-auto"
                onClick={onSelectAll}
              >
                Selecionar todos os {totalCount}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
