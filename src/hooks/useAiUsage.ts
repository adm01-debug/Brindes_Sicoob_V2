/**
 * Hook for AI usage tracking data.
 * Users see their own usage; admins see all users.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AiUsageLog {
  id: string;
  user_id: string;
  function_name: string;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  duration_ms: number | null;
  status: string;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AiUsageQuota {
  id: string;
  role: string;
  monthly_limit: number;
  is_unlimited: boolean;
}

export interface QuotaStatus {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  unlimited?: boolean;
}

interface AggregatedUsage {
  count: number;
  cost: number;
  tokens: number;
}

function periodStart(period: "day" | "week" | "month") {
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return start;
}

function aggregateUsage(logs: AiUsageLog[], keyOf: (log: AiUsageLog) => string) {
  const result = new Map<string, AggregatedUsage>();
  for (const log of logs) {
    const key = keyOf(log);
    const current = result.get(key) || { count: 0, cost: 0, tokens: 0 };
    current.count += 1;
    current.cost += Number(log.estimated_cost_usd);
    current.tokens += log.total_tokens;
    result.set(key, current);
  }
  return result;
}

function namedEntries(map: Map<string, AggregatedUsage>) {
  return Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.cost - a.cost);
}

function userEntries(map: Map<string, AggregatedUsage>) {
  return Array.from(map.entries())
    .map(([userId, stats]) => ({ userId, ...stats }))
    .sort((a, b) => b.cost - a.cost);
}

function buildUsageStats(logs: AiUsageLog[]) {
  const totalRequests = logs.length;
  const successCount = logs.filter((log) => log.status === "success").length;
  const byUser = aggregateUsage(logs, (log) => log.user_id);
  const byFunction = aggregateUsage(logs, (log) => log.function_name);
  const byModel = aggregateUsage(logs, (log) => log.model || "unknown");
  const byDay = aggregateUsage(logs, (log) => log.created_at.slice(0, 10));
  return {
    totalRequests,
    successCount,
    errorCount: totalRequests - successCount,
    totalTokens: logs.reduce((sum, log) => sum + log.total_tokens, 0),
    totalCost: logs.reduce((sum, log) => sum + Number(log.estimated_cost_usd), 0),
    byUser: userEntries(byUser),
    byFunction: namedEntries(byFunction).sort((a, b) => b.count - a.count),
    byModel: namedEntries(byModel).sort((a, b) => b.count - a.count),
    byDay: namedEntries(byDay)
      .map(({ name, ...stats }) => ({ date: name, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

async function fetchUsageStats(period: "day" | "week" | "month") {
  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("*")
    .gte("created_at", periodStart(period).toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return buildUsageStats((data || []) as AiUsageLog[]);
}

// Fetch user's quota status
export function useAiQuotaStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ai-quota-status", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("check_ai_quota", { _user_id: user.id });
      if (error) throw error;
      return data as unknown as QuotaStatus;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

// Fetch usage logs (user sees own, admin sees all)
export function useAiUsageLogs(options?: {
  userId?: string;
  functionName?: string;
  period?: "day" | "week" | "month" | "all";
  limit?: number;
}) {
  const { user } = useAuth();
  const { userId, functionName, period = "month", limit = 500 } = options || {};

  return useQuery({
    queryKey: ["ai-usage-logs", userId, functionName, period, limit],
    queryFn: async () => {
      let query = supabase
        .from("ai_usage_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (userId) query = query.eq("user_id", userId);
      if (functionName) query = query.eq("function_name", functionName);

      if (period !== "all") {
        const now = new Date();
        let start: Date;
        if (period === "day") start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        else if (period === "week") {
          start = new Date(now);
          start.setDate(start.getDate() - 7);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        query = query.gte("created_at", start.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AiUsageLog[];
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });
}

// Fetch all quotas (admin only)
export function useAiQuotas() {
  return useQuery({
    queryKey: ["ai-usage-quotas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_usage_quotas")
        .select("*")
        .order("role");
      if (error) throw error;
      return (data || []) as AiUsageQuota[];
    },
    staleTime: 60_000,
  });
}

// Update a quota (admin only)
export function useUpdateQuota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; monthly_limit: number; is_unlimited: boolean }) => {
      const { error } = await supabase
        .from("ai_usage_quotas")
        .update({
          monthly_limit: params.monthly_limit,
          is_unlimited: params.is_unlimited,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-usage-quotas"] });
    },
  });
}

// Aggregated stats for admin dashboard
export function useAiUsageStats(period: "day" | "week" | "month" = "month") {
  return useQuery({
    queryKey: ["ai-usage-stats", period],
    queryFn: () => fetchUsageStats(period),
    staleTime: 30_000,
  });
}
