import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ConnectionType, ErrorKind } from "./useConnectionTester";
import { inferErrorKind } from "@/lib/error-kind-inference";

export interface TestDetails {
  id: string;
  tested_at: string;
  ok: boolean;
  triggered_by: "manual" | "cron" | "webhook";
  triggered_by_user_email?: string | null;
  request: { method: string | null; url: string | null };
  response: {
    status: number | null;
    headers: Record<string, string> | null;
    body: string | null;
    truncated: boolean;
  };
  timing: {
    latency_ms: number | null;
    dns_ms: number | null;
    tcp_ms: number | null;
    tls_ms: number | null;
    ttfb_ms: number | null;
    download_ms: number | null;
  };
  error?: { kind: ErrorKind | null; message: string | null; timeout_ms?: number | null } | null;
}

interface Args {
  open: boolean;
  type: ConnectionType;
  envKey?: "promobrind" | "crm";
  connectionId?: string;
  /** Quando presente, busca este registro específico em vez do mais recente. */
  historyId?: string;
}

function inferLegacyErrorKind(details: TestDetails | null): TestDetails | null {
  if (!details || details.ok || !details.error || details.error.kind) return details;
  details.error.kind = inferErrorKind({
    errorKind: null,
    errorMessage: details.error.message ?? null,
    statusCode: details.response?.status ?? null,
    success: details.ok,
  });
  return details;
}

/**
 * Carrega o registro completo do último teste para uma conexão (ou de um teste específico via historyId).
 * Refaz a busca toda vez que `open` transita para true ou a chave composta muda.
 */
export function useConnectionTestDetails({ open, type, envKey, connectionId, historyId }: Args) {
  const [details, setDetails] = useState<TestDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqKey = `${type}:${historyId ?? envKey ?? connectionId ?? "*"}`;
  const lastKeyRef = useRef<string | null>(null);

  const fetchDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("connection-tester", {
        body: {
          action: "last_test_full",
          type,
          env_key: envKey,
          connection_id: connectionId,
          id: historyId,
        },
      });
      if (invokeError) throw invokeError;
      const raw = (data?.details ?? null) as TestDetails | null;
      setDetails(inferLegacyErrorKind(raw));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setDetails(null);
    } finally {
      setLoading(false);
    }
  }, [type, envKey, connectionId, historyId]);

  useEffect(() => {
    if (!open) return;
    if (lastKeyRef.current !== reqKey) {
      // Chave mudou — reseta para evitar mostrar dados velhos
      setDetails(null);
    }
    lastKeyRef.current = reqKey;
    fetchDetails();
  }, [open, reqKey, fetchDetails]);

  return { details, loading, error, refetch: fetchDetails };
}
