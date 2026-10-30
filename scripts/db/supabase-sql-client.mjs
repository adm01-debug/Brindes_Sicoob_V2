#!/usr/bin/env node
import process from "node:process";

const MANAGEMENT_API = "https://api.supabase.com";

function assertProjectRef(projectRef) {
  if (!/^[a-z]{20}$/.test(projectRef)) {
    throw new Error("Project ref do Supabase inválido.");
  }
}

function responseRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (payload == null || (typeof payload === "object" && Object.keys(payload).length === 0)) return [];
  throw new Error("Resposta SQL inesperada da Management API.");
}

export function createManagementSqlClient({
  projectRef,
  accessToken,
  readOnly = true,
  fetchImpl = globalThis.fetch,
}) {
  assertProjectRef(projectRef);
  if (!accessToken) throw new Error("SUPABASE_ACCESS_TOKEN não definido.");
  if (typeof fetchImpl !== "function") throw new Error("Runtime sem suporte a fetch.");

  return {
    transport: "management-api",
    async connect() {},
    async end() {},
    async query(query, parameters = []) {
      const response = await fetchImpl(
        `${MANAGEMENT_API}/v1/projects/${projectRef}/database/query`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ query, parameters, read_only: readOnly }),
          signal: AbortSignal.timeout(90_000),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.error === "string" ? payload.error : "resposta sem detalhe";
        throw new Error(`Management API recusou SQL (${response.status}): ${detail}`);
      }
      return { rows: responseRows(payload) };
    },
  };
}

export async function createSupabaseSqlClient({
  projectRef,
  readOnly = true,
  applicationName,
}) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  if (accessToken) {
    return createManagementSqlClient({ projectRef, accessToken, readOnly });
  }

  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Defina SUPABASE_ACCESS_TOKEN ou SUPABASE_DB_URL.");
  }
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    application_name: applicationName,
  });
  client.transport = "postgres";
  return client;
}
