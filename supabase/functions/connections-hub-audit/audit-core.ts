export interface EdgeProbeResult {
  ok: boolean;
  detail: string;
}

export interface CronEvidence {
  active: boolean;
  last_status: string | null;
  last_run_at: string | null;
}

export function isCronEvidenceHealthy(
  evidence: CronEvidence | undefined,
  maxAgeMinutes: number,
  nowMs = Date.now(),
): boolean {
  if (
    !evidence?.active || evidence.last_status !== "succeeded" ||
    !evidence.last_run_at
  ) {
    return false;
  }
  const lastRunMs = Date.parse(evidence.last_run_at);
  return Number.isFinite(lastRunMs) &&
    lastRunMs >= nowMs - Math.max(1, maxAgeMinutes) * 60 * 1000;
}

export function classifyEdgeProbe(status: number): EdgeProbeResult {
  if (status === 404) return { ok: false, detail: "não implantada (HTTP 404)" };
  if (status >= 200 && status < 500 && status !== 429) {
    return { ok: true, detail: `endpoint respondeu HTTP ${status}` };
  }
  return { ok: false, detail: `endpoint indisponível (HTTP ${status})` };
}

export async function probeEdgeFunction(
  projectUrl: string,
  serviceKey: string,
  functionName: string,
  fetcher: typeof fetch = fetch,
): Promise<EdgeProbeResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetcher(
      `${projectUrl.replace(/\/$/, "")}/functions/v1/${functionName}`,
      {
        method: "OPTIONS",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Access-Control-Request-Method": "POST",
          Origin: projectUrl,
        },
        signal: controller.signal,
      },
    );
    return classifyEdgeProbe(response.status);
  } catch (error) {
    const detail = error instanceof Error && error.name === "AbortError"
      ? "timeout ao consultar endpoint"
      : "falha de rede ao consultar endpoint";
    return { ok: false, detail };
  } finally {
    clearTimeout(timeout);
  }
}
