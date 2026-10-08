import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface AppLog {
  id: string;
  created_at: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  severity: string;
  duration_ms: number;
  request_id: string | null;
  error_message: string | null;
}

interface AppLogsResponse {
  logs: AppLog[];
}

function SeverityBadge({ severity }: { severity: string }) {
  if (severity === "error") return <Badge variant="destructive">Error</Badge>;
  if (severity === "warning") return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
  if (severity === "info") return <Badge variant="secondary">Info</Badge>;
  return <Badge variant="outline">{severity}</Badge>;
}

function AppLogRow({ log }: { log: AppLog }) {
  return <TableRow><TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell><TableCell className="font-mono text-xs">{log.operation}</TableCell><TableCell className="text-xs">{log.table_name || log.rpc_name}</TableCell><TableCell><SeverityBadge severity={log.severity} /></TableCell><TableCell className="text-xs">{log.duration_ms}ms</TableCell><TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[100px]" title={log.request_id ?? undefined}>{log.request_id || "-"}</TableCell><TableCell className="text-xs max-w-xs truncate" title={log.error_message ?? undefined}>{log.error_message || "-"}</TableCell></TableRow>;
}

function AppLogsBody({ logs, loading }: { logs?: AppLog[]; loading: boolean }) {
  if (loading) return <>{Array.from({ length: 5 }).map((_, index) => <TableRow key={index}><TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell></TableRow>)}</>;
  if (!logs?.length) return <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum log encontrado.</TableCell></TableRow>;
  return <>{logs.map(log => <AppLogRow key={log.id} log={log} />)}</>;
}

function AppLogsFilters({ severity, setSeverity, tableName, setTableName }: { severity: string; setSeverity: (value: string) => void; tableName: string; setTableName: (value: string) => void }) {
  return <div className="flex gap-4 mt-4"><Select value={severity} onValueChange={setSeverity}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Severidade" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="error">Erros</SelectItem><SelectItem value="warning">Avisos</SelectItem><SelectItem value="info">Info</SelectItem></SelectContent></Select><Input placeholder="Filtrar por tabela..." value={tableName} onChange={event => setTableName(event.target.value)} className="max-w-xs" /></div>;
}

export function AppLogsTable() {
  const [severity, setSeverity] = useState("all");
  const [tableName, setTableName] = useState("");

  const { data, isLoading } = useQuery<AppLogsResponse>({
    queryKey: ["app-logs", severity, tableName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-app-logs", {
        body: { severity, table_name: tableName, limit: 50 },
      });
      if (error) throw error;
      return (data ?? { logs: [] }) as AppLogsResponse;
    },
  });

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Histórico de Telemetria (Query Logs)</CardTitle>
        <AppLogsFilters severity={severity} setSeverity={setSeverity} tableName={tableName} setTableName={setTableName} />
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Severidade</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Request ID</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody><AppLogsBody logs={data?.logs} loading={isLoading} /></TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
