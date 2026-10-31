import { useCallback, useEffect, useMemo, useState } from "react";
import type { OverviewRow } from "@/hooks/useConnectionsOverview";
import type { ConsecutiveFailureInfo } from "@/hooks/useConsecutiveFailures";
import { CONSECUTIVE_FAILURE_THRESHOLD } from "@/lib/connections-config";

export type OverviewStatusFilter = "all" | "ok" | "fail";
export type OverviewWindowFilter = "any" | "5m" | "1h" | "24h" | "7d" | "never";

export interface OverviewFilters {
  types: string[];
  status: OverviewStatusFilter;
  window: OverviewWindowFilter;
  onlyConsecutiveFailures: boolean;
}

const DEFAULT_FILTERS: OverviewFilters = {
  types: [],
  status: "all",
  window: "any",
  onlyConsecutiveFailures: false,
};

const STORAGE_KEY = "connections-overview-filters";

const WINDOW_MS: Record<Exclude<OverviewWindowFilter, "any" | "never">, number> = {
  "5m": 5 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
};

function matchesTypeAndStatus(row: OverviewRow, filters: OverviewFilters): boolean {
  if (filters.types.length > 0 && !filters.types.includes(row.type)) return false;
  if (filters.status === "ok") return row.last_test_ok === true;
  if (filters.status === "fail") return row.last_test_ok === false;
  return true;
}

function matchesWindow(row: OverviewRow, windowFilter: OverviewWindowFilter, now: number): boolean {
  if (windowFilter === "never") return row.last_test_at === null;
  if (windowFilter === "any") return true;
  if (!row.last_test_at) return false;
  const timestamp = new Date(row.last_test_at).getTime();
  return !Number.isNaN(timestamp) && now - timestamp <= WINDOW_MS[windowFilter];
}

function matchesFailureCount(row: OverviewRow, filters: OverviewFilters, failures?: Map<string, ConsecutiveFailureInfo>): boolean {
  if (!filters.onlyConsecutiveFailures) return true;
  const info = failures?.get(row.key);
  return Boolean(info && info.count >= CONSECUTIVE_FAILURE_THRESHOLD);
}

export function applyFilters(
  rows: OverviewRow[],
  filters: OverviewFilters,
  consecutiveFailuresMap?: Map<string, ConsecutiveFailureInfo>,
  now: number = Date.now(),
): OverviewRow[] {
  return rows.filter(row => matchesTypeAndStatus(row, filters)
    && matchesWindow(row, filters.window, now)
    && matchesFailureCount(row, filters, consecutiveFailuresMap));
}

export function useConnectionsOverviewFilters() {
  const [filters, setFilters] = useState<OverviewFilters>(() => {
    if (typeof window === "undefined") return DEFAULT_FILTERS;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_FILTERS;
      const parsed = JSON.parse(raw);
      return {
        types: Array.isArray(parsed.types) ? parsed.types : [],
        status: ["all", "ok", "fail"].includes(parsed.status) ? parsed.status : "all",
        window: ["any", "5m", "1h", "24h", "7d", "never"].includes(parsed.window) ? parsed.window : "any",
        onlyConsecutiveFailures: typeof parsed.onlyConsecutiveFailures === "boolean" ? parsed.onlyConsecutiveFailures : false,
      };
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore quota / privacy errors
    }
  }, [filters]);

  const toggleType = useCallback((type: string) => {
    setFilters((f) => ({
      ...f,
      types: f.types.includes(type) ? f.types.filter((t) => t !== type) : [...f.types, type],
    }));
  }, []);

  const setStatus = useCallback((status: OverviewStatusFilter) => {
    setFilters((f) => ({ ...f, status }));
  }, []);

  const setWindow = useCallback((window: OverviewWindowFilter) => {
    setFilters((f) => ({ ...f, window }));
  }, []);

  const removeType = useCallback((type: string) => {
    setFilters((f) => ({ ...f, types: f.types.filter((t) => t !== type) }));
  }, []);

  const setOnlyConsecutiveFailures = useCallback((value: boolean) => {
    setFilters((f) => ({ ...f, onlyConsecutiveFailures: value }));
  }, []);

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const activeCount = useMemo(() => {
    let n = filters.types.length;
    if (filters.status !== "all") n += 1;
    if (filters.window !== "any") n += 1;
    if (filters.onlyConsecutiveFailures) n += 1;
    return n;
  }, [filters]);

  return { filters, setFilters, toggleType, setStatus, setWindow, removeType, setOnlyConsecutiveFailures, reset, activeCount };
}
