import { getCorsHeaders } from "./cors.ts";

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function secretsMatch(actual: string, expected: string): Promise<boolean> {
  const [actualDigest, expectedDigest] = await Promise.all([digest(actual), digest(expected)]);
  let difference = actualDigest.length ^ expectedDigest.length;
  const size = Math.max(actualDigest.length, expectedDigest.length);
  for (let index = 0; index < size; index += 1) {
    difference |= (actualDigest[index] ?? 0) ^ (expectedDigest[index] ?? 0);
  }
  return difference === 0;
}

/**
 * Protege funções invocadas somente por cron ou por outra Edge Function.
 * O gateway pode estar com verify_jwt desatualizado; por isso a função sempre
 * valida seu segredo dedicado antes de criar um cliente service_role.
 */
export async function requireInternalService(
  req: Request,
  secretName = "INTERNAL_FUNCTION_SECRET",
): Promise<Response | null> {
  const headers = getCorsHeaders(req);
  const expected = Deno.env.get(secretName);
  if (!expected) {
    return jsonResponse({ error: "servico_nao_configurado" }, 503, headers);
  }

  const provided = req.headers.get("x-sicoob-internal-secret");
  if (!provided || !(await secretsMatch(provided, expected))) {
    return jsonResponse({ error: "credencial_interna_necessaria" }, 401, headers);
  }

  return null;
}
