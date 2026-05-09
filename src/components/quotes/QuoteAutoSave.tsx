/**
 * QuoteAutoSave - Sistema de auto-save para orçamentos
 * Salva rascunhos automaticamente no localStorage com indicador visual
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
  debounceMs?: number;
  className?: string;
}

export function QuoteAutoSave({
  quoteId,
  data,
  onChange,
  onRestore,
  debounceMs = 2000,
  className,
}: QuoteAutoSaveProps) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dataRef = useRef(data);
  const initialDataRef = useRef<string | null>(null);

  const { saveDraft, loadDraft } = useAutoSave(quoteId);

  // Salvar estado inicial para comparação
  useEffect(() => {
    initialDataRef.current = JSON.stringify(data);
  }, [quoteId]);

  // Detectar mudanças
  useEffect(() => {
    dataRef.current = data;
    
    const currentData = JSON.stringify(data);
    const hasChanges = currentData !== initialDataRef.current;
    
    setHasUnsavedChanges(hasChanges);
    onChange?.(hasChanges);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (hasChanges) {
      setStatus("idle");
      timeoutRef.current = setTimeout(() => {
        handleSave();
      }, debounceMs);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debounceMs, onChange]);

  const handleSave = useCallback(() => {
    if (!navigator.onLine) {
      setStatus("offline");
      return;
    }
    
    setStatus("saving");
    const success = saveDraft(dataRef.current);
    
    if (success) {
      setLastSaved(new Date());
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
    }
  }, [saveDraft]);

  // Restauração automática se houver draft no carregamento
  useEffect(() => {
    if (onRestore) {
      const draft = loadDraft();
      if (draft && JSON.stringify(draft) !== JSON.stringify(data)) {
        onRestore(draft);
      }
    }
  }, []);

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

