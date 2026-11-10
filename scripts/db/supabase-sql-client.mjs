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
      const body = await response.text().catch(() => "");
      let payload = null;
      let parsed = false;
      try {
        payload = JSON.parse(body);
        parsed = true;
      } catch {
        // corpo vazio ou não-JSON (ex.: HTML de proxy)
      }
      if (!response.ok) {
        const detail = typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.error === "string" ? payload.error : "resposta sem detalhe";
        throw new Error(`Management API recusou SQL (${response.status}): ${detail}`);
      }
      // 2xx sem JSON não é "zero linhas": virava `applied: 0, pending: N` num `--check` verde.
      if (!parsed) {
        throw new Error(`Resposta SQL inválida da Management API (HTTP ${response.status}): o corpo não é JSON.`);
      }
      return { rows: responseRows(payload) };
    },
  };
}

/**
 * A conexão direta precisa apontar ao projeto pedido (host `db.<ref>.supabase.co` com usuário
 * `postgres`, ou pooler com usuário `postgres.<ref>`). Antes, qualquer SUPABASE_DB_URL/DATABASE_URL
 * era aceita e os relatórios ainda afirmavam o `project_ref` oficial. Não ecoa a connection string.
 */
export function assertConnectionTargetsProject(connectionString, projectRef) {
  assertProjectRef(projectRef);
  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("SUPABASE_DB_URL inválida.");
  }
  const user = decodeURIComponent(parsed.username);
  const direct = parsed.hostname === `db.${projectRef}.supabase.co` && user === "postgres";
  const pooler = parsed.hostname.endsWith(".pooler.supabase.com") && user === `postgres.${projectRef}`;
  if (!["postgres:", "postgresql:"].includes(parsed.protocol) || (!direct && !pooler)) {
    throw new Error(`A conexão deve apontar ao projeto ${projectRef}.`);
  }
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

  // Só SUPABASE_DB_URL: `DATABASE_URL` é um nome genérico que pode apontar para qualquer banco.
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error("Defina SUPABASE_ACCESS_TOKEN ou SUPABASE_DB_URL.");
  }
  assertConnectionTargetsProject(connectionString, projectRef);
  const { default: pg } = await import("pg");
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    application_name: applicationName,
  });
  client.transport = "postgres";
  return client;
}
