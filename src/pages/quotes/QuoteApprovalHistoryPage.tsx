import React from "react";
// import { MainLayout } from "@/components/layout/MainLayout";
import { PageSEO } from "@/components/seo/PageSEO";
import { useApprovalRequests } from "@/hooks/useSicoobApprovals";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { History, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuoteApprovalHistoryPage() {
  const { requests, isLoading } = useApprovalRequests();

  return (
    <>
      <PageSEO 
        title="Histórico de Aprovações" 
        description="Veja o status e os motivos das decisões de alçada sobre seus pedidos." 
        path="/orcamentos/historico-aprovacoes"
      />
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <History className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Alçadas</h1>
            <p className="text-muted-foreground">Acompanhe as decisões de aprovação e reprovação de seus pedidos.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Minhas Solicitações</CardTitle>
            <CardDescription>Motivos e status das alçadas de pedidos que excederam o limite.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : !requests || requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>Nenhuma solicitação de alçada encontrada.</p>
              </div>
            ) : (
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
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-xs">
                          {format(new Date(req.created_at), 'dd/MM/yyyy HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {req.order_id.split('-')[0]}...
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(req.amount_at_request)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs italic">
                          "{req.request_reason}"
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              req.status === 'approved' ? 'default' : 
                              req.status === 'rejected' ? 'destructive' : 'secondary'
                            }
                            className="gap-1"
                          >
                            {req.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                            {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                            {req.status === 'pending' && <Clock className="h-3 w-3" />}
                            {req.status === 'approved' ? 'Aprovado' : 
                             req.status === 'rejected' ? 'Reprovado' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {req.status === 'rejected' ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] uppercase font-bold text-destructive">Motivo da Recusa:</span>
                              <span className="text-xs italic text-destructive/80">"{req.rejection_reason || "Sem observações"}"</span>
                            </div>
                          ) : req.status === 'approved' ? (
                            <span className="text-xs text-green-600 font-medium italic">"Aprovado conforme política"</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic italic">Aguardando análise...</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
