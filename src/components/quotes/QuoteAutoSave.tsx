/**
 * QuoteAutoSave - Sistema de auto-save para orçamentos
 * Salva rascunhos automaticamente no localStorage com indicador visual
 */

import { useState, useEffect, useRef } from 'react';
import { Cloud, CloudOff, Check, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { descartarRascunho, useAutoSave } from '@/hooks/useAutoSave';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface QuoteAutoSaveProps {
  quoteId?: string;
  /** Identificador do usuário autenticado; impede restauração entre contas. */
  scopeId?: string | null;
  /** Desliga persistência e restauração em propostas imutáveis. */
  enabled?: boolean;
  data: unknown;
  onChange?: (hasUnsavedChanges: boolean) => void;
  onRestore?: (data: Record<string, unknown>) => void;
  className?: string;
}

export function createQuoteDraftId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Lê o id do rascunho novo sem criar um (ao contrário de `getQuoteDraftIdForScope`). */
function lerRascunhoNovoDaSessao(scopeId: string): string | null {
  try {
    return sessionStorage.getItem(`quote-new-draft:${scopeId}`);
  } catch {
    return null;
  }
}

/**
 * Apaga o rascunho local deste orçamento.
 *
 * Usado quando o usuário confirma "sair sem salvar": sem isto, a edição que ele
 * descartou é restaurada por cima do que veio do servidor na próxima abertura.
 */
export function limparRascunhoDoOrcamento(args: {
  scopeId?: string | null;
  quoteId?: string | null;
  data: unknown;
}): void {
  const { scopeId, quoteId, data } = args;
  if (!scopeId) return;
  const chave = quoteId
    ? `quote:${scopeId}:${quoteId}`
    : (() => {
        const id = lerRascunhoNovoDaSessao(scopeId);
        return id ? `draft:${scopeId}:${id}` : null;
      })();
  if (!chave) return;
  // Só o rascunho que guarda exatamente este conteúdo: o mesmo orçamento aberto
  // em duas abas tem a mesma chave, e o descarte de uma não pode apagar o
  // trabalho mais novo da outra.
  descartarRascunho(chave, data);
}

export function getQuoteDraftIdForScope(scopeId: string): string {
  const sessionKey = `quote-new-draft:${scopeId}`;
  try {
    const current = sessionStorage.getItem(sessionKey);
    if (current) return current;
    const draftId = createQuoteDraftId();
    sessionStorage.setItem(sessionKey, draftId);
    return draftId;
  } catch {
    return createQuoteDraftId();
  }
}

function useScopedQuoteDraftId(enabled: boolean, scopeId?: string | null, quoteId?: string) {
  const [draft, setDraft] = useState<{ scopeId: string; id: string } | null>(null);
  useEffect(() => {
    if (!enabled || !scopeId || quoteId) {
      setDraft(null);
      return;
    }
    setDraft({ scopeId, id: getQuoteDraftIdForScope(scopeId) });
  }, [enabled, scopeId, quoteId]);
  return scopeId && draft?.scopeId === scopeId ? draft.id : null;
}

function statusIcon(status: SaveStatus) {
  if (status === 'saving') return <Loader2 className="h-4 w-4 animate-spin" />;
  if (status === 'saved') return <Check className="h-4 w-4 text-success" />;
  if (status === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (status === 'offline') return <CloudOff className="h-4 w-4 text-warning" />;
  return <Cloud className="h-4 w-4" />;
}

function statusText(
  status: SaveStatus,
  hasChanges: boolean,
  lastSaved: Date | null,
  error: Error | null,
): string {
  if (status === 'saving') return 'Salvando...';
  if (status === 'saved') return 'Salvo agora';
  if (status === 'error' && error?.message.includes('alterado em outra aba'))
    return 'Conflito em outra aba';
  if (status === 'error') return 'Erro ao salvar';
  if (status === 'offline') return 'Offline';
  if (hasChanges) return 'Alterações não salvas';
  return lastSaved
    ? `Salvo às ${format(lastSaved, 'HH:mm', { locale: ptBR })}`
    : 'Salvo neste dispositivo';
}

function AutoSaveDetails({
  label,
  error,
  lastSaved,
}: {
  label: string;
  error: Error | null;
  lastSaved: Date | null;
}) {
  return (
    <TooltipContent>
      <div className="space-y-1 text-xs">
        <p className="font-medium">{label}</p>
        {error && <p className="text-muted-foreground">{error.message}</p>}
        {lastSaved && (
          <p className="text-muted-foreground">
            Último salvamento: {format(lastSaved, 'HH:mm:ss', { locale: ptBR })}
          </p>
        )}
      </div>
    </TooltipContent>
  );
}

function AutoSaveIndicator({
  status,
  lastSaved,
  hasChanges,
  error,
  className,
}: {
  status: SaveStatus;
  lastSaved: Date | null;
  hasChanges: boolean;
  error: Error | null;
  className?: string;
}) {
  const label = statusText(status, hasChanges, lastSaved, error);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-2', className)}>
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {statusIcon(status)}
            </motion.div>
          </AnimatePresence>
          <span className="hidden text-xs text-muted-foreground sm:inline">{label}</span>
          {hasChanges && status !== 'saving' && (
            <Badge variant="outline" className="h-5 text-[10px]">
              Não salvo
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <AutoSaveDetails label={label} error={error} lastSaved={lastSaved} />
    </Tooltip>
  );
}

function useDraftLifecycle(args: {
  data: unknown;
  storageKey: string;
  lastError: unknown;
  restore: () => unknown;
  onChange?: (hasUnsavedChanges: boolean) => void;
  onRestore?: (data: Record<string, unknown>) => void;
  setStatus: (status: SaveStatus) => void;
  enabled: boolean;
}): boolean {
  const { data, storageKey, lastError, restore, onChange, onRestore, setStatus, enabled } = args;
  const [hasChanges, setHasChanges] = useState(false);
  const initialDataRef = useRef<string | null>(null);
  const currentDataRef = useRef(data);
  const onRestoreRef = useRef(onRestore);
  currentDataRef.current = data;
  onRestoreRef.current = onRestore;
  useEffect(() => {
    initialDataRef.current = enabled ? JSON.stringify(currentDataRef.current) : null;
  }, [enabled, storageKey]);
  useEffect(() => {
    if (enabled && lastError) setStatus('error');
  }, [enabled, lastError, setStatus]);
  useEffect(() => {
    if (!enabled) {
      setHasChanges(false);
      onChange?.(false);
      setStatus('idle');
      return;
    }
    const changed = JSON.stringify(data) !== initialDataRef.current;
    setHasChanges(changed);
    onChange?.(changed);
    if (changed) setStatus(navigator.onLine ? 'saving' : 'offline');
  }, [data, enabled, onChange, setStatus]);
  useEffect(() => {
    if (!enabled) return;
    const restoreDraft = onRestoreRef.current;
    const draft = restoreDraft ? restore() : null;
    if (
      restoreDraft &&
      draft &&
      typeof draft === 'object' &&
      !Array.isArray(draft) &&
      JSON.stringify(draft) !== JSON.stringify(currentDataRef.current)
    )
      restoreDraft(draft as Record<string, unknown>);
  }, [enabled, restore, storageKey]);
  return hasChanges;
}

function useQuoteAutoSaveState({
  quoteId,
  scopeId,
  enabled = true,
  data,
  onChange,
  onRestore,
}: QuoteAutoSaveProps) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const draftId = useScopedQuoteDraftId(enabled, scopeId, quoteId);
  // A chave de um orçamento já gravado não depende de `enabled`: quando a tela
  // deixa de ser editável, a última gravação local ainda precisa cair no mesmo
  // rascunho (o que foi digitado durante o envio). Um rascunho novo só existe
  // enquanto a persistência está ligada.
  const storageKey =
    scopeId && quoteId
      ? `quote:${scopeId}:${quoteId}`
      : enabled && scopeId && draftId
        ? `draft:${scopeId}:${draftId}`
        : '';
  const persistenceEnabled = enabled && Boolean(storageKey);

  const { restore, lastError } = useAutoSave({
    key: storageKey,
    data,
    enabled: persistenceEnabled,
    onSave: () => {
      setLastSaved(new Date());
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    },
    onError: () => setStatus('error'),
  });
  const hasUnsavedChanges = useDraftLifecycle({
    data,
    storageKey,
    lastError,
    restore,
    onChange,
    onRestore,
    setStatus,
    enabled: persistenceEnabled,
  });
  return { status, lastSaved, hasUnsavedChanges, lastError, enabled };
}

export function QuoteAutoSave(props: QuoteAutoSaveProps) {
  const {
    status,
    lastSaved,
    hasUnsavedChanges,
    lastError,
    enabled = true,
  } = useQuoteAutoSaveState(props);
  if (!enabled) return null;
  return (
    <AutoSaveIndicator
      status={status}
      lastSaved={lastSaved}
      hasChanges={hasUnsavedChanges}
      error={lastError}
      className={props.className}
    />
  );
}
