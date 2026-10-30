import { assertRejects, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assertExternalUrl, ExternalFetchTimeoutError, fetchExternal, InsecureUrlError } from "../_shared/external-fetch.ts";

Deno.test("external-fetch aceita destino HTTPS público", () => {
  assertExternalUrl("https://api.exemplo.com/v1/eventos");
});

Deno.test("external-fetch recusa protocolo inseguro e destinos internos", () => {
  for (const url of [
    "http://api.exemplo.com",
    "https://localhost:54321",
    "https://127.0.0.1",
    "https://10.0.0.5",
    "https://169.254.169.254",
    "https://[::1]",
    "https://usuario:senha@api.exemplo.com",
  ]) {
    assertThrows(() => assertExternalUrl(url), InsecureUrlError);
  }
});

Deno.test("external-fetch cancela uma dependência externa que não responde", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Abortado", "AbortError")));
  });
  try {
    await assertRejects(
      () => fetchExternal("https://api.exemplo.com/lenta", {}, 5),
      ExternalFetchTimeoutError,
      "external_fetch_timeout:5",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
