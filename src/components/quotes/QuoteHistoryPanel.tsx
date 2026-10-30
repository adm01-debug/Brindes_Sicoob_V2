import { type ReactNode, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, Plus, Edit2, RefreshCw, Trash2, CheckCircle, XCircle, Clock, Package, FileText, AlertTriangle, Zap, Monitor, Globe, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuoteHistory, type QuoteHistoryEntry } from "@/hooks/useQuoteHistory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Json } from "@/integrations/supabase/types";

interface QuoteHistoryPanelProps {
  quoteId: string;
}

const actionIcons: Record<string, ReactNode> = {
  created: <Plus className="h-4 w-4" />,
  updated: <Edit2 className="h-4 w-4" />,
  status_changed: <RefreshCw className="h-4 w-4" />,
  item_added: <Package className="h-4 w-4" />,
  item_removed: <Trash2 className="h-4 w-4" />,
  item_updated: <Edit2 className="h-4 w-4" />,
  // Sync events
  sync_started: <Zap className="h-4 w-4" />,
  sync_pdf_ok: <FileText className="h-4 w-4" />,
  sync_pdf_error: <AlertTriangle className="h-4 w-4" />,
  sync_success: <CheckCircle className="h-4 w-4" />,
  sync_error: <XCircle className="h-4 w-4" />,
};

const PRIMARY_ACTION_COLOR = "bg-primary/10 text-primary border-primary/20";

const actionColors: Record<string, string> = {
  created: PRIMARY_ACTION_COLOR,
  updated: PRIMARY_ACTION_COLOR,
  status_changed: "bg-warning/10 text-warning border-warning/20",
  item_added: PRIMARY_ACTION_COLOR,
  item_removed: "bg-destructive/10 text-destructive border-destructive/20",
  item_updated: "bg-primary/15 text-primary/80 border-primary/25",
  // Sync events
  sync_started: "bg-primary/10 text-primary/70 border-primary/20",
  sync_pdf_ok: "bg-primary/10 text-primary/60 border-primary/15",
  sync_pdf_error: "bg-warning/10 text-warning border-warning/20",
  sync_success: "bg-primary/10 text-primary border-primary/30",
  sync_error: "bg-destructive/10 text-destructive border-destructive/20",
};

function displayMetadataValue(value: Json | undefined): string | undefined {
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function stringListMetadata(value: Json | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function useLoadedQuoteHistory(quoteId: string) {
  const historyState = useQuoteHistory();
  const fetchHistoryRef = useRef(historyState.fetchHistory);
  useEffect(() => {
    fetchHistoryRef.current = historyState.fetchHistory;
  }, [historyState.fetchHistory]);
  useEffect(() => {
    if (quoteId) void fetchHistoryRef.current(quoteId);
  }, [quoteId]);
  return historyState;
}

export function QuoteHistoryPanel({ quoteId }: QuoteHistoryPanelProps) {
  const { history, isLoading } = useLoadedQuoteHistory(quoteId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Nenhum histórico disponível</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-4">
          {history.map((entry, index) => (
            <HistoryEntry key={entry.id} entry={entry} isFirst={index === 0} />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function AuditDetails({ ipAddress, userAgent, changes }: { ipAddress?: string | null; userAgent?: string | null; changes: string[] }) {
  return <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
    className="mt-3 pt-3 border-t border-border/50 space-y-2 overflow-hidden"><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1"><span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1">
        <Globe className="h-2.5 w-2.5" /> IP de Origem</span><p className="text-[10px] font-mono text-foreground bg-background px-1.5 py-0.5 rounded border">
        {ipAddress || 'Não registrado'}</p></div>
      <div className="space-y-1"><span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest flex items-center gap-1">
        <Monitor className="h-2.5 w-2.5" /> Dispositivo / UA</span><TooltipProvider><Tooltip><TooltipTrigger asChild>
          <p className="text-[10px] text-foreground bg-background px-1.5 py-0.5 rounded border truncate cursor-help">{userAgent || 'N/A'}</p>
        </TooltipTrigger><TooltipContent side="bottom" className="text-[10px] max-w-[300px] break-all p-2">{userAgent || 'N/A'}</TooltipContent>
      </Tooltip></TooltipProvider></div>
    </div>
    {changes.length > 0 && <div className="space-y-1.5 mt-2"><span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Resumo de Mudanças</span>
      <div className="space-y-1">{changes.map((change, index) => <p key={`${change}-${index}`} className="text-[10px] text-foreground flex items-start gap-1.5">
        <span className="text-primary mt-0.5">•</span>{change}</p>)}</div></div>}
  </motion.div>;
}

function EntryHeader({ entry, hasAudit, showDetails, onToggle }: {
  entry: QuoteHistoryEntry; hasAudit: boolean; showDetails: boolean; onToggle: () => void;
}) {
  return <div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-foreground leading-tight">{entry.description}</p><div className="flex items-center gap-3 mt-1.5 flex-wrap">
      <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />
        {format(new Date(entry.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
      {hasAudit && <Badge variant="outline" className="h-4 px-1 text-[8px] bg-primary/5 text-primary border-primary/20 flex items-center gap-1">
        <ShieldCheck className="h-2.5 w-2.5" />Auditado</Badge>}
    </div></div>
    {hasAudit && <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onToggle}>
      {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</Button>}
  </div>;
}

function HistoryEntry({ entry, isFirst }: { entry: QuoteHistoryEntry; isFirst: boolean }) {
  const [showDetails, setShowDetails] = useState(false);
  const icon = actionIcons[entry.action] || <Clock className="h-4 w-4" />;
  const colorClass = actionColors[entry.action] || "bg-muted text-muted-foreground";
  
  const metadata = entry.metadata || {};
  const ipAddress = displayMetadataValue(metadata.ip);
  const userAgent = displayMetadataValue(metadata.user_agent);
  const changes = stringListMetadata(metadata.changes);
  const hasAudit = Boolean(ipAddress || userAgent);

  return (
    <div className="relative pl-10 group">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border z-10 transition-all",
          colorClass,
          isFirst && "ring-2 ring-primary/20",
          showDetails ? "scale-110 shadow-md" : ""
        )}
      >
        {icon}
      </div>

      <div className={cn(
        "p-3 rounded-xl border border-transparent transition-all",
        showDetails ? "bg-muted/50 border-border/50 shadow-sm" : "hover:bg-muted/20"
      )}>
        <EntryHeader entry={entry} hasAudit={hasAudit} showDetails={showDetails} onToggle={() => setShowDetails(!showDetails)} />
        {showDetails && hasAudit && <AuditDetails ipAddress={ipAddress} userAgent={userAgent} changes={changes} />}
      </div>
    </div>
  );
}
