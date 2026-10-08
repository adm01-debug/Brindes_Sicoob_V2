/**
 * Hook para listar tentativas de concessão FULL bloqueadas por step-up.
 * Filtra admin_audit_log por resource_type='mcp_api_key', status='denied' e
 * details.reason ∈ {step_up_required, step_up_invalid}. Suporta filtros por
 * usuário (email/nome/uid) e por chave (resource_id).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StepUpReason = "step_up_required" | "step_up_invalid";

export interface StepUpAttemptRow {
  id: string;
  action: string;
  user_id: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  request_id?: string | null;
  source?: string | null;
  // derivados
  reason: StepUpReason | string;
  scope?: string | null;
  detail?: string | null;
  expected_action?: string | null;
  actor_email?: string | null;
  actor_name?: string | null;
  key_prefix?: string | null;
  key_name?: string | null;
}

export interface StepUpFilters {
  reason: "all" | StepUpReason;
  userQuery: string;
  keyId: string;
  fromDate?: string;
}

const REASONS: StepUpReason[] = ["step_up_required", "step_up_invalid"];
const ACTIONS = [
  "mcp_key.issue_denied",
  "mcp_key.rotate_denied",
  "mcp_key.update_denied",
];

type BaseAttempt = Omit<StepUpAttemptRow, "reason">;
type ProfileMap = Record<string, { email?: string | null; full_name?: string | null }>;
type KeyMap = Record<string, { name?: string | null; key_prefix?: string | null }>;

function stepUpRows(rows: BaseAttempt[]): BaseAttempt[] {
  return rows.filter((row) => {
    const reason = row.details?.reason;
    return typeof reason === "string" && REASONS.includes(reason as StepUpReason);
  });
}

async function fetchProfiles(userIds: string[]): Promise<ProfileMap> {
  if (userIds.length === 0) return {};
  const { data } = await supabase.from("profiles").select("user_id, email, full_name").in("user_id", userIds);
  return Object.fromEntries((data ?? []).map((profile) => [profile.user_id, { email: profile.email, full_name: profile.full_name }]));
}

async function fetchKeys(keyIds: string[]): Promise<KeyMap> {
  if (keyIds.length === 0) return {};
  const { data } = await supabase.from("mcp_api_keys").select("id, name, key_prefix").in("id", keyIds);
  return Object.fromEntries((data ?? []).map((key) => [key.id, { name: key.name, key_prefix: key.key_prefix }]));
}

async function fetchAttemptLookups(rows: BaseAttempt[]) {
  const userIds = [...new Set(rows.flatMap((row) => row.user_id ? [row.user_id] : []))];
  const keyIds = [...new Set(rows.flatMap((row) => row.resource_id ? [row.resource_id] : []))];
  const [profiles, keys] = await Promise.all([fetchProfiles(userIds), fetchKeys(keyIds)]);
  return { profiles, keys };
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function enrichAttempt(row: BaseAttempt, profiles: ProfileMap, keys: KeyMap): StepUpAttemptRow {
  const details = row.details ?? {};
  const profile = row.user_id ? profiles[row.user_id] : undefined;
  const key = row.resource_id ? keys[row.resource_id] : undefined;
  const profileValues = profile || {};
  const keyValues = key || {};
  return {
    ...row,
    reason: String(details.reason || "") as StepUpReason,
    scope: nullableString(details.scope),
    detail: nullableString(details.detail),
    expected_action: nullableString(details.expected_action),
    actor_email: nullableString(profileValues.email),
    actor_name: nullableString(profileValues.full_name),
    key_prefix: nullableString(keyValues.key_prefix),
    key_name: nullableString(keyValues.name),
  };
}

function filterAttempts(rows: StepUpAttemptRow[], filters: StepUpFilters): StepUpAttemptRow[] {
  return rows.filter((row) => {
    if (filters.reason !== "all" && row.reason !== filters.reason) return false;
    if (!filters.userQuery) return true;
    const query = filters.userQuery.toLowerCase();
    const searchable = `${row.actor_email ?? ""} ${row.actor_name ?? ""} ${row.user_id ?? ""}`.toLowerCase();
    return searchable.includes(query);
  });
}

function attemptCounts(rows: StepUpAttemptRow[]) {
  return {
    total: rows.length,
    required: rows.filter((row) => row.reason === "step_up_required").length,
    invalid: rows.filter((row) => row.reason === "step_up_invalid").length,
    issue: rows.filter((row) => row.action === "mcp_key.issue_denied").length,
    rotate: rows.filter((row) => row.action === "mcp_key.rotate_denied").length,
    update: rows.filter((row) => row.action === "mcp_key.update_denied").length,
  };
}

export function useStepUpAttempts() {
  const [allRows, setAllRows] = useState<StepUpAttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<StepUpFilters>({
    reason: "all",
    userQuery: "",
    keyId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("admin_audit_log")
      .select("id, action, user_id, resource_id, ip_address, user_agent, details, created_at, request_id, source, status")
      .eq("resource_type", "mcp_api_key")
      .eq("status", "denied")
      .in("action", ACTIONS)
      .order("created_at", { ascending: false })
      .limit(200);

    if (filters.fromDate) q = q.gte("created_at", filters.fromDate);
    if (filters.keyId) q = q.eq("resource_id", filters.keyId);

    const { data, error } = await q;
    if (error) {
      setAllRows([]);
      setLoading(false);
      return;
    }

    const onlyStepUp = stepUpRows((data ?? []) as BaseAttempt[]);
    const { profiles, keys } = await fetchAttemptLookups(onlyStepUp);
    const enriched = onlyStepUp.map((row) => enrichAttempt(row, profiles, keys));

    setAllRows(enriched);
    setLoading(false);
  }, [filters.fromDate, filters.keyId]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => filterAttempts(allRows, filters), [allRows, filters]);
  const counts = useMemo(() => attemptCounts(allRows), [allRows]);

  return { rows, allRows, loading, filters, setFilters, counts, reload: load };
}
