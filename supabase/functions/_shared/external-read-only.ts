/** Contrato de leitura do catálogo: nenhuma permissão de usuário libera escrita. */
export const CATALOG_ORIGIN = "https://doufsxqlfjyuvxuezpln.supabase.co";

export function isReadOnlyCatalogRequest(body: Record<string, unknown>): boolean {
  if (body.operation === "select" || body.operation === "ping" || body.operation === "rpc") return true;
  if (body.operation !== "batch" || !Array.isArray(body.queries) || body.queries.length === 0) return false;
  return body.queries.length <= 10 && body.queries.every((query: unknown) => {
    if (!query || typeof query !== "object" || Array.isArray(query)) return false;
    const item = query as Record<string, unknown>;
    return (item.operation === undefined || item.operation === "select") && typeof item.table === "string" && item.table.length > 0;
  });
}

/** A origem e o método são conferidos antes de encaminhar qualquer credencial. */
export function createReadOnlyCatalogFetch(transport: typeof fetch = fetch): typeof fetch {
  return (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (url.origin !== CATALOG_ORIGIN || !url.pathname.startsWith("/rest/v1/") || !["GET", "HEAD"].includes(method)) {
      throw new Error("CATALOG_READ_ONLY: acesso externo fora do contrato de consulta");
    }
    return transport(input, { ...init, redirect: "error" });
  };
}
