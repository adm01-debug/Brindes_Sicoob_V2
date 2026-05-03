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

export function AppLogsTable() {
  const [severity, setSeverity] = useState("all");
  const [tableName, setTableName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["app-logs", severity, tableName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-app-logs", {
        body: { severity, table_name: tableName, limit: 50 },
      });
      if (error) throw error;
      return data;
    },
  });

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "error": return <Badge variant="destructive">Error</Badge>;
      case "warning": return <Badge variant="secondary" className="bg-yellow-500 text-white">Warning</Badge>;
      case "info": return <Badge variant="secondary">Info</Badge>;
      default: return <Badge variant="outline">{sev}</Badge>;
    }
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Histórico de Telemetria (Query Logs)</CardTitle>
        <div className="flex gap-4 mt-4">
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="error">Erros</SelectItem>
              <SelectItem value="warning">Avisos</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            placeholder="Filtrar por tabela..." 
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            className="max-w-xs"
          />
        </div>
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
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : data?.logs?.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{log.operation}</TableCell>
                  <TableCell className="text-xs">{log.table_name || log.rpc_name}</TableCell>
                  <TableCell>{getSeverityBadge(log.severity)}</TableCell>
                  <TableCell className="text-xs">{log.duration_ms}ms</TableCell>
                  <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[100px]" title={log.request_id}>
                    {log.request_id || "-"}
                  </TableCell>
                  <TableCell className="text-xs max-w-xs truncate" title={log.error_message}>
                    {log.error_message || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (!data?.logs || data.logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhum log encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
