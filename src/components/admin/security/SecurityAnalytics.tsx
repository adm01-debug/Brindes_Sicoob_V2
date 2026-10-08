import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, AlertOctagon, Target, Ban } from "lucide-react";

interface BotLog {
  id: string;
  ip_address: string;
  endpoint: string;
  detection_reason: string;
  blocked: boolean;
  created_at: string;
}

interface Props {
  botLogs: BotLog[];
  onBlockIp: (ip: string) => void;
}

interface AggRow {
  key: string;
  total: number;
  blocked: number;
  reasons: Set<string>;
}

function aggregateRow(map: Map<string, AggRow>, key: string): AggRow {
  const existing = map.get(key);
  if (existing) return existing;
  const created = { key, total: 0, blocked: 0, reasons: new Set<string>() };
  map.set(key, created);
  return created;
}

function aggregateLogs(botLogs: BotLog[]) {
  const ipMap = new Map<string, AggRow>();
  const endpointMap = new Map<string, AggRow>();
  const reasonMap = new Map<string, number>();
  for (const log of botLogs) {
    const ip = aggregateRow(ipMap, log.ip_address);
    ip.total += 1;
    if (log.blocked) ip.blocked += 1;
    ip.reasons.add(log.detection_reason);
    const endpoint = aggregateRow(endpointMap, log.endpoint);
    endpoint.total += 1;
    if (log.blocked) endpoint.blocked += 1;
    endpoint.reasons.add(log.detection_reason);
    reasonMap.set(log.detection_reason, (reasonMap.get(log.detection_reason) || 0) + 1);
  }
  return { ipMap, endpointMap, reasonMap };
}

function buildTimeline(botLogs: BotLog[]) {
  const now = Date.now();
  const buckets: { hour: string; total: number; blocked: number; ts: number }[] = [];
  for (let index = 23; index >= 0; index--) {
    const ts = now - index * 3600_000;
    buckets.push({ ts: Math.floor(ts / 3600_000) * 3600_000, hour: `${String(new Date(ts).getHours()).padStart(2, "0")}h`, total: 0, blocked: 0 });
  }
  for (const log of botLogs) {
    const bucketTs = Math.floor(new Date(log.created_at).getTime() / 3600_000) * 3600_000;
    const bucket = buckets.find((candidate) => candidate.ts === bucketTs);
    if (!bucket) continue;
    bucket.total += 1;
    if (log.blocked) bucket.blocked += 1;
  }
  return buckets;
}

function buildAnalytics(botLogs: BotLog[]) {
  const { ipMap, endpointMap, reasonMap } = aggregateLogs(botLogs);
  const byTotal = (left: AggRow, right: AggRow) => right.total - left.total;
  const topIps = Array.from(ipMap.values()).sort(byTotal).slice(0, 10);
  const topEndpoints = Array.from(endpointMap.values()).sort(byTotal).slice(0, 10);
  const topReasons = Array.from(reasonMap.entries()).sort((left, right) => right[1] - left[1]).slice(0, 6).map(([reason, count]) => ({ reason, count }));
  return { topIps, topEndpoints, timeline: buildTimeline(botLogs), topReasons };
}

export function SecurityAnalytics({ botLogs, onBlockIp }: Props) {
  const { topIps, topEndpoints, timeline, topReasons } = useMemo(() => buildAnalytics(botLogs), [botLogs]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Atividade nas últimas 24h
          </CardTitle>
          <CardDescription>Detecções por hora (total vs. bloqueadas)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="blockedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#totalGradient)" strokeWidth={2} name="Total" />
                <Area type="monotone" dataKey="blocked" stroke="hsl(var(--destructive))" fill="url(#blockedGradient)" strokeWidth={2} name="Bloqueadas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertOctagon className="h-4 w-4 text-destructive" /> Top 10 IPs atacantes
            </CardTitle>
            <CardDescription>Maior volume de detecções na janela atual</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Block</TableHead>
                  <TableHead>Razões</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {topIps.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">Sem dados</TableCell></TableRow>
                ) : topIps.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-mono text-xs">{row.key}</TableCell>
                    <TableCell className="text-right text-xs"><Badge variant="outline">{row.total}</Badge></TableCell>
                    <TableCell className="text-right text-xs">
                      {row.blocked > 0 ? <Badge variant="destructive">{row.blocked}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate" title={Array.from(row.reasons).join(", ")}>
                      {Array.from(row.reasons).slice(0, 2).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onBlockIp(row.key)}>
                        <Ban className="h-3 w-3 mr-1" /> Bloquear
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" /> Top 10 endpoints alvo
            </CardTitle>
            <CardDescription>Funções mais visadas por bots e scrapers</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Block</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topEndpoints.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6 text-xs">Sem dados</TableCell></TableRow>
                ) : topEndpoints.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="text-xs">{row.key}</TableCell>
                    <TableCell className="text-right text-xs"><Badge variant="outline">{row.total}</Badge></TableCell>
                    <TableCell className="text-right text-xs">
                      {row.blocked > 0 ? <Badge variant="destructive">{row.blocked}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição por razão de detecção</CardTitle>
          <CardDescription>Padrões observados pelo helper bot-protection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topReasons.length === 0 ? (
              <span className="text-xs text-muted-foreground">Sem dados na janela atual.</span>
            ) : topReasons.map(({ reason, count }) => (
              <Badge key={reason} variant="outline" className="text-xs">
                {reason} <span className="ml-1.5 font-semibold text-foreground">{count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
