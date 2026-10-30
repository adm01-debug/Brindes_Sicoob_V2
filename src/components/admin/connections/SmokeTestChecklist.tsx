/**
 * SmokeTestChecklist — validação manual da pipeline de credenciais.
 *
 * Roda 3 verificações encadeadas contra a edge function `secrets-manager`:
 *   1. Rotação concluída — confirma que `rotate` retorna `previous_suffix → new_suffix`
 *      e que o `masked_suffix` persistido bate com o novo sufixo.
 *   2. Histórico persistente — confirma que `rotation_history` ganhou um registro
 *      novo para o secret testado, com autor e timestamps coerentes.
 *   3. Recarregamento após refresh — força um `list` "frio" e valida que o
 *      `masked_suffix` retornado é o mesmo que foi gravado, garantindo que
 *      sobrevive a um F5 (não é só estado em memória do React).
 *
 * Cada step também emite logs estruturados no console (`[smoke-test] …`) para
 * facilitar QA via DevTools sem depender da UI.
 */

import { useState } from "react";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";
import { CheckCircle2, XCircle, Loader2, ListChecks, PlayCircle, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useSecretsManager,
  type SecretStatus,
  type RotationHistoryEntry,
} from "@/hooks/useSecretsManager";
import { ALLOWED_SECRET_NAMES } from "./secretWhitelist";
import { formatMaskedSuffix, normalizeMaskedSuffix } from "@/lib/masked-suffix";

type StepStatus = "idle" | "running" | "passed" | "failed" | "skipped";

interface StepState {
  id: "rotate" | "history" | "reload";
  title: string;
  description: string;
  status: StepStatus;
  detail?: string;
  durationMs?: number;
}

const INITIAL_STEPS: StepState[] = [
  {
    id: "rotate",
    title: "Rotação concluída",
    description: "Substitui o valor e valida o novo sufixo retornado.",
    status: "idle",
  },
  {
    id: "history",
    title: "Histórico persistente",
    description: "Garante que rotation_history ganhou registro com autor e timestamp.",
    status: "idle",
  },
  {
    id: "reload",
    title: "Recarregamento após refresh",
    description: "Lista os secrets do banco novamente para confirmar persistência.",
    status: "idle",
  },
];

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "passed") return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "skipped") return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
}

function makeTestValue(): string {
  // Random base36 + timestamp, ≥ 16 chars to satisfy validators.
  const rand = Math.random().toString(36).slice(2);
  const stamp = Date.now().toString(36);
  return `smoke_${stamp}_${rand}`.slice(0, 40);
}

function suffixOf(value: string): string {
  return value.slice(-4);
}

interface Props {
  /** All current secrets, used to populate the dropdown of testable names. */
  availableSecrets?: SecretStatus[];
}

type UpdateStep = (id: StepState["id"], patch: Partial<StepState>) => void;
type SmokeLogger = ReturnType<typeof createClientLogger>;

interface SmokeContext {
  secretName: string;
  expectedSuffix: string;
  newValue: string;
  sessionId: string;
  startedAt: Date;
  updateStep: UpdateStep;
  log: SmokeLogger;
}

async function runRotationStep(context: SmokeContext, rotateSecret: ReturnType<typeof useSecretsManager>["rotateSecret"]): Promise<boolean> {
  context.updateStep("rotate", { status: "running" });
  const started = performance.now();
  try {
    const result = await rotateSecret(context.secretName, context.newValue, `smoke-test ${context.sessionId}`);
    const durationMs = Math.round(performance.now() - started);
    if (!result.ok) {
      context.updateStep("rotate", { status: "failed", detail: result.error?.message ?? "Falha desconhecida", durationMs });
      context.log.error("step_1_failed", { error: result.error });
      context.updateStep("history", { status: "skipped", detail: "Pulado (rotação falhou)" });
      context.updateStep("reload", { status: "skipped", detail: "Pulado (rotação falhou)" });
      return false;
    }
    const suffixOk = normalizeMaskedSuffix(result.masked_suffix) === context.expectedSuffix;
    const lengthOk = (result.length ?? 0) === context.newValue.length;
    if (!suffixOk || !lengthOk) {
      context.updateStep("rotate", { status: "failed", detail: `Sufixo esperado ${formatMaskedSuffix(context.expectedSuffix)}, recebido ${formatMaskedSuffix(result.masked_suffix)}`, durationMs });
      context.log.error("step_1_mismatch", { expectedSuffix: context.expectedSuffix, got: result.masked_suffix });
    } else {
      context.updateStep("rotate", { status: "passed", detail: `previous=${result.previous_suffix ?? "(env)"} → new=${normalizeMaskedSuffix(result.masked_suffix)} • ${result.length} chars`, durationMs });
      context.log.info("step_1_ok", { took: durationMs, suffix: result.masked_suffix });
    }
    return true;
  } catch (error) {
    const durationMs = Math.round(performance.now() - started);
    context.updateStep("rotate", { status: "failed", detail: error instanceof Error ? error.message : "Erro inesperado", durationMs });
    context.log.error("step_1_exception", { err: error });
    return false;
  }
}

