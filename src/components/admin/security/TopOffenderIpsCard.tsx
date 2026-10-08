import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Flame, Loader2 } from "lucide-react";
import { BlockIpButton } from "./BlockIpButton";
import { cn } from "@/lib/utils";

interface OffenderRow {
  ip: string;
  loginFailures: number;
  tokenFailures: number;
  botHits: number;
  total: number;
}

function aggregateOffenders(loginIps: Array<string | null>, tokenIps: Array<string | null>, botIps: Array<string | null>): OffenderRow[] {
  const rows = new Map<string, OffenderRow>();
  const bump = (ip: string | null, key: "loginFailures" | "tokenFailures" | "botHits") => {
    if (!ip) return;
    const row = rows.get(ip) ?? { ip, loginFailures: 0, tokenFailures: 0, botHits: 0, total: 0 };
    row[key] += 1;
    row.total += 1;
    rows.set(ip, row);
  };
  loginIps.forEach(ip => bump(ip, "loginFailures"));
  tokenIps.forEach(ip => bump(ip, "tokenFailures"));
  botIps.forEach(ip => bump(ip, "botHits"));
  return Array.from(rows.values()).sort((left, right) => right.total - left.total).slice(0, 10);
}

async function fetchTopOffenders(): Promise<OffenderRow[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [login, token, bot] = await Promise.all([supabase.from("login_attempts").select("ip_address").eq("success", false).gte("created_at", since).limit(2000), supabase.from("public_token_failures").select("ip_address").gte("created_at", since).limit(2000), supabase.from("bot_detection_log").select("ip_address").eq("blocked", true).gte("created_at", since).limit(2000)]);
  return aggregateOffenders((login.data ?? []).map(row => row.ip_address), (token.data ?? []).map(row => row.ip_address), (bot.data ?? []).map(row => row.ip_address));
}

function OffenderItem({ row, onBlocked }: { row: OffenderRow; onBlocked: () => void }) {
  return <div className={cn("flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs", row.total >= 20 && "border-destructive/40 bg-destructive/5", row.total >= 10 && row.total < 20 && "border-warning/40 bg-warning/5")}><div className="flex min-w-0 flex-1 items-center gap-2"><span className="font-mono font-medium tabular-nums">{row.ip}</span><div className="flex flex-wrap gap-1">{row.loginFailures > 0 && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">login {row.loginFailures}</Badge>}{row.tokenFailures > 0 && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">token {row.tokenFailures}</Badge>}{row.botHits > 0 && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">bot {row.botHits}</Badge>}</div></div><div className="flex items-center gap-2"><span className="font-display font-bold tabular-nums">{row.total}</span><BlockIpButton defaultIp={row.ip} defaultReason={`Top ofensor 24h: ${row.loginFailures} login + ${row.tokenFailures} token + ${row.botHits} bot`} onBlocked={onBlocked} /></div></div>;
}

export function TopOffenderIpsCard() {
  const [rows, setRows] = useState<OffenderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setRows(await fetchTopOffenders());
    setLoading(false);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Flame className="h-4 w-4 text-destructive" />
          Top IPs ofensores (24h)
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!loading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma atividade ofensiva nas últimas 24h.</p>
        )}
        {rows.length > 0 && (
          <div className="space-y-1.5">
            {rows.map(row => <OffenderItem key={row.ip} row={row} onBlocked={load} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
