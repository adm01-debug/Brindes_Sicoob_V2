import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Wallet,
  TrendingUp,
  AlertCircle,
  Calendar,
  Plus,
  History,
  Clock,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sicoobBudgetService } from '@/services/sicoob/budgetService';
import { sicoobApprovalService } from '@/services/sicoob/approvalService';
import { formatCurrency } from '@/lib/format';
import { readPaBudgetAmounts, type PaBudgetAmounts } from '@/lib/sicoob/paBudgetState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
// import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type LimitIncreaseRequest = Awaited<
  ReturnType<typeof sicoobApprovalService.listLimitIncreaseRequests>
>[number];

type RequestPresentation = {
  className: string;
  label: string;
  variant: 'secondary' | 'destructive' | 'outline';
};

const PENDING_REQUEST_PRESENTATION: RequestPresentation = {
  className: 'bg-status-production/10 border-status-production/20 text-status-production',
  label: 'Pendente',
  variant: 'outline',
};

const REQUEST_PRESENTATION: Record<string, RequestPresentation> = {
  approved: {
    className: 'bg-status-delivered/10 border-status-delivered/20 text-status-delivered',
    label: 'Aprovado',
    variant: 'secondary',
  },
  rejected: {
    className: 'bg-destructive/10 border-destructive/20 text-destructive',
    label: 'Rejeitado',
    variant: 'destructive',
  },
  pending: PENDING_REQUEST_PRESENTATION,
};

function RequestStatusIcon({ status }: { status: string }) {
  if (status === 'approved') return <CheckCircle2 className="h-5 w-5" />;
  if (status === 'rejected') return <X className="h-5 w-5" />;
  return <Clock className="h-5 w-5" />;
}

function RequestHistoryRow({ request }: { request: LimitIncreaseRequest }) {
  const requestStatus = request.status ?? 'pending';
  const presentation = REQUEST_PRESENTATION[requestStatus] ?? PENDING_REQUEST_PRESENTATION;
  // `requested_limit` guarda o teto total pedido; o aumento é a diferença para o
  // teto vigente no momento do pedido (mesma conta da fila de aprovações).
  const requestedLimit = request.requested_limit || 0;
  const currentLimit = request.current_limit ?? null;
  const adicional = currentLimit === null ? requestedLimit : requestedLimit - currentLimit;
  const createdAt = request.created_at ? new Date(request.created_at) : null;
  const createdLabel = createdAt
    ? `${createdAt.toLocaleDateString('pt-BR')} • ${createdAt.toLocaleTimeString('pt-BR')}`
    : '—';

  return (
    <div className="flex flex-col justify-between gap-4 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border',
            presentation.className,
          )}
        >
          <RequestStatusIcon status={requestStatus} />
        </div>
        <div>
          <div className="text-sm font-bold">
            Aumento de {formatCurrency(adicional)}
            {currentLimit !== null ? (
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                (de {formatCurrency(currentLimit)} para {formatCurrency(requestedLimit)})
              </span>
            ) : null}
          </div>
          <div className="max-w-[300px] truncate text-xs text-muted-foreground">
            {request.reason}
          </div>
          {requestStatus === 'rejected' && request.rejection_reason ? (
            <div className="max-w-[300px] truncate text-xs font-medium text-destructive">
              Motivo da recusa: {request.rejection_reason}
            </div>
          ) : null}
          <div className="mt-1 text-[10px] font-medium uppercase text-muted-foreground">
            {createdLabel}
          </div>
        </div>
      </div>
      <Badge variant={presentation.variant}>{presentation.label}</Badge>
    </div>
  );
}

