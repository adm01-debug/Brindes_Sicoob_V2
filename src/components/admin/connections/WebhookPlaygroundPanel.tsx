/**
 * WebhookPlaygroundPanel — Onda 13 #9
 * Card "Testar payload" no fluxo outbound: seleciona webhook + evento do
 * catálogo SSOT, mostra payload de exemplo editável e dispara em modo teste
 * (não conta em consecutive_failures, não persiste em webhook_deliveries).
 */
import { isNullish } from "@/components/admin/utils/nullish";
import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Beaker, Loader2, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WEBHOOK_EVENTS_CATALOG } from "@/lib/webhook-events-catalog";
import { getEventSamplePayload } from "@/lib/webhook-events-payload-samples";
import { cn } from "@/lib/utils";

interface OutboundHookOption {
  id: string;
  name: string;
  url: string;
  events: string[];
}

interface TestResult {
  success: boolean;
  status_code: number | null;
  latency_ms: number;
  response_body?: string;
  error?: string;
}

interface Props {
  webhooks: OutboundHookOption[];
}

function parsePayload(payload: string): { value: unknown; error: string | null } {
  try {
    return { value: payload.trim() ? JSON.parse(payload) : null, error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : "JSON inválido" };
  }
}

async function dispatchTest(hookId: string, event: string, payload: unknown): Promise<TestResult> {
  const { data, error } = await supabase.functions.invoke("webhook-dispatcher", {
    body: { event, payload, test_mode: true, test_webhook_id: hookId },
  });
  if (error) throw error;
  return {
    success: Boolean(data?.success),
    status_code: data?.status_code ?? null,
    latency_ms: data?.latency_ms ?? 0,
    response_body: data?.response_body,
    error: data?.error,
  };
}

function notifyDispatch(result: TestResult) {
  if (result.success) {
    toast.success("Payload entregue", {
      description: `HTTP ${result.status_code} em ${result.latency_ms}ms`,
    });
    return;
  }
  toast.warning("Destino respondeu com erro", {
    description: result.error ?? `HTTP ${result.status_code ?? "?"}`,
  });
}

function TestResultCard({ result }: { result: TestResult | null }) {
  if (!result) return null;
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      result.success ? "bg-success/5 border-success/20" : "bg-destructive/5 border-destructive/20",
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {result.success
            ? <CheckCircle2 className="h-4 w-4 text-success" />
            : <AlertCircle className="h-4 w-4 text-destructive" />}
          <span className="text-sm font-medium">{result.success ? "Sucesso" : "Falha"}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isNullish(result.status_code) && (
            <Badge variant="outline" className="text-[10px] font-mono">HTTP {result.status_code}</Badge>
          )}
          <Badge variant="outline" className="text-[10px] font-mono">{result.latency_ms}ms</Badge>
        </div>
      </div>
      {result.error && <p className="text-xs text-destructive mb-2">{result.error}</p>}
      {result.response_body && (
        <pre className="text-[10px] font-mono p-2 rounded bg-muted overflow-auto max-h-40">
          {result.response_body}
        </pre>
      )}
    </div>
  );
}

interface PayloadEditorProps {
  event: string;
  parseError: string | null;
  payload: string;
  onPayloadChange: (value: string) => void;
}

function PayloadEditor({ event, parseError, payload, onPayloadChange }: PayloadEditorProps) {
  if (!event) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-xs">Payload (JSON editável)</Label>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px]"
          onClick={() => onPayloadChange(JSON.stringify(getEventSamplePayload(event), null, 2))}
        >
          Resetar exemplo
        </Button>
      </div>
      <Textarea
        value={payload}
        onChange={(changeEvent) => onPayloadChange(changeEvent.target.value)}
        className="font-mono text-[11px] min-h-[180px] max-h-[300px]"
        spellCheck={false}
      />
      {parseError && (
        <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> JSON inválido: {parseError}
        </p>
      )}
    </div>
  );
}

export function WebhookPlaygroundPanel({ webhooks }: Props) {
  const [hookId, setHookId] = useState<string>("");
  const [event, setEvent] = useState<string>("");
  const [payload, setPayload] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const selectedHook = useMemo(() => webhooks.find((h) => h.id === hookId), [hookId, webhooks]);
  const subscribedEvents = (selectedHook?.events ?? []);

  const handleEventChange = (key: string) => {
    setEvent(key);
    setPayload(JSON.stringify(getEventSamplePayload(key), null, 2));
    setParseError(null);
    setResult(null);
  };

  const handleDispatch = async () => {
    if (!hookId || !event) {
      toast.error("Selecione webhook e evento");
      return;
    }
    const parsed = parsePayload(payload);
    setParseError(parsed.error);
    if (parsed.error) {
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const nextResult = await dispatchTest(hookId, event, parsed.value);
      setResult(nextResult);
      notifyDispatch(nextResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      setResult({ success: false, status_code: null, latency_ms: 0, error: msg });
      toast.error("Falha ao disparar", { description: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Beaker className="h-4 w-4 text-primary" /> Playground — Testar payload
        </CardTitle>
        <CardDescription>
          Dispare um evento de teste para um webhook. <strong>Não conta</strong> em métricas de falha,
          não persiste em entregas e não aciona o circuit breaker.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {(<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Webhook</Label>
            <Select value={hookId} onValueChange={(v) => { setHookId(v); setEvent(""); setPayload(""); setResult(null); }}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder="Escolha um webhook…" /></SelectTrigger>
              <SelectContent>
                {webhooks.length === 0 ? (
                  <SelectItem value="_none" disabled>Nenhum webhook cadastrado</SelectItem>
                ) : (
                  webhooks.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} <span className="text-muted-foreground text-[10px] ml-1">({h.events.length} ev.)</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Evento</Label>
            <Select value={event} onValueChange={handleEventChange} disabled={!hookId}>
              <SelectTrigger className="h-9 mt-1"><SelectValue placeholder={hookId ? "Escolha o evento…" : "Selecione um webhook primeiro"} /></SelectTrigger>
              <SelectContent>
                {WEBHOOK_EVENTS_CATALOG.map((g) => {
                  const visible = g.events.filter((e) => subscribedEvents.length === 0 || subscribedEvents.includes(e.key));
                  if (visible.length === 0) return null;
                  return (
                    <SelectGroup key={g.category}>
                      <SelectLabel className="text-[10px]">{g.label}</SelectLabel>
                      {visible.map((e) => (
                        <SelectItem key={e.key} value={e.key} className="text-xs">
                          <span className="font-mono">{e.key}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedHook && subscribedEvents.length > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {subscribedEvents.length} evento(s) inscrito(s) neste webhook
              </p>
            )}
          </div>
        </div>)}

        <PayloadEditor
          event={event}
          parseError={parseError}
          payload={payload}
          onPayloadChange={(value) => { setPayload(value); setParseError(null); }}
        />

        {(<Button onClick={handleDispatch} disabled={!hookId || !event || busy} className="w-full sm:w-auto">
          {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Disparar teste
        </Button>)}

        <TestResultCard result={result} />
      </CardContent>
    </Card>
  );
}
