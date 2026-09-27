import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Palette,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useOrderProductionReadiness } from '@/hooks/orders/extensions';
import type { OrderStatus } from '@/types/sicoob/orders';
import { isCommittedSicoobOrder } from '@/utils/sicoob/orderFinancials';
import { cn } from '@/lib/utils';

interface OrderProductionReadinessProps {
  orderId: string;
  orderStatus: OrderStatus;
  requiresArtwork: boolean;
}

const artworkStatusLabels = {
  pending: 'Aguardando aprovação',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  revision: 'Revisão solicitada',
} as const;

function getArtworkLabel(
  latestArtwork: ReturnType<typeof useOrderProductionReadiness>['data'],
  artworkIsRequired: boolean,
  isLoading: boolean,
  hasError: boolean,
) {
  if (isLoading) return 'Verificando…';
  if (hasError) return 'Consulta indisponível';
  if (!artworkIsRequired) return 'Não exigida';
  if (!latestArtwork) return 'Ainda não enviada';
  return `${artworkStatusLabels[latestArtwork.status]} · v${latestArtwork.version}`;
}

function Requirement({
  icon: iconComponent,
  label,
  value,
  state,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  state: 'success' | 'warning' | 'destructive';
}) {
  const Icon = iconComponent;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-background/80 px-3 py-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <Badge variant={state}>{value}</Badge>
    </div>
  );
}

function getReadinessViewModel(input: {
  expenseAuthorized: boolean;
  artworkIsRequired: boolean;
  latestArtwork: ReturnType<typeof useOrderProductionReadiness>['data'];
  isLoading: boolean;
  error: Error | null;
}) {
  const { expenseAuthorized, artworkIsRequired, latestArtwork, isLoading, error } = input;
  const artworkApproved =
    !isLoading && !error && (!artworkIsRequired || latestArtwork?.status === 'approved');
  const ready = expenseAuthorized && artworkApproved;
  let artworkState: 'success' | 'warning' | 'destructive' = 'warning';
  if (artworkApproved) artworkState = 'success';
  if (error) artworkState = 'destructive';

  let StatusIcon = CircleDashed;
  let statusIconClass = 'text-amber-700';
  if (error) {
    StatusIcon = AlertCircle;
    statusIconClass = 'text-destructive';
  }
  if (ready) {
    StatusIcon = CheckCircle2;
    statusIconClass = 'text-success';
  }

  return {
    artworkLabel: getArtworkLabel(latestArtwork, artworkIsRequired, isLoading, Boolean(error)),
    artworkState,
    ready,
    StatusIcon,
    statusIconClass,
  };
}

export function OrderProductionReadiness(props: OrderProductionReadinessProps) {
  const { orderId, orderStatus, requiresArtwork } = props;
  const { data: latestArtwork, isLoading, error } = useOrderProductionReadiness(orderId);
  const expenseAuthorized = isCommittedSicoobOrder({ status: orderStatus });
  const artworkIsRequired = requiresArtwork || Boolean(latestArtwork);
  const { artworkLabel, artworkState, ready, StatusIcon, statusIconClass } = getReadinessViewModel({
    expenseAuthorized,
    artworkIsRequired,
    latestArtwork,
    isLoading,
    error,
  });

  return (
    <Alert
      aria-live="polite"
      className={cn(
        'border-[1.5px]',
        ready ? 'border-success/30 bg-success/5' : 'border-amber-300/60 bg-amber-50/60',
      )}
    >
      <StatusIcon className={cn('h-5 w-5', statusIconClass)} />
      <AlertTitle>
        {ready ? 'Pré-requisitos de produção atendidos' : 'Produção ainda não liberada'}
      </AlertTitle>
      <AlertDescription className="mt-3 space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Requirement
            icon={WalletCards}
            label="Autorização da despesa"
            value={expenseAuthorized ? 'Autorizada' : 'Pendente'}
            state={expenseAuthorized ? 'success' : 'warning'}
          />
          <Requirement
            icon={Palette}
            label="Arte vigente"
            value={artworkLabel}
            state={artworkState}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          A aprovação da arte e a autorização da despesa são decisões independentes. Quando ambas
          forem exigidas, as duas precisam estar concluídas antes do início da produção.
        </p>
      </AlertDescription>
    </Alert>
  );
}
