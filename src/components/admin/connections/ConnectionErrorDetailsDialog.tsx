import { isNullish } from "@/components/admin/utils/nullish";
import { useEffect, useState, useCallback } from "react";
import { XCircle, Copy, History as HistoryIcon, ChevronDown, Lightbulb, Clock, WifiOff, Globe, KeyRound, ServerCrash, Settings2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { LastTestInfo } from "./LastTestLine";
import type { ErrorKind } from "@/hooks/useConnectionTester";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connectionType: string;
  connectionLabel: string;
  summary: LastTestInfo | null;
  envKey?: "promobrind" | "crm";
  onOpenTimeline?: () => void;
}

const DESTRUCTIVE_KIND_CLASS = "border-destructive/40 bg-destructive/10 text-destructive";

interface DetailRow {
  id: string;
  tested_at: string;
  success: boolean;
  latency_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  error_kind: ErrorKind | null;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

const SUGGESTIONS: Record<ErrorKind, string> = {
  timeout: "Aumente o timeout, verifique se o serviço está sobrecarregado ou se há latência de rede excessiva.",
  network: "O serviço pode estar offline, fora do ar ou bloqueando o IP da função. Tente novamente em alguns minutos.",
  dns: "DNS não resolvido — verifique se a URL está correta e o domínio existe.",
  auth: "Verifique se as credenciais estão corretas, não expiraram e têm as permissões necessárias.",
  http: "Serviço externo retornou erro — consulte os logs do destino para entender a causa.",
  config: "Configure as credenciais necessárias antes de testar a conexão.",
  unknown: "Erro não categorizado — consulte os detalhes técnicos abaixo.",
};

const KIND_META: Record<ErrorKind, { label: string; Icon: typeof Clock; className: string }> = {
  timeout: { label: "Timeout", Icon: Clock, className: "border-warning/40 bg-warning/10 text-warning" },
  network: { label: "Rede", Icon: WifiOff, className: DESTRUCTIVE_KIND_CLASS },
  dns: { label: "DNS", Icon: Globe, className: DESTRUCTIVE_KIND_CLASS },
  auth: { label: "Auth", Icon: KeyRound, className: "border-warning/40 bg-warning/10 text-warning" },
  http: { label: "HTTP", Icon: ServerCrash, className: DESTRUCTIVE_KIND_CLASS },
  config: { label: "Config", Icon: Settings2, className: "border-muted-foreground/40 bg-muted text-muted-foreground" },
  unknown: { label: "Desconhecido", Icon: AlertCircle, className: "border-muted-foreground/40 bg-muted text-muted-foreground" },
};

/** Legacy regex-based fallback for rows persisted before error_kind existed. */
function suggestionFromMessage(message: string | null | undefined, status: number | null | undefined): string | null {
  const normalized = (message ?? "").toLowerCase();
  if ([401, 403].includes(status ?? 0)) return SUGGESTIONS.auth;
  if (status === 404) return "Verifique se a URL base está correta.";
  if ((status ?? 0) >= 500) return SUGGESTIONS.http;
  const keywordSuggestions: Array<[string[], string]> = [
    [["etimedout", "timeout", "tempo esgotado"], SUGGESTIONS.timeout],
    [["econnrefused", "network", "rede"], SUGGESTIONS.network],
    [["dns", "getaddrinfo"], SUGGESTIONS.dns],
    [["jwt", "token"], "Token JWT possivelmente malformado — re-salve o secret."],
  ];
  for (const [keywords, suggestion] of keywordSuggestions) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return suggestion;
  }
  return null;
}

async function fetchLatestFailure(connectionType: string, envKey?: "promobrind" | "crm"): Promise<DetailRow | null> {
  let query = supabase.from("external_connections").select("id").eq("type", connectionType);
  if (envKey) query = query.eq("env_key", envKey);
  const { data: connections } = await query;
  let ids = (connections ?? []).map((connection) => connection.id);
  if (ids.length === 0 && envKey) {
    const { data: fallbacks } = await supabase.from("external_connections").select("id").eq("type", connectionType);
    ids = (fallbacks ?? []).map((connection) => connection.id);
  }
  if (ids.length === 0) return null;
  const { data } = await supabase
    .from("connection_test_history")
    .select("id,tested_at,success,latency_ms,status_code,error_message,error_kind")
    .in("connection_id", ids)
    .eq("success", false)
    .order("tested_at", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] as DetailRow | undefined) ?? null;
}

function firstDefined<T>(...values: Array<T | null | undefined>): T | null {
  return values.find((value): value is T => value !== null && value !== undefined) ?? null;
}

interface ErrorView {
  status: number | null;
  message: string | null;
  latency: number | null;
  testedAt: string | null;
  errorKind: ErrorKind | null;
  suggestion: string | null;
  kindMeta: (typeof KIND_META)[ErrorKind] | null;
}

function resolveErrorView(detail: DetailRow | null, summary: LastTestInfo | null): ErrorView {
  const detailValues: Partial<DetailRow> = detail || {};
  const summaryValues: Partial<LastTestInfo> = summary || {};
  const status = firstDefined(detailValues.status_code, summaryValues.status);
  const message = firstDefined(detailValues.error_message, summaryValues.message);
  const errorKind = firstDefined(detailValues.error_kind, summaryValues.error_kind as ErrorKind | null | undefined);
  return {
    status,
    message,
    latency: firstDefined(detailValues.latency_ms, summaryValues.latency_ms),
    testedAt: firstDefined(detailValues.tested_at, summaryValues.tested_at),
    errorKind,
    suggestion: errorKind ? SUGGESTIONS[errorKind] : suggestionFromMessage(message, status),
    kindMeta: errorKind ? KIND_META[errorKind] : null,
  };
}

