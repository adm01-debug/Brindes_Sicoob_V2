import React from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { History, Search, FileText, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

async function fetchAuditLogs() {
  const { data, error } = await supabase
    .from('sicoob_manager_audit')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  const orderIds = Array.from(new Set((data ?? []).map((log) => log.order_id)));
  const { data: orders, error: ordersError } = await supabase
    .from('sicoob_orders')
    .select('id, total_amount, postos_atendimento (nome)')
    .in('id', orderIds);
  if (ordersError) throw ordersError;
  const ordersById = new Map((orders ?? []).map((order) => [order.id, order]));
  return (data ?? []).map((log) => ({
    ...log,
    sicoob_orders: ordersById.get(log.order_id) ?? null,
  }));
}

type AuditLog = Awaited<ReturnType<typeof fetchAuditLogs>>[number];

function filterAuditLogs(logs: AuditLog[] | undefined, searchTerm: string) {
  const normalizedSearch = searchTerm.toLowerCase();
  return logs?.filter(
    (log) =>
      log.action.toLowerCase().includes(normalizedSearch) ||
      log.sicoob_orders?.postos_atendimento?.nome?.toLowerCase().includes(normalizedSearch),
  );
}

function actionPresentation(action: string) {
  if (action === 'approve') {
    return {
      label: 'Aprovação',
      className: 'bg-status-delivered/10 text-status-delivered border-status-delivered/20 gap-1',
      icon: <CheckCircle className="h-3 w-3" />,
    };
  }
  if (action === 'reject') {
    return {
      label: 'Rejeição',
      className: 'bg-destructive/10 text-destructive border-destructive/20 gap-1',
      icon: <XCircle className="h-3 w-3" />,
    };
  }
  return { label: action, className: 'gap-1', icon: <FileText className="h-3 w-3" /> };
}

function AuditActionBadge({ action }: { action: string }) {
  const presentation = actionPresentation(action);
  return (
    <Badge variant="outline" className={presentation.className}>
      {presentation.icon}
      {presentation.label}
    </Badge>
  );
}

function AuditRow({ log }: { log: AuditLog }) {
  return (
    <TableRow>
      <TableCell className="text-xs">
        {log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
      </TableCell>
      <TableCell>
        <AuditActionBadge action={log.action} />
      </TableCell>
      <TableCell className="text-sm font-medium">
        {log.sicoob_orders?.postos_atendimento?.nome || 'Sistema'}
      </TableCell>
      <TableCell className="font-mono text-xs">
        {log.order_id ? `#${log.order_id.substring(0, 8)}` : '-'}
      </TableCell>
      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
        {JSON.stringify(log.details)}
      </TableCell>
    </TableRow>
  );
}

function AuditTable({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>PA Alvo</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <AuditRow key={log.id} log={log} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AuditContent({ isLoading, logs }: { isLoading: boolean; logs: AuditLog[] | undefined }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (!logs?.length) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>Nenhum registro de auditoria encontrado.</p>
      </div>
    );
  }
  return <AuditTable logs={logs} />;
}

function GestorAuditHeader() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-sicoob-green-dark">
        Auditoria de Gestão
      </h1>
      <p className="text-muted-foreground">
        Rastreabilidade total das aprovações e ações administrativas.
      </p>
    </div>
  );
}

export default function GestorAuditPage() {
  const [searchTerm, setSearchTerm] = React.useState('');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['sicoob-gestor-audit'],
    queryFn: fetchAuditLogs,
  });
  const filteredLogs = filterAuditLogs(auditLogs, searchTerm);

  return (
    <>
      <PageSEO
        title="Log de Auditoria"
        description="Histórico de ações realizadas por gestores."
        path="/gestor/auditoria"
        noIndex
      />
      <div className="container mx-auto animate-fade-in space-y-6 p-6">
        <GestorAuditHeader />

        <Card className="border-[1.5px]">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-sicoob-green" />
                Histórico de Ações
              </CardTitle>
              <CardDescription>Últimas 100 ações registradas no sistema.</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrar ações ou PA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <AuditContent isLoading={isLoading} logs={filteredLogs} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
