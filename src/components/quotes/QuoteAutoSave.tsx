/**
 * QuoteAutoSave - Sistema de auto-save para orçamentos
 * Salva rascunhos automaticamente no localStorage com indicador visual
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAutoSave } from "@/hooks/useAutoSave";

type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface QuoteAutoSaveProps {
  quoteId?: string;
  /** Identificador do usuário autenticado; impede restauração entre contas. */
  scopeId?: string | null;
  data: unknown;
  onChange?: (hasUnsavedChanges: boolean) => void;
  onRestore?: (data: Record<string, unknown>) => void;
  className?: string;
}

export function createQuoteDraftId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getQuoteDraftIdForScope(scopeId: string): string {
  const sessionKey = `quote-new-draft:${scopeId}`;
  const current = sessionStorage.getItem(sessionKey);
  if (current) return current;
  const draftId = createQuoteDraftId();
  sessionStorage.setItem(sessionKey, draftId);
  return draftId;
}

function statusIcon(status: SaveStatus) {
  if (status === "saving") return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === "saved") return <Check className="h-4 w-4 text-success" />;
  if (status === "error") return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (status === "offline") return <CloudOff className="h-4 w-4 text-warning" />;
  return <Cloud className="h-4 w-4" />;
}

function statusText(status: SaveStatus, hasChanges: boolean, lastSaved: Date | null): string {
  if (status === "saving") return "Salvando...";
  if (status === "saved") return "Salvo agora";
  if (status === "error") return "Erro ao salvar";
  if (status === "offline") return "Offline";
  if (hasChanges) return "Alterações não salvas";
  return lastSaved ? `Salvo às ${format(lastSaved, "HH:mm", { locale: ptBR })}` : "Salvo neste dispositivo";
}

function AutoSaveIndicator({ status, lastSaved, hasChanges, className }: {
  status: SaveStatus; lastSaved: Date | null; hasChanges: boolean; className?: string;
}) {
  const label = statusText(status, hasChanges, lastSaved);
  return <Tooltip><TooltipTrigger asChild><div className={cn("flex items-center gap-2", className)}>
    <AnimatePresence mode="wait"><motion.div key={status} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.15 }}>{statusIcon(status)}</motion.div></AnimatePresence>
    <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    {hasChanges && status !== "saving" && <Badge variant="outline" className="text-[10px] h-5">Não salvo</Badge>}
  </div></TooltipTrigger><TooltipContent><div className="text-xs space-y-1"><p className="font-medium">{label}</p>
    {lastSaved && <p className="text-muted-foreground">Último salvamento: {format(lastSaved, "HH:mm:ss", { locale: ptBR })}</p>}
  </div></TooltipContent></Tooltip>;
}

function useDraftLifecycle(args: {
  data: unknown; storageKey: string; lastError: unknown; restore: () => unknown;
  onChange?: (hasUnsavedChanges: boolean) => void; onRestore?: (data: Record<string, unknown>) => void;
  setStatus: (status: SaveStatus) => void;
}): boolean {
  const { data, storageKey, lastError, restore, onChange, onRestore, setStatus } = args;
  const [hasChanges, setHasChanges] = useState(false);
  const initialDataRef = useRef<string | null>(null);
  const currentDataRef = useRef(data);
  const onRestoreRef = useRef(onRestore);
  currentDataRef.current = data;
  onRestoreRef.current = onRestore;
  useEffect(() => { initialDataRef.current = JSON.stringify(currentDataRef.current); }, [storageKey]);
  useEffect(() => { if (lastError) setStatus("error"); }, [lastError, setStatus]);
  useEffect(() => {
    const changed = JSON.stringify(data) !== initialDataRef.current;
    setHasChanges(changed);
    onChange?.(changed);
    if (changed) setStatus(navigator.onLine ? "saving" : "offline");
  }, [data, onChange, setStatus]);
  useEffect(() => {
    const restoreDraft = onRestoreRef.current;
    const draft = restoreDraft ? restore() : null;
    if (restoreDraft && draft && typeof draft === "object" && !Array.isArray(draft)
      && JSON.stringify(draft) !== JSON.stringify(currentDataRef.current)) restoreDraft(draft as Record<string, unknown>);
  }, [restore, storageKey]);
  return hasChanges;
}

export function QuoteAutoSave({
  quoteId,
  scopeId,
  data,
  onChange,
  onRestore,
  className,
}: QuoteAutoSaveProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const draftId = useMemo(() => scopeId ? getQuoteDraftIdForScope(scopeId) : null, [scopeId]);
  const storageKey = scopeId ? (quoteId ? `quote:${scopeId}:${quoteId}` : `draft:${scopeId}:${draftId}`) : "";

  const { restore, lastError } = useAutoSave({
    key: storageKey,
    data,
    enabled: Boolean(storageKey),
    onSave: () => {
      setLastSaved(new Date());
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    },
    onError: () => setStatus("error"),
  });
  const hasUnsavedChanges = useDraftLifecycle({ data, storageKey, lastError, restore, onChange, onRestore, setStatus });

  return <AutoSaveIndicator status={status} lastSaved={lastSaved} hasChanges={hasUnsavedChanges} className={className} />;
}
