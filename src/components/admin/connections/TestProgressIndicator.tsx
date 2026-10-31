import { isNullish } from "@/components/admin/utils/nullish";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TestProgressPhase = "idle" | "running" | "completed" | "failed";

interface Props {
  phase: TestProgressPhase;
  /** Optional latency to show on the completed/failed line. */
  latencyMs?: number | null;
  /** Optional short message to show on completed/failed (e.g. status code or error). */
  message?: string | null;
  /** ms after which a non-running phase auto-clears. Default 3500. */
  autoDismissMs?: number;
  /** Called when the auto-dismiss fires. */
  onDismiss?: () => void;
  className?: string;
}

function completedDetail(latencyMs: number | null | undefined, message: string | null | undefined, fallback: string): string {
  const details = [!isNullish(latencyMs) ? `${latencyMs}ms` : null, message].filter(Boolean).join(" · ");
  return details || fallback;
}

function progressPresentation(phase: Exclude<TestProgressPhase, "idle">, latencyMs?: number | null, message?: string | null) {
  if (phase === "running") return { Icon: Loader2, tone: "border-primary/30 bg-primary/5 text-primary", label: "Teste em andamento…", detail: "Adicionando ao histórico assim que terminar", spinning: true };
  if (phase === "completed") return { Icon: CheckCircle2, tone: "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400", label: "Teste concluído", detail: completedDetail(latencyMs, message, "Histórico atualizado"), spinning: false };
  return { Icon: XCircle, tone: "border-destructive/30 bg-destructive/5 text-destructive", label: "Teste falhou", detail: completedDetail(latencyMs, message, "Veja detalhes no histórico"), spinning: false };
}

/**
 * Inline status strip rendered in the connection card while a manual test runs
 * and briefly afterwards. Communicates: started → completed/failed, then
 * auto-fades. Pairs with the optimistic placeholder in ConnectionTestHistoryPanel.
 */
export function TestProgressIndicator({
  phase,
  latencyMs,
  message,
  autoDismissMs = 3500,
  onDismiss,
  className,
}: Props) {
  const [visible, setVisible] = useState(phase !== "idle");

  useEffect(() => {
    if (phase === "idle") {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (phase === "running") return; // never auto-dismiss while running
    const t = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, autoDismissMs);
    return () => clearTimeout(t);
  }, [phase, autoDismissMs, onDismiss]);

  if ((!visible || phase === "idle")) return null;

  const { Icon, tone, label, detail, spinning } = progressPresentation(phase, latencyMs, message);

  return (
    (<div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200",
        tone,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", spinning && "animate-spin")} aria-hidden />
      <span className="font-medium">{label}</span>
      {detail && (
        <span className="text-[11px] opacity-80 truncate">— {detail}</span>
      )}
    </div>)
  );
}
