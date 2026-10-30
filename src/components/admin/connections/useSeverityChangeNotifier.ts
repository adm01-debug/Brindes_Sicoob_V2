/**
 * useSeverityChangeNotifier — Onda 14
 *
 * Observa a severidade global da Pulse Bar (P0/P1/P2) e dispara um toast
 * quando ela escala para P0 ou P1, com confirmação explícita do usuário
 * para não repetir o mesmo alerta indefinidamente.
 *
 * Regras de deduplicação:
 *  - Cada nível P0/P1 só dispara um toast novo se:
 *      (a) for a primeira vez na sessão, OU
 *      (b) o usuário "Reconheceu" (acked) e a severidade voltou para P2
 *          em algum momento entre disparos (reset implícito).
 *  - "Adiar 1h" silencia o nível por 60min (snooze por severidade).
 *  - "Não mostrar de novo" persiste opt-out em localStorage por severidade.
 *  - Estado persistido em localStorage para sobreviver a reload.
 *
 * Não dispara em:
 *  - P2 (estável)
 *  - Mudança de P0→P1 (downgrade) — apenas escalations geram toast
 *  - Loading inicial (data === undefined)
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { usePulseBarStatus, type PulseSeverity } from "./usePulseBarStatus";

const STORAGE_KEY = "connections.severity-notifier.v1";
const SNOOZE_MS = 60 * 60 * 1000; // 1h

interface NotifierState {
  /** Última severidade vista (para detectar transições) */
  lastSeen: PulseSeverity | null;
  /** Severidades reconhecidas — não re-disparam até voltar a P2 */
  acked: { P0: boolean; P1: boolean };
  /** Snooze até timestamp (ms) por severidade */
  snoozedUntil: { P0: number; P1: number };
  /** Opt-out permanente por severidade */
  muted: { P0: boolean; P1: boolean };
}

const DEFAULT_STATE: NotifierState = {
  lastSeen: null,
  acked: { P0: false, P1: false },
  snoozedUntil: { P0: 0, P1: 0 },
  muted: { P0: false, P1: false },
};

function loadState(): NotifierState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<NotifierState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      acked: { ...DEFAULT_STATE.acked, ...(parsed.acked ?? {}) },
      snoozedUntil: { ...DEFAULT_STATE.snoozedUntil, ...(parsed.snoozedUntil ?? {}) },
      muted: { ...DEFAULT_STATE.muted, ...(parsed.muted ?? {}) },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(s: NotifierState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

const SEV_TITLE: Record<"P0" | "P1", string> = {
  P0: "🚨 Incidente crítico em integrações (P0)",
  P1: "⚠️ Degradação detectada em integrações (P1)",
};

function updateLastSeen(state: NotifierState, severity: PulseSeverity): PulseSeverity | null {
  const previous = state.lastSeen;
  if (previous === severity) return previous;
  if (severity === "P2") state.acked = { P0: false, P1: false };
  state.lastSeen = severity;
  saveState(state);
  return previous;
}

function isAlertSeverity(severity: PulseSeverity): severity is "P0" | "P1" {
  return severity === "P0" || severity === "P1";
}

function shouldNotify(state: NotifierState, severity: "P0" | "P1", previous: PulseSeverity | null): boolean {
  if (state.muted[severity] || state.acked[severity]) return false;
  if (Date.now() < state.snoozedUntil[severity]) return false;
  return previous === null || previous !== severity;
}

function showSeverityToast(severity: "P0" | "P1", state: NotifierState, headline: string, reason: string) {
  return toast(SEV_TITLE[severity], ({
    description: `${headline}\n${reason}`,
    duration: severity === "P0" ? Infinity : 30_000,
    action: {
      label: "Reconhecer",
      onClick: () => {
        state.acked[severity] = true;
        saveState(state);
        toast.success(`Alerta ${severity} reconhecido. Não será repetido até retornar a P2.`);
      },
    },
    cancel: {
      label: "Adiar 1h",
      onClick: () => {
        state.snoozedUntil[severity] = Date.now() + SNOOZE_MS;
        saveState(state);
        toast.message(`Alerta ${severity} adiado por 1h.`, {
          action: {
            label: "Não mostrar mais",
            onClick: () => {
              state.muted[severity] = true;
              saveState(state);
              toast.success(`Alertas ${severity} silenciados nesta sessão. Reative em Conexões.`);
            },
          },
        });
      },
    },
  }));
}

export function useSeverityChangeNotifier() {
  const { data } = usePulseBarStatus();
  const stateRef = useRef<NotifierState>(loadState());

  useEffect(() => {
    if (!data) return;
    const sev = data.severity;
    const state = stateRef.current;
    const prev = updateLastSeen(state, sev);

    if (!isAlertSeverity(sev)) return;
    if (!shouldNotify(state, sev, prev)) return;
    const headline = data.headline;
    const reason = (data.reasons[0] ?? "Veja detalhes na barra de status");
    const toastId = showSeverityToast(sev, state, headline, reason);

    return () => {
      toast.dismiss(toastId);
    };
  }, [data]);
}

/** Helper exposto para reativar manualmente (futuro: settings panel) */
export function resetSeverityNotifierState() {
  saveState({ ...DEFAULT_STATE });
}