function ErrorDialogTitle({ connectionLabel, kindMeta }: { connectionLabel: string; kindMeta: ErrorView["kindMeta"] }) {
  const Icon = kindMeta?.Icon;
  return (
    <DialogTitle className="flex items-center gap-2 flex-wrap">
      <XCircle className="h-5 w-5 text-destructive" />
      Detalhes da falha
      <Badge variant="outline" className="ml-2">{connectionLabel}</Badge>
      {kindMeta && Icon && <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium", kindMeta.className)} title={`Categoria do erro: ${kindMeta.label}`}><Icon className="h-3 w-3" />{kindMeta.label}</span>}
    </DialogTitle>
  );
}

function ErrorSummary({ view, connectionType }: { view: ErrorView; connectionType: string }) {
  const statusVariant = view.status && view.status >= 400 ? "destructive" : "outline";
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div><div className="text-xs text-muted-foreground">Quando</div><div title={view.testedAt ?? ""}>{formatRelative(view.testedAt)}</div></div>
      <div><div className="text-xs text-muted-foreground">Latência</div><div className="font-mono">{!isNullish(view.latency) ? `${view.latency}ms` : "— (timeout)"}</div></div>
      <div><div className="text-xs text-muted-foreground">HTTP Status</div><div>{!isNullish(view.status) ? <Badge variant={statusVariant} className="font-mono">{view.status}</Badge> : <span className="text-muted-foreground text-xs">— (network error)</span>}</div></div>
      <div><div className="text-xs text-muted-foreground">Tipo</div><Badge variant="outline" className="font-mono">{connectionType}</Badge></div>
    </div>
  );
}

function TechnicalDetails({ detail }: { detail: DetailRow | null }) {
  if (!detail) return null;
  return (
    <Collapsible>
      <CollapsibleTrigger asChild><button type="button" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"><ChevronDown className="h-3.5 w-3.5" /> Detalhes técnicos</button></CollapsibleTrigger>
      <CollapsibleContent className="mt-2"><pre className="rounded-md border bg-muted/30 p-3 text-[11px] text-muted-foreground whitespace-pre-wrap max-h-[400px] overflow-auto">{JSON.stringify(detail, null, 2)}</pre></CollapsibleContent>
    </Collapsible>
  );
}

function ErrorDialogBody({ view, detail, connectionType, loading }: { view: ErrorView; detail: DetailRow | null; connectionType: string; loading: boolean }) {
  return (
    <div className="space-y-4">
      <ErrorSummary view={view} connectionType={connectionType} />
      <div><div className="text-xs text-muted-foreground mb-1">Mensagem</div><div className="rounded-md border bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">{loading ? "Carregando…" : view.message || "(sem mensagem)"}</div></div>
      <TechnicalDetails detail={detail} />
      {view.suggestion && <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs"><Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" /><span>{view.suggestion}</span></div>}
    </div>
  );
}

function ErrorDialogActions({ onCopy, onOpenTimeline, onClose }: { onCopy: () => void; onOpenTimeline?: () => void; onClose: () => void }) {
  return (
    <DialogFooter className="gap-2 sm:gap-2">
      <Button variant="ghost" size="sm" onClick={onCopy} title="Copiar (C)"><Copy className="h-3.5 w-3.5" /> Copiar detalhes</Button>
      {onOpenTimeline && <Button variant="outline" size="sm" onClick={onOpenTimeline} title="Histórico (H)"><HistoryIcon className="h-3.5 w-3.5" /> Ver histórico completo</Button>}
      <Button size="sm" onClick={onClose}>Fechar</Button>
    </DialogFooter>
  );
}

function useLatestFailure(open: boolean, connectionType: string, envKey: Props["envKey"]) {
  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const latestFailure = await fetchLatestFailure(connectionType, envKey);
        if (!cancelled) setDetail(latestFailure);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, connectionType, envKey]);
  return { detail, loading };
}

function useErrorDialogShortcuts(open: boolean, onCopy: () => void, onOpenTimeline?: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.target && (event.target as HTMLElement).tagName === "INPUT") return;
      if (event.key.toLowerCase() === "c" && !event.metaKey && !event.ctrlKey) onCopy();
      else if (event.key.toLowerCase() === "h" && onOpenTimeline) onOpenTimeline();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCopy, onOpenTimeline]);
}

export function ConnectionErrorDetailsDialog({
  open,
  onOpenChange,
  connectionType,
  connectionLabel,
  summary,
  envKey,
  onOpenTimeline,
}: Props) {
  const { detail, loading } = useLatestFailure(open, connectionType, envKey);
  const view = resolveErrorView(detail, summary);

  const copyDetails = useCallback(() => {
    const payload = {
      connection: connectionLabel,
      type: connectionType,
      env_key: envKey ?? null,
      tested_at: view.testedAt,
      latency_ms: view.latency,
      status_code: view.status,
      error_kind: view.errorKind,
      message: view.message,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    toast.success("Detalhes copiados");
  }, [connectionLabel, connectionType, envKey, view]);

  useErrorDialogShortcuts(open, copyDetails, onOpenTimeline);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader><ErrorDialogTitle connectionLabel={connectionLabel} kindMeta={view.kindMeta} /></DialogHeader>
        <ErrorDialogBody view={view} detail={detail} connectionType={connectionType} loading={loading} />
        <ErrorDialogActions onCopy={copyDetails} onOpenTimeline={onOpenTimeline} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
