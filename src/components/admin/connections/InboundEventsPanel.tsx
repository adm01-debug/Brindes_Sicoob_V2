/**
 * InboundEventsPanel — Onda 12 #5
 * Dashboard de eventos inbound (HMAC-validated webhooks recebidos).
 * KPIs 7d, gráfico de volume por endpoint, tabela paginada com filtros e payload viewer.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { ExportButton } from "./ExportButton";
import {
  Inbox, ShieldAlert, ShieldCheck, AlertTriangle, RefreshCw, Code2, Loader2,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format, formatDistanceToNow, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Period = "24h" | "7d" | "30d";

interface EventRow {
  id: string;
  endpoint_id: string;
  event_type: string | null;
  signature_valid: boolean;
  processed: boolean;
  source_ip: string | null;
  received_at: string;
  payload: unknown;
  error: string | null;
}

interface Endpoint {
  id: string;
  name: string;
  slug: string;
  source_system: string;
}

const PERIOD_HOURS: Record<Period, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };
const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))"];

interface EventKpis {
  total: number;
  invalid: number;
  unprocessed: number;
  invalidRate: number;
  unprocessedRate: number;
}

function invalidTone(rate: number): "success" | "warning" | "destructive" {
  if (rate > 15) return "destructive";
  if (rate > 5) return "warning";
  return "success";
}

const TONE_CLASS = {
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
};
const TONE_LABEL = { success: "OK", warning: "Atenção", destructive: "Crítico" };
const TONE_ICON = { success: "text-success", warning: "text-warning", destructive: "text-destructive" };

interface SummaryCardProps {
  chart: { data: Record<string, string | number>[]; topEps: string[] };
  endpointFilter: string;
  endpoints: Endpoint[];
  kpis: EventKpis;
  loading: boolean;
  onEndpointChange: (value: string) => void;
  onInvalidToggle: () => void;
  onPeriodChange: (value: Period) => void;
  onRefresh: () => void;
  onUnprocessedToggle: () => void;
  onlyInvalid: boolean;
  onlyUnprocessed: boolean;
  period: Period;
}

function SummaryCard(props: SummaryCardProps) {
  const tone = invalidTone(props.kpis.invalidRate);
  const periodLabel = { "24h": "1 dia", "7d": "7 dias", "30d": "30 dias" }[props.period];
  return (
    <Card>
      <CardHeader className="pb-3"><div className="flex items-center justify-between flex-wrap gap-2">
        <div><CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4 text-primary" /> Eventos recebidos</CardTitle><CardDescription>Webhooks de entrada com validação HMAC nos últimos {periodLabel}.</CardDescription></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={props.period} onValueChange={(value) => props.onPeriodChange(value as Period)}><SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="24h">24h</SelectItem><SelectItem value="7d">7 dias</SelectItem><SelectItem value="30d">30 dias</SelectItem></SelectContent></Select>
          <Select value={props.endpointFilter} onValueChange={props.onEndpointChange}><SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Endpoint" /></SelectTrigger><SelectContent><SelectItem value="all">Todos endpoints</SelectItem>{props.endpoints.map((endpoint) => <SelectItem key={endpoint.id} value={endpoint.id}>{endpoint.name}</SelectItem>)}</SelectContent></Select>
          <Button size="sm" variant={props.onlyInvalid ? "default" : "outline"} className="h-8 text-xs" onClick={props.onInvalidToggle}><ShieldAlert className="h-3 w-3 mr-1" /> HMAC inválido</Button>
          <Button size="sm" variant={props.onlyUnprocessed ? "default" : "outline"} className="h-8 text-xs" onClick={props.onUnprocessedToggle}>Não processados</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={props.onRefresh} aria-label="Recarregar"><RefreshCw className={cn("h-3 w-3", props.loading && "animate-spin")} /></Button>
        </div>
      </div></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border"><div className="flex items-center justify-between"><Inbox className="h-4 w-4 text-muted-foreground" /><Badge variant="outline" className="text-[10px]">total</Badge></div><p className="text-2xl font-bold mt-1">{props.kpis.total}</p><p className="text-[11px] text-muted-foreground">eventos no período</p></div>
          <div className="p-3 rounded-lg bg-muted/30 border"><div className="flex items-center justify-between"><ShieldAlert className={cn("h-4 w-4", TONE_ICON[tone])} /><Badge variant="outline" className={cn("text-[10px]", TONE_CLASS[tone])}>{TONE_LABEL[tone]}</Badge></div><p className="text-2xl font-bold mt-1">{props.kpis.invalidRate.toFixed(1)}%</p><p className="text-[11px] text-muted-foreground">{props.kpis.invalid} HMAC inválidos</p></div>
          <div className="p-3 rounded-lg bg-muted/30 border"><div className="flex items-center justify-between"><AlertTriangle className={cn("h-4 w-4", props.kpis.unprocessed > 0 ? "text-warning" : "text-muted-foreground")} /><Badge variant="outline" className="text-[10px]">{props.kpis.unprocessedRate.toFixed(0)}%</Badge></div><p className="text-2xl font-bold mt-1">{props.kpis.unprocessed}</p><p className="text-[11px] text-muted-foreground">não processados</p></div>
        </div>
        {props.chart.data.length > 0 && props.chart.topEps.length > 0 && <div className="h-48"><ResponsiveContainer width="100%" height="100%"><BarChart data={props.chart.data}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={30} /><Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6 }} /><Legend wrapperStyle={{ fontSize: 11 }} />{props.chart.topEps.map((name, index) => <Bar key={name} dataKey={name} stackId="a" fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</BarChart></ResponsiveContainer></div>}
      </CardContent>
    </Card>
  );
}

function EventTableRows({ epMap, onSelect, rows }: { epMap: Map<string, Endpoint>; onSelect: (row: EventRow) => void; rows: EventRow[] }) {
  return <>{rows.map((row) => <TableRow key={row.id} className="cursor-pointer" onClick={() => onSelect(row)}>
    <TableCell className="text-xs whitespace-nowrap">{formatDistanceToNow(new Date(row.received_at), { locale: ptBR, addSuffix: true })}</TableCell>
    <TableCell className="text-xs">{epMap.get(row.endpoint_id)?.name ?? "—"}</TableCell><TableCell className="text-xs font-mono">{row.event_type ?? "—"}</TableCell>
    <TableCell>{row.signature_valid ? <ShieldCheck className="h-4 w-4 text-success" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}</TableCell>
    <TableCell><Badge variant="outline" className={cn("text-[10px]", row.processed ? "bg-success/10 text-success border-success/20" : "bg-muted")}>{row.processed ? "OK" : "—"}</Badge></TableCell>
    <TableCell className="text-xs font-mono text-muted-foreground">{row.source_ip ?? "—"}</TableCell><TableCell><Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]"><Code2 className="h-3 w-3 mr-1" /> JSON</Button></TableCell>
  </TableRow>)}</>;
}

function EventTableContent({ epMap, loading, onSelect, rows }: { epMap: Map<string, Endpoint>; loading: boolean; onSelect: (row: EventRow) => void; rows: EventRow[] }) {
  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  if (rows.length === 0) return <div className="p-8 text-center text-sm text-muted-foreground">Nenhum evento no filtro atual.</div>;
  return <Table><TableHeader><TableRow><TableHead className="text-xs">Quando</TableHead><TableHead className="text-xs">Endpoint</TableHead><TableHead className="text-xs">Evento</TableHead><TableHead className="text-xs w-20">HMAC</TableHead><TableHead className="text-xs w-20">Proc.</TableHead><TableHead className="text-xs">IP</TableHead><TableHead className="text-xs w-20" /></TableRow></TableHeader><TableBody><EventTableRows epMap={epMap} onSelect={onSelect} rows={rows} /></TableBody></Table>;
}

interface EventsCardProps { epMap: Map<string, Endpoint>; loading: boolean; onPage: (page: number) => void; onSelect: (row: EventRow) => void; page: number; pages: number; period: Period; rows: EventRow[]; allRows: EventRow[] }

function EventsCard({ epMap, loading, onPage, onSelect, page, pages, period, rows, allRows }: EventsCardProps) {
  const exportRows = allRows.map((row) => ({ received_at: row.received_at, endpoint: epMap.get(row.endpoint_id)?.name ?? row.endpoint_id, event_type: row.event_type ?? "", signature_valid: row.signature_valid, processed: row.processed, source_ip: row.source_ip ?? "", error: row.error ?? "" }));
  return <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm">Últimos eventos</CardTitle><ExportButton filename={`inbound-events_${period}`} rows={exportRows} columns={[{ key: "received_at", header: "received_at" }, { key: "endpoint", header: "endpoint" }, { key: "event_type", header: "event_type" }, { key: "signature_valid", header: "signature_valid" }, { key: "processed", header: "processed" }, { key: "source_ip", header: "source_ip" }, { key: "error", header: "error" }]} /></div></CardHeader>
    <CardContent className="p-0"><EventTableContent epMap={epMap} loading={loading} onSelect={onSelect} rows={rows} />
      {pages > 1 && <div className="flex items-center justify-between p-2 border-t"><Button size="sm" variant="ghost" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</Button><span className="text-xs text-muted-foreground">{page + 1} / {pages}</span><Button size="sm" variant="ghost" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Próximo</Button></div>}
    </CardContent></Card>;
}

function PayloadSheet({ epMap, onClose, selected }: { epMap: Map<string, Endpoint>; onClose: () => void; selected: EventRow | null }) {
  return (
    <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) onClose(); }}><SheetContent className="w-full sm:max-w-2xl overflow-y-auto"><SheetHeader><SheetTitle className="flex items-center gap-2"><Code2 className="h-4 w-4" /> Payload do evento</SheetTitle><SheetDescription>
      {selected && <span className="space-x-2"><span>{epMap.get(selected.endpoint_id)?.name ?? "—"}</span><span>·</span><span className="font-mono">{selected.event_type ?? "(sem tipo)"}</span><span>·</span><span>{format(new Date(selected.received_at), "dd/MM/yyyy HH:mm:ss")}</span></span>}
    </SheetDescription></SheetHeader>
      {selected && <div className="mt-4 space-y-3">{!selected.signature_valid && <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive"><ShieldAlert className="h-4 w-4" /> Assinatura HMAC inválida — payload não confiável.</div>}{selected.error && <div className="p-2 rounded bg-warning/10 border border-warning/20 text-xs text-warning"><strong>Erro:</strong> {selected.error}</div>}<pre className="text-[11px] p-3 rounded bg-muted overflow-auto max-h-[60vh] font-mono">{JSON.stringify(selected.payload, null, 2)}</pre></div>}
    </SheetContent></Sheet>
  );
}

export function InboundEventsPanel() {
  const [period, setPeriod] = useState<Period>("7d");
  const [endpointFilter, setEndpointFilter] = useState<string>("all");
  const [onlyInvalid, setOnlyInvalid] = useState(false);
  const [onlyUnprocessed, setOnlyUnprocessed] = useState(false);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const pageSize = 15;

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - PERIOD_HOURS[period] * 60 * 60 * 1000).toISOString();
    let q = supabase
      .from("inbound_webhook_events")
      .select("id, endpoint_id, event_type, signature_valid, processed, source_ip, received_at, payload, error")
      .gte("received_at", since)
      .order("received_at", { ascending: false })
      .limit(500);
    if (endpointFilter !== "all") q = q.eq("endpoint_id", endpointFilter);
    if (onlyInvalid) q = q.eq("signature_valid", false);
    if (onlyUnprocessed) q = q.eq("processed", false);
    const [{ data: ev }, { data: ep }] = await Promise.all([
      q,
      supabase.from("inbound_webhook_endpoints").select("id, name, slug, source_system"),
    ]);
    setRows((ev ?? []) as EventRow[]);
    setEndpoints((ep ?? []) as Endpoint[]);
    setPage(0);
    setLoading(false);
  }, [endpointFilter, onlyInvalid, onlyUnprocessed, period]);

  useEffect(() => { void load(); }, [load]);

  const epMap = useMemo(() => new Map(endpoints.map((e) => [e.id, e])), [endpoints]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const invalid = rows.filter((r) => !r.signature_valid).length;
    const unprocessed = rows.filter((r) => r.signature_valid && !r.processed).length;
    return {
      total,
      invalid,
      unprocessed,
      invalidRate: total > 0 ? (invalid / total) * 100 : 0,
      unprocessedRate: total > 0 ? (unprocessed / total) * 100 : 0,
    };
  }, [rows]);

  // Volume por dia x endpoint (até 4 endpoints top)
  const chartData = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.min(30, Math.ceil(PERIOD_HOURS[period] / 24));
    const buckets: Record<string, Record<string, number>> = {};
    const now = startOfDay(new Date()).getTime();
    for (let i = days - 1; i >= 0; i--) {
      const d = format(new Date(now - i * dayMs), "dd/MM");
      buckets[d] = {};
    }
    const epCount: Record<string, number> = {};
    for (const r of rows) {
      const ep = epMap.get(r.endpoint_id);
      const name = ep ? ep.name : "Desconhecido";
      epCount[name] = (epCount[name] ?? 0) + 1;
      const day = format(new Date(r.received_at), "dd/MM");
      if (!buckets[day]) buckets[day] = {};
      buckets[day][name] = (buckets[day][name] ?? 0) + 1;
    }
    const topEps = Object.entries(epCount).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
    const data = Object.entries(buckets).map(([day, counts]) => {
      const row: Record<string, string | number> = { day };
      for (const n of topEps) row[n] = counts[n] ?? 0;
      return row;
    });
    return { data, topEps };
  }, [rows, epMap, period]);

  const paged = rows.slice(page * pageSize, page * pageSize + pageSize);
  const pages = Math.ceil(rows.length / pageSize);

  return (
    <div className="space-y-4">
      <SummaryCard chart={chartData} endpointFilter={endpointFilter} endpoints={endpoints} kpis={kpis}
        loading={loading} onEndpointChange={setEndpointFilter} onInvalidToggle={() => setOnlyInvalid((value) => !value)}
        onPeriodChange={setPeriod} onRefresh={() => { void load(); }}
        onUnprocessedToggle={() => setOnlyUnprocessed((value) => !value)} onlyInvalid={onlyInvalid}
        onlyUnprocessed={onlyUnprocessed} period={period} />
      <EventsCard epMap={epMap} loading={loading} onPage={setPage} onSelect={setSelected}
        page={page} pages={pages} period={period} rows={paged} allRows={rows} />
      <PayloadSheet epMap={epMap} onClose={() => setSelected(null)} selected={selected} />
    </div>
  );
}
