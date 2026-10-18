import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsMetrics, type FetchSource } from "@/lib/notifications-metrics";
import { createClientLogger } from "@/lib/telemetry/structuredLogger";

const log = createClientLogger("notifications");

export interface WorkspaceNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  category: string;
  is_read: boolean;
  action_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const CACHE_PREFIX = "workspace_notifications_cache:";
const CACHE_TTL_MS = 60_000; // 60s
const PREFETCH_MIN_INTERVAL_MS = 5_000; // 5s

interface CacheEntry {
  cachedAt: number;
  notifications: WorkspaceNotification[];
}

function readCache(userId: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(userId: string, notifications: WorkspaceNotification[]) {
  try {
    const entry: CacheEntry = { cachedAt: Date.now(), notifications };
    sessionStorage.setItem(CACHE_PREFIX + userId, JSON.stringify(entry));
  } catch {
    // ignore quota / serialization issues
  }
}

function isDebugEnabled(): boolean {
  try {
    if (typeof window === "undefined") return false;
    if (window.localStorage?.getItem("debug:notifications") === "1") return true;
    return Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

function debugLog(event: string, payload: Record<string, unknown>) {
  if (!isDebugEnabled()) return;
  log.info(event, payload);
}

function transientNotificationError(message: string) {
  return message.includes('fetch') || message.includes('503');
}

function notificationsChanged(next: WorkspaceNotification[], current: WorkspaceNotification[]) {
  if (next.length !== current.length) return true;
  return next.some((item, index) => {
    const previous = current[index];
    return item.id !== previous?.id || item.is_read !== previous?.is_read;
  });
}

function performanceNow() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function recordNetworkBadge(items: WorkspaceNotification[], mountAt: number, startedAt: number) {
  const elapsedMs = performanceNow() - mountAt;
  const networkMs = Number((performanceNow() - startedAt).toFixed(2));
  const unread = items.filter((item) => !item.is_read).length;
  const payload = {
    source: "network" as const,
    elapsedMs: Number(elapsedMs.toFixed(2)),
    target: "<16ms",
    hit: elapsedMs < 16,
    unreadCount: unread,
    networkMs,
  };
  debugLog("badge-render", payload);
  notificationsMetrics.recordBadgeRender({ ...payload, cacheAgeMs: null });
}

function recordBackgroundRefresh(items: WorkspaceNotification[], startedAt: number, silent: boolean) {
  debugLog("background-refresh", {
    silent,
    networkMs: Number((performanceNow() - startedAt).toFixed(2)),
    unreadCount: items.filter((item) => !item.is_read).length,
  });
}

function setFetchLoading(
  silent: boolean,
  value: boolean,
  setIsLoading: (value: boolean) => void,
  setIsRefetching: (value: boolean) => void,
) {
  if (silent) setIsRefetching(value);
  else setIsLoading(value);
}

function resolveSilentFetch(requested: boolean | undefined, hasData: boolean) {
  return requested ?? hasData;
}

export function useWorkspaceNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);
  // True only while a markAllAsRead/clearAll mutation + its silent re-hydration are in flight.
  // Distinct from isRefetching, which also turns true for polling and prefetch.
  const [isMutationRehydrating, setIsMutationRehydrating] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetchAtRef = useRef<number>(0);
  const hydratedRef = useRef<string | null>(null);
  const mountAtRef = useRef<number>(typeof performance !== "undefined" ? performance.now() : Date.now());
  const badgeSourceRef = useRef<"pending" | "cache" | "network">("pending");
  // Leituras só transitam de não lida para lida. Guardar os IDs confirmados
  // evita que uma resposta de consulta iniciada antes da mutação reabra o badge.
  const readIdsRef = useRef<Set<string>>(new Set());
  // In-flight guards: prevent duplicate fetchNotifications when the user
  // double-clicks markAllAsRead/clearAll before the first call resolves.
  const markAllInFlightRef = useRef(false);
  const clearAllInFlightRef = useRef(false);

  // Hydrate from sessionStorage immediately on user change
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      hydratedRef.current = null;
      readIdsRef.current.clear();
      badgeSourceRef.current = "pending";
      return;
    }
    if (hydratedRef.current === user.id) return;
    hydratedRef.current = user.id;
    const cached = readCache(user.id);
    if (cached) {
      setNotifications(cached.notifications);
      setUnreadCount(cached.notifications.filter((n) => !n.is_read).length);
      const elapsedMs =
        (typeof performance !== "undefined" ? performance.now() : Date.now()) -
        mountAtRef.current;
      badgeSourceRef.current = "cache";
      const cacheAgeMs = Date.now() - cached.cachedAt;
      const unread = cached.notifications.filter((n) => !n.is_read).length;
      debugLog("badge-render", {
        source: "cache",
        elapsedMs: Number(elapsedMs.toFixed(2)),
        target: "<16ms",
        hit: elapsedMs < 16,
        unreadCount: unread,
        cacheAgeMs,
      });
      notificationsMetrics.recordBadgeRender({
        source: "cache",
        elapsedMs: Number(elapsedMs.toFixed(2)),
        cacheAgeMs,
        networkMs: null,
        unreadCount: unread,
        hit: elapsedMs < 16,
      });
    }
  }, [user]);

  // Espelha confirmações entre abas. A atualização no banco continua sendo a
  // fonte de verdade; o canal só mantém a interface das outras abas coerente.
  useEffect(() => {
    if (!user || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`workspace-notifications:${user.id}`);
    channel.onmessage = (event: MessageEvent<{ type?: string; ids?: string[] }>) => {
      const ids = Array.isArray(event.data?.ids) ? event.data.ids.filter((id) => typeof id === "string") : [];
      if (event.data?.type !== "read" || ids.length === 0) return;
      const newlyReadIds = ids.filter((id) => !readIdsRef.current.has(id));
      const unreadInCurrentTab = notifications.filter((notification) =>
        newlyReadIds.includes(notification.id) && !notification.is_read,
      ).length;
      newlyReadIds.forEach((id) => readIdsRef.current.add(id));
      setNotifications((prev) => {
        const next = prev.map((notification) => ids.includes(notification.id)
          ? { ...notification, is_read: true }
          : notification);
        writeCache(user.id, next);
        return next;
      });
      if (unreadInCurrentTab > 0) {
        setUnreadCount((prev) => Math.max(0, prev - unreadInCurrentTab));
      }
    };
    return () => channel.close();
  }, [notifications, user]);

  const fetchNotifications = useCallback(
    async (opts: { silent?: boolean; source?: FetchSource } = {}) => {
      if (!user) return;
      const hasData = notifications.length > 0;
      const silent = resolveSilentFetch(opts.silent, hasData);

      setFetchLoading(silent, true, setIsLoading, setIsRefetching);

      notificationsMetrics.recordFetch(opts.source ?? "initial");
      const t0 = performanceNow();
      try {
        const { data, error } = await supabase
          .from("workspace_notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          // Retry on network errors or transient bridge failures
          if (transientNotificationError(error.message)) {
            await new Promise(r => setTimeout(r, 2000));
            return fetchNotifications({ ...opts, silent: true });
          }
          throw error;
        }
        
        const fetchedItems = (data || []) as WorkspaceNotification[];
        const items = fetchedItems.map((item) => readIdsRef.current.has(item.id)
          ? { ...item, is_read: true }
          : item);
        
        // Only update if data actually changed to prevent shallow-equal re-renders
        const changed = notificationsChanged(items, notifications);
        
        if (changed) {
          setNotifications(items);
          setUnreadCount(items.filter((n) => !n.is_read).length);
          writeCache(user.id, items);
        }
        
        lastFetchAtRef.current = Date.now();
        
        if (badgeSourceRef.current !== "cache") {
          badgeSourceRef.current = "network";
          recordNetworkBadge(items, mountAtRef.current, t0);
        } else {
          recordBackgroundRefresh(items, t0, silent);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setFetchLoading(silent, false, setIsLoading, setIsRefetching);
      }
    },
    [user, notifications] // Added notifications to dependencies for correct comparison
  );

  // Initial fetch (always, but in background if cache hydrated)
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  // Polling every 30s (silent)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchNotifications({ silent: true, source: "polling" });
    }, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Final summary on unmount: emits ONE consolidated `[notifications-metrics:badge-budget-summary]`
  // line with hits/misses/hitRate so QA can eyeball the bell's <16ms budget without
  // scrolling through every individual badge-render log. No-op if debug is OFF.
  useEffect(() => {
    return () => {
      notificationsMetrics.logBadgeBudgetSummary("hook-unmount");
    };
  }, []);

  // Idempotent prefetch: only re-fetches if last fetch >5s ago
  const prefetch = useCallback(async () => {
    if (!user) return;
    if (Date.now() - lastFetchAtRef.current < PREFETCH_MIN_INTERVAL_MS) return;
    await fetchNotifications({ silent: true, source: "prefetch" });
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!user) return;
      const wasUnread = !readIdsRef.current.has(id)
        && notifications.some((notification) => notification.id === id && !notification.is_read);
      const { error } = await supabase
        .from("workspace_notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) return;
      readIdsRef.current.add(id);
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(`workspace-notifications:${user.id}`);
        channel.postMessage({ type: "read", ids: [id] });
        channel.close();
      }
      setNotifications((prev) => {
        const next = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        writeCache(user.id, next);
        return next;
      });
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [notifications, user]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    if (markAllInFlightRef.current) return; // dedupe rapid double-clicks
    markAllInFlightRef.current = true;
    setIsMutationRehydrating(true);
    try {
      const { error } = await supabase
        .from("workspace_notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) return;
      const readIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);
      readIds.forEach((id) => readIdsRef.current.add(id));
      if (readIds.length > 0 && typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel(`workspace-notifications:${user.id}`);
        channel.postMessage({ type: "read", ids: readIds });
        channel.close();
      }
      // Optimistic local update
      setNotifications((prev) => {
        const next = prev.map((n) => ({ ...n, is_read: true }));
        writeCache(user.id, next);
        return next;
      });
      setUnreadCount(0);
      try {
        sessionStorage.removeItem(CACHE_PREFIX + user.id);
      } catch {
        // ignore
      }
      lastFetchAtRef.current = 0;
      await fetchNotifications({ silent: true, source: "mutation" });
    } finally {
      markAllInFlightRef.current = false;
      setIsMutationRehydrating(false);
    }
  }, [user, fetchNotifications, notifications]);

  const clearAll = useCallback(async () => {
    if (!user) return;
    if (clearAllInFlightRef.current) return; // dedupe rapid double-clicks
    clearAllInFlightRef.current = true;
    setIsMutationRehydrating(true);
    try {
      const { error } = await supabase
        .from("workspace_notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) return;
      setNotifications([]);
      setUnreadCount(0);
      writeCache(user.id, []);
      try {
        sessionStorage.removeItem(CACHE_PREFIX + user.id);
      } catch {
        // ignore
      }
      lastFetchAtRef.current = 0;
      await fetchNotifications({ silent: true, source: "mutation" });
    } finally {
      clearAllInFlightRef.current = false;
      setIsMutationRehydrating(false);
    }
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isRefetching,
    isMutationRehydrating,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh: fetchNotifications,
    prefetch,
  };
}
