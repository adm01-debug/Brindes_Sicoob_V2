/**
 * DevAccessAuditAlert
 *
 * Mostra um alerta no dashboard admin quando um usuário com role `dev`
 * NÃO tem acesso esperado a alguma tabela sensível (telemetria/logs/conexões).
 * Indica possível mismatch de RBAC após migration ou regressão de RLS.
 *
 * Visível apenas para devs. Em ambiente saudável, renderiza um banner
 * compacto de status OK (dispensável).
 */
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useDevAccessAudit } from "@/hooks/useDevAccessAudit";

function refreshIconClass(loading: boolean): string {
  return `h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`;
}

function formattedRunTime(ranAt: Date | null): string {
  return ranAt ? ` em ${ranAt.toLocaleTimeString()}` : "";
}

type AuditState = ReturnType<typeof useDevAccessAudit>;

function HealthyAuditAlert({ state, dismiss }: { state: AuditState; dismiss: () => void }) {
  return <Alert className="mb-4 border-success/40 bg-success/5"><ShieldCheck className="h-4 w-4 text-success" /><AlertTitle className="flex items-center justify-between gap-2"><span>RBAC do dev validado</span><div className="flex items-center gap-2"><Badge variant="outline" className="text-xs">{state.results.length}/{state.results.length} OK</Badge><Button size="sm" variant="ghost" onClick={() => void state.run()} disabled={state.loading}><RefreshCcw className={refreshIconClass(state.loading)} /></Button><Button size="sm" variant="ghost" onClick={dismiss}>Ocultar</Button></div></AlertTitle><AlertDescription className="text-xs text-muted-foreground">Acesso a telemetria, logs e conexões confirmado{formattedRunTime(state.ranAt)}.</AlertDescription></Alert>;
}

function BlockedAuditRows({ state }: { state: AuditState }) {
  return <ul className="mt-2 space-y-1 rounded border border-destructive/30 bg-background/40 p-2 text-xs">{state.blocked.map(result => <li key={result.table} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" /><div><code className="font-mono">{result.table}</code>{result.error ? <span className="ml-2 text-muted-foreground">— {result.error}</span> : null}</div></li>)}{state.results.filter(result => result.ok).map(result => <li key={result.table} className="flex items-start gap-2 text-muted-foreground"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" /><code className="font-mono">{result.table}</code></li>)}</ul>;
}

function MismatchAuditAlert({ state, expanded, toggle }: { state: AuditState; expanded: boolean; toggle: () => void }) {
  return <Alert variant="destructive" className="mb-4"><AlertTriangle className="h-4 w-4" /><AlertTitle className="flex items-center justify-between gap-2"><span>Mismatch de RBAC detectado para o papel DEV</span><div className="flex items-center gap-2"><Badge variant="destructive" className="text-xs">{state.blocked.length} de {state.results.length} bloqueadas</Badge><Button size="sm" variant="outline" onClick={() => void state.run()} disabled={state.loading}><RefreshCcw className={`mr-1 ${refreshIconClass(state.loading)}`} />Reexecutar</Button><Button size="sm" variant="ghost" onClick={toggle}>{expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</Button></div></AlertTitle><AlertDescription className="space-y-2 text-sm"><p>O usuário atual está com role <strong>dev</strong>, mas a checagem de RLS bloqueou leitura em tabelas sensíveis. Isso normalmente indica que uma policy ainda usa <code className="rounded bg-background/40 px-1 text-xs">has_role(auth.uid(),'admin')</code> em vez de <code className="rounded bg-background/40 px-1 text-xs">is_supervisor_or_above(auth.uid())</code>, ou que a função gate foi alterada inadvertidamente.</p>{expanded && <BlockedAuditRows state={state} />}{state.ranAt && <p className="text-xs text-muted-foreground">Última verificação: {state.ranAt.toLocaleString()}</p>}</AlertDescription></Alert>;
}

export function DevAccessAuditAlert() {
  const state = useDevAccessAudit();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!state.enabled) return null;

  const hasMismatch = state.blocked.length > 0;

  // Estado saudável e dispensado — não polui a UI
  if ((!hasMismatch && dismissed)) return null;

  if (!hasMismatch) {
    return <HealthyAuditAlert state={state} dismiss={() => setDismissed(true)} />;
  }
  return <MismatchAuditAlert state={state} expanded={expanded} toggle={() => setExpanded(current => !current)} />;
}
