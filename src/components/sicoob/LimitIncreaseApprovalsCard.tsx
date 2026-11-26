import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sicoobApprovalService } from '@/services/sicoob/approvalService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { Check, X, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { askConfirm } from '@/stores/useConfirmDialogStore';

type LimitIncreaseRequest = Awaited<
  ReturnType<typeof sicoobApprovalService.listPendingLimitIncreaseRequests>
>[number];

export const LIMIT_INCREASE_APPROVALS_QUERY_KEY = 'limit-increase-approvals';

const delta = (request: LimitIncreaseRequest) =>
  (request.requested_limit ?? 0) - (request.current_limit ?? 0);

const formatRequestedAt = (createdAt: string | null) =>
  createdAt ? format(new Date(createdAt), 'dd/MM/yyyy HH:mm') : '—';

function LimitIncreaseRow({
  request,
  decisionPending,
  onApprove,
  onReject,
}: {
  request: LimitIncreaseRequest;
  decisionPending: boolean;
  onApprove: (request: LimitIncreaseRequest) => void;
  onReject: (request: LimitIncreaseRequest) => void;
}) {
  const diferenca = delta(request);
  return (
    <TableRow>
      <TableCell className="text-sm">{formatRequestedAt(request.created_at)}</TableCell>
      <TableCell>
        <div className="font-medium">
          {request.postos_atendimento?.nome ?? 'PA não identificado'}
        </div>
        <div className="text-xs text-muted-foreground">{request.requester_name ?? '—'}</div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatCurrency(request.current_limit ?? 0)}
      </TableCell>
      <TableCell>
        <div className="font-semibold text-sicoob-green-dark">
          {formatCurrency(request.requested_limit ?? 0)}
        </div>
        {diferenca > 0 && (
          <Badge
            variant="outline"
            className="border-sicoob-green/30 bg-sicoob-green/5 text-sicoob-green-dark"
          >
            +{formatCurrency(diferenca)}
          </Badge>
        )}
      </TableCell>
      <TableCell className="max-w-[220px] truncate text-sm" title={request.reason ?? undefined}>
        {request.reason}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onReject(request)}
            disabled={!request.can_decide || decisionPending}
            aria-label="Recusar aumento de verba"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="bg-sicoob-green text-white hover:bg-sicoob-green-dark"
            onClick={() => onApprove(request)}
            disabled={!request.can_decide || decisionPending}
            aria-label="Aprovar aumento de verba"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function LimitIncreaseList({
  isLoading,
  requests,
  decisionPending,
  onApprove,
  onReject,
}: {
  isLoading: boolean;
  requests: LimitIncreaseRequest[] | undefined;
  decisionPending: boolean;
  onApprove: (request: LimitIncreaseRequest) => void;
  onReject: (request: LimitIncreaseRequest) => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (!requests || requests.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Wallet className="mx-auto mb-4 h-12 w-12 opacity-20" />
        <p>Nenhum pedido de aumento de verba aguardando decisão.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Solicitado em</TableHead>
            <TableHead>PA / Solicitante</TableHead>
            <TableHead>Limite atual</TableHead>
            <TableHead>Limite pedido</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <LimitIncreaseRow
              key={request.id}
              request={request}
              decisionPending={decisionPending}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function LimitIncreaseApprovalsCard() {
  const queryClient = useQueryClient();
  const [rejecting, setRejecting] = useState<LimitIncreaseRequest | null>(null);
  const [reason, setReason] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: [LIMIT_INCREASE_APPROVALS_QUERY_KEY],
    queryFn: () => sicoobApprovalService.listPendingLimitIncreaseRequests(),
  });

  const clearCaches = () => {
    queryClient.invalidateQueries({ queryKey: [LIMIT_INCREASE_APPROVALS_QUERY_KEY] });
    queryClient.invalidateQueries({ queryKey: ['budget-requests'] });
  };

  const approveMutation = useMutation({
    mutationFn: (requestId: string) =>
      sicoobApprovalService.approveLimitIncreaseRequest(requestId),
    onSuccess: () => {
      toast.success('Aumento de verba aprovado.');
      clearCaches();
    },
    onError: (error: unknown) => {
      console.error('Error approving limit increase:', error);
      toast.error(
        'Erro ao aprovar aumento de verba: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ requestId, rejectionReason }: { requestId: string; rejectionReason: string }) =>
      sicoobApprovalService.rejectLimitIncreaseRequest(requestId, rejectionReason),
    onSuccess: () => {
      toast.success('Aumento de verba recusado.');
      setRejecting(null);
      setReason('');
      clearCaches();
    },
    onError: (error: unknown) => {
      console.error('Error rejecting limit increase:', error);
      toast.error(
        'Erro ao recusar aumento de verba: ' +
          (error instanceof Error ? error.message : String(error)),
      );
    },
  });

  const decisionPending = approveMutation.isPending || rejectMutation.isPending;

  const openRejectDialog = (request: LimitIncreaseRequest) => {
    setRejecting(request);
    setReason('');
  };

  const handleApprove = async (request: LimitIncreaseRequest) => {
    const nome = request.postos_atendimento?.nome ?? 'PA';
    const confirmado = await askConfirm({
      title: 'Aprovar aumento de verba?',
      description: `O limite do ${nome} passa a ser ${formatCurrency(request.requested_limit ?? 0)} na competência em aberto.`,
      confirmLabel: 'Aprovar',
    });
    if (confirmado) approveMutation.mutate(request.id);
  };

  const handleRejectSubmit = () => {
    if (!rejecting) return;
    if (!reason.trim()) {
      toast.error('Informe o motivo da recusa.');
      return;
    }
    rejectMutation.mutate({ requestId: rejecting.id, rejectionReason: reason.trim() });
  };

  return (
    <>
      <Card className="border-[1.5px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-sicoob-green-dark" />
            Aumentos de Verba Solicitados
          </CardTitle>
          <CardDescription>
            Pedidos dos PAs para elevar o limite da competência. Ao aprovar, o novo limite
            vale imediatamente para novos pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LimitIncreaseList
            isLoading={isLoading}
            requests={requests}
            decisionPending={decisionPending}
            onApprove={handleApprove}
            onReject={openRejectDialog}
          />
        </CardContent>
      </Card>

      <Dialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar aumento de verba</DialogTitle>
            <DialogDescription>
              {rejecting?.postos_atendimento?.nome ?? 'PA'} pediu{' '}
              {formatCurrency(rejecting?.requested_limit ?? 0)}. O motivo é obrigatório e fica
              registrado no histórico do PA.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo da recusa"
            aria-label="Motivo da recusa"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={rejectMutation.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending}
            >
              Recusar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