function RequestHistory({ requests }: { requests?: LimitIncreaseRequest[] }) {
  return (
    <Card className="border-[1.5px]">
      <CardHeader>
        <CardTitle>Histórico de Solicitações</CardTitle>
        <CardDescription>Acompanhe o status dos seus pedidos de aumento de limite.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {requests?.length ? (
            requests.map((request) => <RequestHistoryRow key={request.id} request={request} />)
          ) : (
            <div className="py-8 text-center italic text-muted-foreground">
              Nenhuma solicitação realizada até o momento.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetKpis({ amounts }: { amounts: PaBudgetAmounts }) {
  const { planejada, reservada, comprometida, consumida, disponivel, percentualConsumido } =
    amounts;
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <Card className="border-[1.5px] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Verba Mensal</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(planejada)}</div>
          <p className="mt-1 text-xs text-muted-foreground">Limite total aprovado pela Singular</p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px] shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Consumido</CardTitle>
          <TrendingUp className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{formatCurrency(consumida)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {percentualConsumido.toFixed(1)}% do limite consumido
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(reservada)} reservado · {formatCurrency(comprometida)} empenhado
          </p>
        </CardContent>
      </Card>
      <Card className="border-[1.5px] border-sicoob-green/20 bg-sicoob-green/5 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Saldo Disponível</CardTitle>
          <Wallet className="h-4 w-4 text-sicoob-green" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-sicoob-green-dark">
            {formatCurrency(disponivel)}
          </div>
          <p className="mt-1 text-xs font-medium text-muted-foreground text-sicoob-green-dark/80">
            Disponível para novos pedidos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetStatus({
  amounts,
  isDialogOpen,
  requestedAmount,
  requestReason,
  isPending,
  onDialogChange,
  onAmountChange,
  onReasonChange,
  onSubmit,
}: {
  amounts: PaBudgetAmounts;
  isDialogOpen: boolean;
  requestedAmount: string;
  requestReason: string;
  isPending: boolean;
  onDialogChange: (open: boolean) => void;
  onAmountChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSubmit: () => void;
}) {
  // A barra mede ocupacao (reservado + empenhado + consumido), nao consumo:
  // rotular como consumo fazia o gestor achar que a verba ja tinha sido gasta.
  const ocupacaoPercent = amounts.percentualOcupado;
  const isCritical = ocupacaoPercent > 90;
  return (
    <Card className="border-[1.5px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Status da Utilização</CardTitle>
          <CardDescription>
            Ocupação da verba: reservado, empenhado e consumido sobre o limite do mês.
          </CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={onDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-sicoob-green hover:bg-sicoob-green-dark">
              <Plus className="h-4 w-4" /> Aumento de Limite
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Aumento de Verba</DialogTitle>
              <DialogDescription>
                Descreva o valor adicional necessário e a justificativa para análise da Singular.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor Adicional (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Ex: 5000"
                  value={requestedAmount}
                  onChange={(event) => onAmountChange(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Justificativa</Label>
                <Textarea
                  id="reason"
                  placeholder="Descreva o motivo da solicitação..."
                  className="min-h-[100px]"
                  value={requestReason}
                  onChange={(event) => onReasonChange(event.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onDialogChange(false)}>
                Cancelar
              </Button>
              <Button disabled={!requestedAmount || !requestReason || isPending} onClick={onSubmit}>
                {isPending ? 'Enviando...' : 'Enviar Solicitação'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Progresso de Ocupação</span>
            <span className={cn(isCritical ? 'text-destructive' : 'text-sicoob-green')}>
              {ocupacaoPercent.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={ocupacaoPercent}
            className="h-3"
            indicatorClassName={isCritical ? 'bg-destructive' : 'bg-sicoob-green'}
          />
          <p className="text-xs text-muted-foreground">
            {formatCurrency(amounts.reservada)} reservado · {formatCurrency(amounts.comprometida)}{' '}
            empenhado · {formatCurrency(amounts.consumida)} consumido
          </p>
        </div>
        {isCritical && (
          <Alert
            variant="destructive"
            className="border-destructive/20 bg-destructive/5 text-destructive"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite Crítico</AlertTitle>
            <AlertDescription>
              Você atingiu mais de 90% da verba mensal. Novos pedidos podem exigir aprovação manual
              da Singular.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function PAWalletPage() {
  const { user, profile } = useAuth();
  const paId = profile?.pa_id;
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = React.useState(false);
  const [requestedAmount, setRequestedAmount] = React.useState('');
  const [requestReason, setRequestReason] = React.useState('');

  const { data: budget } = useQuery({
    queryKey: ['pa-budget', user?.id],
    queryFn: () => {
      if (!paId) return null;
      return sicoobBudgetService.getBudgetByPa(paId);
    },
    enabled: Boolean(paId),
    // A carteira reaberta dentro do cache mostrava a verba anterior a decisao
    // da Singular, e o proximo pedido era calculado sobre o valor velho.
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: requests } = useQuery({
    queryKey: ['budget-requests', paId],
    queryFn: () => {
      if (!paId) return [];
      return sicoobApprovalService.listLimitIncreaseRequests(paId);
    },
    enabled: Boolean(paId),
    refetchOnMount: 'always',
  });

  const amounts = readPaBudgetAmounts(budget);

  const createRequest = useMutation({
    mutationFn: () => {
      if (!paId) throw new Error('PA não identificado');
      return sicoobApprovalService.createLimitIncreaseRequest(
        paId,
        Number(requestedAmount),
        requestReason,
        amounts.planejada,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-requests'] });
      setIsRequestDialogOpen(false);
      setRequestedAmount('');
      setRequestReason('');
      toast.success('Solicitação enviada com sucesso!');
    },
    onError: (err: unknown) => {
      toast.error(
        'Erro ao enviar solicitação: ' + (err instanceof Error ? err.message : String(err)),
      );
    },
  });

  const currentPeriod = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <>
      <div className="container mx-auto animate-fade-in space-y-6 p-4 sm:p-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-display text-2xl font-bold tracking-tight text-sicoob-green-dark sm:text-3xl">
              Gestão de Verba
            </h1>
            <p className="text-sm italic text-muted-foreground">
              Controle seu saldo e garanta o abastecimento da sua agência.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 px-4 py-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium capitalize">{currentPeriod}</span>
          </div>
        </div>

        <BudgetKpis amounts={amounts} />

        <Tabs defaultValue="status" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2">
            <TabsTrigger value="status" className="gap-2">
              <TrendingUp className="h-4 w-4" /> Status da Verba
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <History className="h-4 w-4" /> Solicitações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status">
            <BudgetStatus
              amounts={amounts}
              isDialogOpen={isRequestDialogOpen}
              requestedAmount={requestedAmount}
              requestReason={requestReason}
              isPending={createRequest.isPending}
              onDialogChange={setIsRequestDialogOpen}
              onAmountChange={setRequestedAmount}
              onReasonChange={setRequestReason}
              onSubmit={() => createRequest.mutate()}
            />
          </TabsContent>

          <TabsContent value="requests">
            <RequestHistory requests={requests} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