async function runHistoryStep(context: SmokeContext, getRotationHistory: ReturnType<typeof useSecretsManager>["getRotationHistory"]) {
  context.updateStep("history", { status: "running" });
  const started = performance.now();
  try {
    const entries: RotationHistoryEntry[] = await getRotationHistory(context.secretName);
    const durationMs = Math.round(performance.now() - started);
    const matching = entries.find((entry) => entry.new_suffix === context.expectedSuffix && new Date(entry.rotated_at).getTime() >= context.startedAt.getTime() - 5000);
    if (!matching) {
      context.updateStep("history", { status: "failed", detail: `Nenhum registro com sufixo ${formatMaskedSuffix(context.expectedSuffix)} encontrado (${entries.length} entradas vistas).`, durationMs });
      context.log.error("step_2_missing_entry", { expectedSuffix: context.expectedSuffix, total: entries.length });
      return;
    }
    const author = matching.rotated_by_email ?? matching.rotated_by ?? "desconhecido";
    context.updateStep("history", { status: "passed", detail: `Registro #${entries.length} • por ${author} • ${new Date(matching.rotated_at).toLocaleTimeString("pt-BR")}`, durationMs });
    context.log.info("step_2_ok", { took: durationMs, author, entryId: matching.id });
  } catch (error) {
    context.updateStep("history", { status: "failed", detail: error instanceof Error ? error.message : "Erro ao consultar histórico", durationMs: Math.round(performance.now() - started) });
    context.log.error("step_2_exception", { err: error });
  }
}

async function runReloadStep(context: SmokeContext, list: ReturnType<typeof useSecretsManager>["list"]) {
  context.updateStep("reload", { status: "running" });
  const started = performance.now();
  try {
    const fresh = await list([context.secretName]);
    const durationMs = Math.round(performance.now() - started);
    const target = (fresh ?? []).find((secret) => secret.name === context.secretName);
    if (!target) {
      context.updateStep("reload", { status: "failed", detail: "Secret não retornou na listagem após reload.", durationMs });
      context.log.error("step_3_missing_in_list");
    } else if (normalizeMaskedSuffix(target.masked_suffix) !== context.expectedSuffix) {
      context.updateStep("reload", { status: "failed", detail: `Sufixo divergente após reload: esperado ${formatMaskedSuffix(context.expectedSuffix)}, recebido ${formatMaskedSuffix(target.masked_suffix)}`, durationMs });
      context.log.error("step_3_suffix_mismatch", { target });
    } else {
      const sourceTag = target.source ? ` • source=${target.source}` : "";
      context.updateStep("reload", { status: "passed", detail: `Persistido • ${formatMaskedSuffix(target.masked_suffix)} • ${target.length} chars${sourceTag}`, durationMs });
      context.log.info("step_3_ok", { took: durationMs, source: target.source });
    }
  } catch (error) {
    context.updateStep("reload", { status: "failed", detail: error instanceof Error ? error.message : "Erro ao recarregar", durationMs: Math.round(performance.now() - started) });
    context.log.error("step_3_exception", { err: error });
  }
}

function SmokeSummary({ steps, summary, running }: { steps: StepState[]; summary: Record<StepStatus, number>; running: boolean }) {
  const allPassed = summary.passed === steps.length;
  const failed = summary.failed ?? 0;
  if (!(summary.passed || failed) || running) return null;
  return (
    <div className={cn("rounded-lg border p-3 text-sm", allPassed && "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400", failed > 0 && "border-destructive/50 bg-destructive/10 text-destructive")}>
      {allPassed && <span>✅ Todos os {steps.length} passos passaram. Pipeline saudável.</span>}
      {failed > 0 && <span>❌ {failed} falha{failed > 1 ? "s" : ""} de {steps.length}. Veja o console para stack traces.</span>}
    </div>
  );
}

