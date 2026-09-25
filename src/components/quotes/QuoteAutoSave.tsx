/**
 * QuoteAutoSave - Sistema de auto-save para orçamentos
 * Salva rascunhos automaticamente no localStorage com indicador visual
 */

import { useState, useEffect, useRef } from "react";
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
  data: any;
  onChange?: (hasUnsavedChanges: boolean) => void;
  onRestore?: (data: any) => void;
  className?: string;
}

export function createQuoteDraftId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function QuoteAutoSave({
  quoteId,
  data,
  onChange,
  onRestore,
  className,
}: QuoteAutoSaveProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const initialDataRef = useRef<string | null>(null);
  const [draftId] = useState(createQuoteDraftId);
  const storageKey = quoteId ? `quote:${quoteId}` : `draft:${draftId}`;

  const { restore, lastError } = useAutoSave({
    key: storageKey,
    data,
    enabled: true,
    onSave: () => {
      setLastSaved(new Date());
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    },
    onError: () => setStatus("error"),
  });

  // Salvar estado inicial para comparação
  useEffect(() => {
    initialDataRef.current = JSON.stringify(data);
  }, [storageKey]);

  useEffect(() => {
    if (lastError) setStatus("error");
  }, [lastError]);

  // Detectar mudanças (persistência real é feita pelo useAutoSave, debounced internamente)
  useEffect(() => {
    const currentData = JSON.stringify(data);
    const hasChanges = currentData !== initialDataRef.current;

    setHasUnsavedChanges(hasChanges);
    onChange?.(hasChanges);

    if (hasChanges) {
      setStatus(navigator.onLine ? "saving" : "offline");
    }
  }, [data, onChange]);

  // Restauração automática se houver draft no carregamento
  useEffect(() => {
    if (onRestore) {
      const draft = restore();
      if (draft && JSON.stringify(draft) !== JSON.stringify(data)) {
        onRestore(draft);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restore, storageKey]);

  const getStatusIcon = () => {
    switch (status) {
      case "saving": return <Loader2 className="h-4 w-4 animate-spin" />;
      case "saved": return <Check className="h-4 w-4 text-success" />;
      case "error": return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "offline": return <CloudOff className="h-4 w-4 text-warning" />;
      default: return <Cloud className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "saving": return "Salvando...";
      case "saved": return "Salvo agora";
      case "error": return "Erro ao salvar";
      case "offline": return "Offline";
      default: return hasUnsavedChanges ? "Alterações não salvas" : lastSaved
        ? `Salvo às ${format(lastSaved, "HH:mm", { locale: ptBR })}`
        : "Salvo automaticamente";
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-2", className)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {getStatusIcon()}
            </motion.div>
          </AnimatePresence>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {getStatusText()}
          </span>
          {hasUnsavedChanges && status !== "saving" && (
            <Badge variant="outline" className="text-[10px] h-5">Não salvo</Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p className="font-medium">{getStatusText()}</p>
          {lastSaved && (
            <p className="text-muted-foreground">
              Último salvamento: {format(lastSaved, "HH:mm:ss", { locale: ptBR })}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
