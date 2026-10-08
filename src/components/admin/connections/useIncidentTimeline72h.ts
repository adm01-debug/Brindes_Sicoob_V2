/**
 * useIncidentTimeline72h — Onda 14
 *
 * Busca incidentes/alterações de status nas últimas 72h para alimentar
 * uma timeline horizontal compacta abaixo da Pulse Bar.
 *
 * Fontes:
 *   1. workspace_notifications (category='integrations') — alertas formais
 *      já com severidade/kind em metadata.
 *   2. connection_test_history (success=false) — eventos brutos.
 *
 * Severidade derivada igual a useRecentIncidents (P0/P1/P2).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IncidentSeverity } from "./useRecentIncidents";

export interface TimelineEvent {
  id: string;
  severity: IncidentSeverity;
  occurredAt: string;
  /** posição relativa 0..1 dentro da janela (0 = mais antigo, 1 = agora) */
  position: number;
  title: string;
  subtitle?: string | null;
  kind?: string | null;
  entityId?: string | null;
}

interface NotifRow {
  id: string;
  title: string;
  message: string;
  type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface TestRow {
  id: string;
  connection_id: string;
  tested_at: string;
  error_message: string | null;
  error_kind: string | null;
}

const WINDOW_MS = 72 * 60 * 60 * 1000;

function severityFromNotification(row: NotifRow): IncidentSeverity {
  const severity = String(row.metadata?.severity ?? "").toUpperCase();
  if (["P0", "P1", "P2"].includes(severity)) return severity as IncidentSeverity;
  const kind = String(row.metadata?.kind ?? "");
  if (["webhook_auto_disabled", "connection_down"].includes(kind)) return "P0";
  if (row.type === "error") return "P0";
  if (["warning", "secret_stale"].includes(row.type) || kind === "secret_stale") return "P1";
  return "P2";
}

function severityFromTestKind(errorKind: string | null): IncidentSeverity {
  if (!errorKind) return "P1";
  if (["auth", "http_5xx", "platform_error"].includes(errorKind)) return "P0";
  return "P1";
}

function notificationEntity(metadata: Record<string, unknown>): string | null {
  return (metadata.connection_id as string) ?? (metadata.webhook_id as string) ?? null;
}

function toNotificationEvent(row: NotifRow, windowStart: number): TimelineEvent {
  const metadata = row.metadata ?? {};
  const timestamp = new Date(row.created_at).getTime();
  return {
    id: `notif:${row.id}`,
    severity: severityFromNotification(row),
    occurredAt: row.created_at,
    position: Math.min(1, Math.max(0, (timestamp - windowStart) / WINDOW_MS)),
    title: row.title,
    subtitle: row.message,
    kind: (metadata.kind as string) ?? null,
    entityId: notificationEntity(metadata),
  };
}

function toTestEvent(row: TestRow, windowStart: number): TimelineEvent {
  const timestamp = new Date(row.tested_at).getTime();
  const kindSuffix = row.error_kind ? ` (${row.error_kind})` : "";
  return {
    id: `test:${row.id}`,
    severity: severityFromTestKind(row.error_kind),
    occurredAt: row.tested_at,
    position: Math.min(1, Math.max(0, (timestamp - windowStart) / WINDOW_MS)),
    title: `Falha em conexão${kindSuffix}`,
    subtitle: row.error_message,
    kind: row.error_kind,
    entityId: row.connection_id,
  };
}

async function fetchTimeline72h(): Promise<{ events: TimelineEvent[]; windowStart: number; windowEnd: number }> {
  const windowEnd = Date.now();
  const windowStart = windowEnd - WINDOW_MS;
  const sinceIso = new Date(windowStart).toISOString();

  const [{ data: notifs }, { data: tests }] = await Promise.all([
    supabase
      .from("workspace_notifications")
      .select("id, title, message, type, metadata, created_at")
      .eq("category", "integrations")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(80),
    supabase
      .from("connection_test_history")
      .select("id, connection_id, tested_at, error_message, error_kind")
      .eq("success", false)
      .gte("tested_at", sinceIso)
      .order("tested_at", { ascending: false })
      .limit(80),
  ]);

  const notificationEvents = ((notifs ?? []) as NotifRow[]).map(row => toNotificationEvent(row, windowStart));
  const coveredEntities = new Set(notificationEvents.map(event => event.entityId).filter(Boolean));
  const testEvents = ((tests ?? []) as TestRow[])
    .filter(row => !coveredEntities.has(row.connection_id))
    .map(row => toTestEvent(row, windowStart));
  const events = [...notificationEvents, ...testEvents];

  // ordena por timestamp asc para render previsível
  events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());

  return { events, windowStart, windowEnd };
}

export function useIncidentTimeline72h() {
  return useQuery({
    queryKey: ["connections-incident-timeline-72h"],
    queryFn: fetchTimeline72h,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
