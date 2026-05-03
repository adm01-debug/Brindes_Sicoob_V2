import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SyncLogRow {
  id: string;
  ran_at: string;
  triggered_by_user_id: string | null;
  triggered_by_secret_name: string | null;
  trigger_op: string | null;
  processed: number;
  created_count: number;
  updated_count: number;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return `há ${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `há ${Math.round(diff / 60_000)}min`;
  if (diff < 86_400_000) return `há ${Math.round(diff / 3_600_000)}h`;
  return `há ${Math.round(diff / 86_400_000)}d`;
}

function statusBadge(status: string) {
  if (status === "ok") {
    return (
      <Badge variant="outline" className="border-green-500/40 text-green-600 dark:text-green-400 gap-1">
        <CheckCircle2 className="h-3 w-3" /> ok
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-destructive/40 text-destructive gap-1">
      <AlertTriangle className="h-3 w-3" /> {status}
    </Badge>
  );
}

function opBadge(op: string | null) {
  if (!op) return null;
  const variant = op === "manual" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="text-[10px] uppercase tracking-wide">
      {op.toLowerCase()}
    </Badge>
  );
}

import { forwardRef } from 'react';

export const ExternalConnectionsSyncLogPanel = forwardRef<HTMLDivElement>((_props, ref) => {
  const [rows, setRows] = useState<SyncLogRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("external_connections_sync_log")
      .select(
        "id, ran_at, triggered_by_user_id, triggered_by_secret_name, trigger_op, processed, created_count, updated_count, status, error_message, duration_ms",
      )
      .order("ran_at", { ascending: false })
      .limit(20);

    if (err) {
      setError(err.message ?? "Falha ao ler auditoria");
      setRows(null);
    } else {
      setRows((data ?? []) as SyncLogRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const lastOk = rows?.find((r) => r.status === "ok") ?? null;
  const lastError = rows?.find((r) => r.status !== "ok") ?? null;

  return (
    <Card ref={ref}>
      {/* ... keep existing code */}
    </Card>
  );
});

ExternalConnectionsSyncLogPanel.displayName = 'ExternalConnectionsSyncLogPanel';