export function SmokeTestChecklist({ availableSecrets = [] }: Props) {
  const { list, rotateSecret, getRotationHistory } = useSecretsManager();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<StepState[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [secretName, setSecretName] = useState<string>("");
  const [customValue, setCustomValue] = useState("");

  // Names that exist AND are in the whitelist — only those are safely testable.
  const testableNames = availableSecrets
    .filter((s) => s.has_value && ALLOWED_SECRET_NAMES.has(s.name))
    .map((s) => s.name)
    .sort();

  const updateStep = (id: StepState["id"], patch: Partial<StepState>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const reset = () => setSteps(INITIAL_STEPS);

  const runChecklist = async () => {
    if (!secretName) {
      toast.error("Selecione uma credencial para testar.");
      return;
    }
    setRunning(true);
    reset();
    const newValue = customValue.trim() || makeTestValue();
    const sessionId = `smoke-${Date.now().toString(36)}`;
    const context: SmokeContext = {
      secretName, newValue, sessionId, expectedSuffix: suffixOf(newValue), startedAt: new Date(),
      updateStep, log: createClientLogger("admin.smoke-test", { requestId: sessionId }),
    };
    context.log.info("starting", { secretName, expectedSuffix: context.expectedSuffix, length: newValue.length });
    const rotated = await runRotationStep(context, rotateSecret);
    if (rotated) {
      await runHistoryStep(context, getRotationHistory);
      await runReloadStep(context, list);
      context.log.info("finished", { sessionId, secretName });
    }
    setRunning(false);
  };

  const copyReport = async () => {
    const lines = [
      `Smoke Test • ${secretName || "(sem credencial)"} • ${new Date().toLocaleString("pt-BR")}`,
      ...steps.map(
        (s) => `• [${s.status.toUpperCase()}] ${s.title}${s.detail ? ` — ${s.detail}` : ""}${s.durationMs ? ` (${s.durationMs}ms)` : ""}`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Relatório copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const summary = steps.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<StepStatus, number>,
  );
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ListChecks className="h-4 w-4" />
          Smoke Test
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Checklist de Smoke Test
          </SheetTitle>
          <SheetDescription>
            Valida em sequência: rotação concluída, histórico persistente e recarregamento após refresh. Logs detalhados em <code className="text-xs">console.groupCollapsed("[smoke-test] …")</code>.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Picker */}
          {(<div className="space-y-2">
            <Label htmlFor="smoke-secret">Credencial alvo</Label>
            <Select value={secretName} onValueChange={setSecretName} disabled={running}>
              <SelectTrigger id="smoke-secret">
                <SelectValue placeholder={testableNames.length === 0 ? "Nenhuma credencial gravada disponível" : "Selecione…"} />
              </SelectTrigger>
              <SelectContent>
                {testableNames.map((n) => (
                  <SelectItem key={n} value={n} className="font-mono text-xs">
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              ⚠️ A rotação substitui o valor atual. Use uma credencial de teste ou esteja pronto para rotacionar de volta para o valor real.
            </p>
          </div>)}

          <div className="space-y-2">
            <Label htmlFor="smoke-value">Valor de teste (opcional)</Label>
            <Input
              id="smoke-value"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Deixe em branco para gerar automaticamente"
              disabled={running}
              className="font-mono text-xs"
            />
          </div>

          {(<div className="flex gap-2">
            <Button onClick={runChecklist} disabled={running || !secretName} className="gap-2 flex-1">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {running ? "Executando…" : "Rodar checklist"}
            </Button>
            <Button variant="outline" onClick={copyReport} disabled={running} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          </div>)}

          {/* Steps */}
          <ol className="space-y-3 mt-2">
            {steps.map((step, idx) => (
              <li
                key={step.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  step.status === "passed" && "border-green-500/40 bg-green-500/5",
                  step.status === "failed" && "border-destructive/50 bg-destructive/5",
                  step.status === "running" && "border-primary/50 bg-primary/5",
                  step.status === "idle" && "border-border bg-muted/20",
                  step.status === "skipped" && "border-border bg-muted/20 opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <StatusIcon status={step.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                      <h4 className="text-sm font-medium">{step.title}</h4>
                      {typeof step.durationMs === "number" && (
                        <Badge variant="outline" className="text-[10px] font-mono ml-auto">
                          {step.durationMs}ms
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                    {step.detail && (
                      <p
                        className={cn(
                          "text-xs mt-1.5 font-mono",
                          step.status === "failed" ? "text-destructive" : "text-foreground/80",
                        )}
                      >
                        {step.detail}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* Summary */}
          <SmokeSummary steps={steps} summary={summary} running={running} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
