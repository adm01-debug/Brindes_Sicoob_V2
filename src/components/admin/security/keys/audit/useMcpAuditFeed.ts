/**
 * Hook do feed de auditoria de chaves MCP.
 * Lê admin_audit_log filtrado por resource_type='mcp_api_key', cruza com profiles
 * para exibir email do ator. Suporta filtros de ação, ator, período, keyId, "só FULL".
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "mcp_key.issued"
  | "mcp_key.rotated"
  | "mcp_key.updated"
  | "mcp_key.revoked"
  | "mcp_key.scope_escalated"
  | "mcp_key.issue_denied"
  | "mcp_key.issue_error"
  | "mcp_key.revoke_denied"
  | "mcp_key.revoke_error"
  | "mcp_key.update_denied"
  | "mcp_key.update_error"
  | "mcp_key.rotate_denied"
  | "mcp_key.rotate_error"
  | "mcp_tool.granted"
  | "mcp_tool.denied"
  | "mcp_tool.error";

export interface AuditFeedRow {
  id: string;
  action: AuditAction | string;
  user_id: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  // Novos campos enriquecidos
  request_id?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  duration_ms?: number | null;
  status?: "success" | "error" | "denied" | "partial" | null;
  payload_summary?: Record<string, unknown> | null;
  source?: string | null;
  // Derivados
  actor_email?: string | null;
  actor_name?: string | null;
  key_prefix?: string | null;
  is_full?: boolean;
  escalated?: boolean;
}

export interface AuditFilters {
  action: "all" | AuditAction;
  query: string;
  onlyFull: boolean;
  keyId?: string;
  fromDate?: string;
}

const PAGE_SIZE = 50;

type AuditProfiles = Record<string, { email?: string | null; full_name?: string | null }>;

async function fetchAuditProfiles(rows: AuditFeedRow[]): Promise<AuditProfiles> {
  const userIds = [...new Set(rows.flatMap((row) => row.user_id ? [row.user_id] : []))];
  if (userIds.length === 0) return {};
  const { data } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", userIds);
  return Object.fromEntries((data ?? []).map((profile) => [profile.user_id, { email: profile.email, full_name: profile.full_name }]));
}

function auditScopes(details: Record<string, unknown>): string[] {
  const after = details.after && typeof details.after === "object" && !Array.isArray(details.after)
    ? details.after as Record<string, unknown>
    : {};
  const rawScopes = details.scopes ?? after.scopes;
  return Array.isArray(rawScopes) ? rawScopes.map(String) : [];
}

function enrichAuditRow(row: AuditFeedRow, profiles: AuditProfiles): AuditFeedRow {
  const details = row.details ?? {};
  const profile = row.user_id ? profiles[row.user_id] : undefined;
  const scopes = auditScopes(details);
  return {
    ...row,
    actor_email: profile?.email ?? null,
    actor_name: profile?.full_name ?? null,
    key_prefix: details.key_prefix as string | undefined ?? null,
    is_full: scopes.includes("*") || details.is_full_access === true,
    escalated: details.escalated_to_full === true || row.action === "mcp_key.scope_escalated",
  };
}

function filterAuditRows(rows: AuditFeedRow[], filters: AuditFilters): AuditFeedRow[] {
  return rows.filter((row) => {
    if (filters.onlyFull && !row.is_full) return false;
    if (!filters.query) return true;
    const query = filters.query.toLowerCase();
    const searchable = `${row.actor_email ?? ""} ${row.actor_name ?? ""} ${row.key_prefix ?? ""} ${row.action}`.toLowerCase();
    return searchable.includes(query);
  });
}

function auditCounts(rows: AuditFeedRow[]) {
  return {
    total: rows.length,
    issued: rows.filter((row) => row.action === "mcp_key.issued").length,
    rotated: rows.filter((row) => row.action === "mcp_key.rotated").length,
    updated: rows.filter((row) => row.action === "mcp_key.updated").length,
    revoked: rows.filter((row) => row.action === "mcp_key.revoked").length,
    escalated: rows.filter((row) => row.escalated).length,
  };
}

export function useMcpAuditFeed() {
  const [rows, setRows] = useState<AuditFeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilters>({
    action: "all",
    query: "",
    onlyFull: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("admin_audit_log")
      .select("id, action, user_id, resource_id, ip_address, user_agent, details, created_at, request_id, started_at, finished_at, duration_ms, status, payload_summary, source")
      .eq("resource_type", "mcp_api_key")
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE * 4);

    if (filters.action !== "all") q = q.eq("action", filters.action);
    if (filters.keyId) q = q.eq("resource_id", filters.keyId);
    if (filters.fromDate) q = q.gte("created_at", filters.fromDate);

    const { data, error } = await q;
    if (error) {
      setRows([]);
      setLoading(false);
      return;
    }

    const base = (data ?? []) as AuditFeedRow[];
    const profiles = await fetchAuditProfiles(base);
    const enriched = base.map((row) => enrichAuditRow(row, profiles));

    setRows(enriched);
    setLoading(false);
  }, [filters.action, filters.keyId, filters.fromDate]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => filterAuditRows(rows, filters), [rows, filters]);
  const counts = useMemo(() => auditCounts(rows), [rows]);

  return { rows: filtered, allRows: rows, loading, filters, setFilters, counts, reload: load };
}
