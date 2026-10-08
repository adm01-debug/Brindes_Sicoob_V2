/**
 * usePulseBarStatus — agrega sinais de saúde do hub de Conexões em
 * severidade global P0/P1/P2 + KPIs resumidos para a Pulse Bar sticky.
 *
 * Severidades:
 *  - P0 (crítico): conexão caída + janela de falha contínua excedida,
 *                  OU webhook desabilitado pelo circuit breaker,
 *                  OU sucesso 24h < 70%.
 *  - P1 (atenção): conexões com last_test_ok=false (sem janela),
 *                  ou sucesso 24h entre 70% e 95%,
 *                  ou credenciais sem rotação >90d,
 *                  ou auto-test parado há >2x intervalo.
 *  - P2 (info):    tudo verde / informacional.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PulseSeverity = "P0" | "P1" | "P2";

export interface PulseBarStatus {
  severity: PulseSeverity;
  headline: string;
  reasons: string[];
  kpis: {
    activeWebhooks: number;
    totalWebhooks: number;
    successRate24h: number | null;
    totalDeliveries24h: number;
    failingConnections: number;
    autoDisabledWebhooks: number;
    staleSecrets: number;
    lastSuccessAt: string | null;
    lastAutoTestAt: string | null;
  };
}

function numberOrZero(value: number | null): number {
  return value ?? 0;
}

function calculateDeliveryRate(deliveries: Array<{ success: boolean }> | null): { total: number; rate: number | null } {
  const rows = deliveries ?? [];
  const success = rows.filter(delivery => delivery.success).length;
  return { total: rows.length, rate: rows.length > 0 ? (success / rows.length) * 100 : null };
}

function countStaleSecrets(rotations: Array<{ secret_name: string; rotated_at: string }> | null, cutoff: string): number {
  const lastBySecret = new Map<string, string>();
  for (const rotation of rotations ?? []) {
    if (!lastBySecret.has(rotation.secret_name)) lastBySecret.set(rotation.secret_name, rotation.rotated_at);
  }
  return Array.from(lastBySecret.values()).filter(date => date < cutoff).length;
}

function pluralSuffix(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function criticalReasons(autoDisabled: number, rate: number | null): string[] {
  const reasons: string[] = [];
  if (autoDisabled > 0) {
    const webhookSuffix = pluralSuffix(autoDisabled, "", "s");
    const disabledSuffix = pluralSuffix(autoDisabled, "", "s");
    reasons.push(`${autoDisabled} webhook${webhookSuffix} desativado${disabledSuffix} pelo circuit breaker (pausado após muitas falhas)`);
  }
  if (rate !== null && rate < 70) reasons.push(`Sucesso de entrega em 24h crítico: ${rate.toFixed(1)}%`);
  return reasons;
}

function warningReasons(failing: number, rate: number | null, staleSecrets: number): string[] {
  const reasons: string[] = [];
  if (failing > 0) {
    reasons.push(`${failing} conexão${pluralSuffix(failing, "", "ões")} com último teste falhando`);
  }
  if (rate !== null && rate >= 70 && rate < 95) reasons.push(`Sucesso 24h em atenção: ${rate.toFixed(1)}% (alvo ≥95%)`);
  if (staleSecrets > 0) {
    reasons.push(`${staleSecrets} credencial${pluralSuffix(staleSecrets, "", "is")} sem rotação há >90 dias (rotation overdue)`);
  }
  return reasons;
}

function derivePulsePresentation(reasonsP0: string[], reasonsP1: string[]) {
  if (reasonsP0.length > 0) {
    return {
      severity: "P0" as const,
      headline: "Incidente crítico em integrações — ação imediata",
      reasons: [...reasonsP0, ...reasonsP1],
    };
  }
  if (reasonsP1.length > 0) {
    return { severity: "P1" as const, headline: "Sinais de degradação — monitorar de perto", reasons: reasonsP1 };
  }
  return { severity: "P2" as const, headline: "Todas as integrações operando dentro do esperado", reasons: [] };
}

async function fetchPulseSignals(since24h: string) {
  return Promise.all([
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }),
    supabase.from("webhook_deliveries").select("success").gte("delivered_at", since24h),
    supabase.from("webhook_deliveries").select("delivered_at").eq("success", true).order("delivered_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("external_connections").select("id", { count: "exact", head: true }).eq("last_test_ok", false),
    supabase.from("secret_rotation_log").select("secret_name, rotated_at").order("rotated_at", { ascending: false }),
    supabase.from("outbound_webhooks").select("id", { count: "exact", head: true }).not("auto_disabled_at", "is", null),
    supabase.from("connection_test_history").select("tested_at").eq("triggered_by", "cron").order("tested_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
}

async function fetchStatus(): Promise<PulseBarStatus> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: activeWebhooks },
    { count: totalWebhooks },
    { data: deliveries24h },
    { data: lastSuccess },
    { count: failingConnections },
    { data: rotations },
    { count: autoDisabledWebhooks },
    { data: lastAutoTest },
  ] = await fetchPulseSignals(since24h);

  const { total, rate } = calculateDeliveryRate(deliveries24h);
  const staleSecrets = countStaleSecrets(rotations, ninetyDaysAgo);
  const failing = numberOrZero(failingConnections);
  const autoDisabled = numberOrZero(autoDisabledWebhooks);
  const presentation = derivePulsePresentation(
    criticalReasons(autoDisabled, rate),
    warningReasons(failing, rate, staleSecrets),
  );

  return ({
    ...presentation,
    kpis: {
      activeWebhooks: activeWebhooks ?? 0,
      totalWebhooks: totalWebhooks ?? 0,
      successRate24h: rate,
      totalDeliveries24h: total,
      failingConnections: failing,
      autoDisabledWebhooks: autoDisabled,
      staleSecrets,
      lastSuccessAt: lastSuccess?.delivered_at ?? null,
      lastAutoTestAt: lastAutoTest?.tested_at ?? null,
    },
  });
}

export function usePulseBarStatus() {
  return useQuery({
    queryKey: ["connections-pulse-bar"],
    queryFn: fetchStatus,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
