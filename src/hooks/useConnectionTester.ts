import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getErrorCopy } from "@/lib/connection-error-copy";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";

export type ConnectionType = "supabase" | "bitrix24" | "n8n" | "mcp" | "webhook_outbound";
export type ErrorKind =
  | "timeout"
  | "network"
  | "dns"
  | "http"
  | "auth"
  | "config"
  | "unknown";

export interface TestResult {
  ok: boolean;
  status?: number;
  latency_ms?: number;
  error?: string;
  error_kind?: ErrorKind;
  message?: string;
  /** Timeout efetivo (ms) que o backend aplicou neste teste. */
  timeout_ms?: number;
  tested_at?: string;
}

interface TestOptions {
  env_key?: "promobrind" | "crm";
  config?: Record<string, string>;
  connectionId?: string;
  silent?: boolean;
}

interface ResolvedTestOptions {
  config?: Record<string, string>;
  connectionId?: string;
  envKey?: "promobrind" | "crm";
  silent: boolean;
}

function resolveTestOptions(
  optionsOrConfig: TestOptions | Record<string, string>,
  legacyConnectionId?: string,
): ResolvedTestOptions {
  const usesOptions = "config" in optionsOrConfig
    || "env_key" in optionsOrConfig
    || "connectionId" in optionsOrConfig
    || "silent" in optionsOrConfig;
  if (!usesOptions) {
    return {
      config: optionsOrConfig as Record<string, string>,
      connectionId: legacyConnectionId,
      silent: false,
    };
  }
  const options = optionsOrConfig as TestOptions;
  return {
    config: options.config,
    connectionId: options.connectionId ?? legacyConnectionId,
    envKey: options.env_key,
    silent: Boolean(options.silent),
  };
}

function normalizeTestResult(data: unknown): TestResult {
  const response = data as { result?: TestResult } | null;
  const result = response?.result ?? { ok: false };
  return {
    ok: Boolean(result.ok),
    status: result.status,
    latency_ms: result.latency_ms,
    error: result.error,
    error_kind: result.error_kind,
    message: result.message,
    timeout_ms: result.timeout_ms,
    tested_at: result.tested_at ?? new Date().toISOString(),
  };
}

function successDescription(result: TestResult): string {
  if (result.message) return result.message;
  const status = result.status === undefined ? "200" : String(result.status);
  const latency = result.latency_ms === undefined ? "?" : String(result.latency_ms);
  return `${status} em ${latency}ms`;
}

function reportTestResult(
  result: TestResult,
  silent: boolean,
  log: ReturnType<typeof createClientLogger>,
): void {
  if (result.ok) {
    log.info('test_ok', { status: result.status, latency_ms: result.latency_ms });
  } else {
    log.warn('test_failed', { status: result.status, error_kind: result.error_kind, error: result.error });
  }
  if (silent) return;
  if (result.ok) {
    toast.success("Conexão OK", { description: successDescription(result) });
    return;
  }
  const copy = getErrorCopy(result.error_kind, result.status, result.error ?? result.message, result.timeout_ms);
  toast.error(copy.title, { description: copy.hint });
}

export function useConnectionTester() {
  const [isTesting, setIsTesting] = useState(false);
  const [lastResult, setLastResult] = useState<TestResult | null>(null);

  const test = useCallback(async (
    type: ConnectionType,
    optionsOrConfig: TestOptions | Record<string, string> = {},
    legacyConnectionId?: string,
  ): Promise<TestResult> => {
    const options = resolveTestOptions(optionsOrConfig, legacyConnectionId);
    const { config, connectionId: connection_id, envKey: env_key, silent } = options;

    setIsTesting(true);
    const log = createClientLogger('connections.testCredentials', { base: { type, env_key, connection_id } });
    log.info('test_start');
    try {
      const { data, error } = await supabase.functions.invoke("connection-tester", {
        body: { action: "test", type, config, connection_id, env_key },
        headers: log.headers(),
      });
      if (error) throw error;
      const normalized = normalizeTestResult(data);
      setLastResult(normalized);
      reportTestResult(normalized, silent, log);
      return normalized;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      const failed: TestResult = { ok: false, error: msg, error_kind: "unknown", tested_at: new Date().toISOString() };
      setLastResult(failed);
      log.error('test_exception', { err });
      if (!silent) toast.error("Erro ao testar conexão", { description: msg });
      return failed;
    } finally {
      setIsTesting(false);
    }
  }, []);

  const fetchLastTest = useCallback(async (
    type: ConnectionType,
    opts: { env_key?: "promobrind" | "crm"; connectionId?: string } = {},
  ): Promise<{
    tested_at: string | null;
    ok: boolean | null;
    message: string | null;
    latency_ms: number | null;
  } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("connection-tester", {
        body: {
          action: "last_test",
          type,
          env_key: opts.env_key,
          connection_id: opts.connectionId,
        },
      });
      if (error) return null;
      const last = data?.last;
      if (!last) return null;
      return {
        tested_at: last.last_test_at ?? null,
        ok: last.last_test_ok ?? null,
        message: last.last_test_message ?? null,
        latency_ms: last.last_latency_ms ?? null,
      };
    } catch {
      return null;
    }
  }, []);

  return { test, isTesting, lastResult, fetchLastTest };
}
