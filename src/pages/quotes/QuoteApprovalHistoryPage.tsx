import React from 'react';
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from '@/components/seo/PageSEO';
import { useApprovalRequests, type ApprovalRequest } from '@/hooks/useSicoobApprovals';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function ApprovalStatusBadge({ request }: { request: ApprovalRequest }) {
  const variant =
    request.status === 'approved'
      ? 'default'
      : request.status === 'rejected'
        ? 'destructive'
        : 'secondary';
  const label =
    request.status === 'approved'
      ? 'Aprovado'
      : request.status === 'rejected'
        ? 'Reprovado'
        : 'Pendente';
  return (
    <Badge variant={variant} className="gap-1">
      {request.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
      {request.status === 'rejected' && <XCircle className="h-3 w-3" />}
      {request.status === 'pending' && <Clock className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

function ApprovalDecision({ request }: { request: ApprovalRequest }) {
  if (request.status === 'rejected') {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold uppercase text-destructive">Motivo da Recusa:</span>
        <span className="text-xs italic text-destructive/80">
          "{request.rejection_reason || 'Sem observações'}"
        </span>
      </div>
    );
  }
  if (request.status === 'approved') {
    return (
      <span className="text-xs font-medium italic text-green-600">
        "Aprovado conforme política"
      </span>
    );
  }
  return <span className="text-xs italic text-muted-foreground">Aguardando análise...</span>;
}

function ApprovalTable({ requests }: { requests: ApprovalRequest[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Motivo da Solicitação</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Decisão / Motivo Gestor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="text-xs">
                {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {request.order_id.split('-')[0]}...
              </TableCell>
              <TableCell className="font-semibold">
                {formatCurrency(request.amount_at_request)}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs italic">
                "{request.request_reason}"
              </TableCell>
              <TableCell>
                <ApprovalStatusBadge request={request} />
              </TableCell>
              <TableCell>
                <ApprovalDecision request={request} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ApprovalContent({
  requests,
  isLoading,
}: {
  requests: ApprovalRequest[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (!requests?.length) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Clock className="mx-auto mb-3 h-12 w-12 opacity-20" />
        <p>Nenhuma solicitação de alçada encontrada.</p>
      </div>
    );
  }
  return <ApprovalTable requests={requests} />;
}

export default function QuoteApprovalHistoryPage() {
  const { requests, isLoading } = useApprovalRequests();

  return (
    <>
      <PageSEO
        title="Histórico de Aprovações"
        description="Veja o status e os motivos das decisões de alçada sobre seus pedidos."
        path="/orcamentos/historico-aprovacoes"
      />

      <div className="container mx-auto space-y-6 py-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3">
            <History className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Alçadas</h1>
            <p className="text-muted-foreground">
              Acompanhe as decisões de aprovação e reprovação de seus pedidos.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Solicitações</CardTitle>
            <CardDescription>
              Motivos e status das alçadas de pedidos que excederam o limite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApprovalContent requests={requests} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
