import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Archive, Download, FileArchive } from "lucide-react";

import { useQuotes } from "@/hooks/quotes/useQuotes";
import { useAuth } from "@/contexts/AuthContext";
import { exportQuotesAsZip } from "@/utils/quoteExportUtils";
import { toast } from "sonner";
import { useState } from "react";

interface QuoteBulkActionsToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

function useBulkQuoteActions({ selectedIds, onClearSelection, onActionComplete }: QuoteBulkActionsToolbarProps) {
  const { user } = useAuth();
  const { bulkUpdateStatus } = useQuotes();
  const [isExporting, setIsExporting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const expire = async () => {
    setIsUpdating(true);
    const ok = await bulkUpdateStatus(selectedIds, "expired");
    if (ok) { onClearSelection(); onActionComplete(); }
    setIsUpdating(false);
  };
  const exportZip = async () => {
    if (!user) return;
    setIsExporting(true);
    try { await exportQuotesAsZip(selectedIds, user.id); toast.success("Exportação ZIP iniciada!"); }
    catch (error: unknown) { toast.error(error instanceof Error ? error.message : "Erro na exportação"); }
    finally { setIsExporting(false); }
  };
  return { expire, exportZip, isExporting, isUpdating };
}

function BulkButtons({ onExpire, onExport, isUpdating, isExporting }: {
  onExpire: () => void; onExport: () => void; isUpdating: boolean; isExporting: boolean;
}) {
  return <div className="flex items-center gap-2"><Button variant="ghost" size="sm" className="text-background hover:bg-background/10 gap-2"
    onClick={onExpire} disabled={isUpdating}><Archive className="h-4 w-4" />Expirar</Button>
    <Button variant="ghost" size="sm" className="text-background hover:bg-background/10 gap-2" onClick={onExport} disabled={isExporting}>
      {isExporting ? <FileArchive className="h-4 w-4 animate-bounce" /> : <Download className="h-4 w-4" />}Exportar ZIP</Button>
  </div>;
}

export function QuoteBulkActionsToolbar({
  selectedIds,
  onClearSelection,
  onActionComplete
}: QuoteBulkActionsToolbarProps) {
  const { expire: handleBulkExpire, exportZip: handleBulkExport, isExporting, isUpdating } =
    useBulkQuoteActions({ selectedIds, onClearSelection, onActionComplete });

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-foreground text-background rounded-full px-6 py-3 shadow-2xl flex items-center gap-6 border border-background/10">
        <div className="flex items-center gap-3 pr-6 border-r border-background/20">
          <Badge variant="secondary" className="bg-primary text-primary-foreground font-bold tabular-nums">
            {selectedIds.length}
          </Badge>
          <span className="text-sm font-medium">Selecionados</span>
        </div>

        <BulkButtons onExpire={handleBulkExpire} onExport={handleBulkExport} isUpdating={isUpdating} isExporting={isExporting} />

        <Button 
          variant="ghost" 
          size="icon" 
          className="text-background/50 hover:text-background rounded-full"
          onClick={onClearSelection}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
