import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Scale, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { sicoobBudgetService, type BudgetPeriod } from "@/services/sicoob/budgetService";
import { BudgetEntriesDialog } from "@/components/sicoob/BudgetEntriesDialog";

export const BUDGET_AUDIT_QUERY_KEY = "sicoob-budget-audit";

type BudgetAuditRow = Awaited<ReturnType<typeof sicoobBudgetService.listBudgetAudit>>[number];

const CENTAVO = 0.005;

function formatCompetencia(ano: number | null, mes: number | null) {
  if (!ano || !mes) return "—";
  return `${String(mes).padStart(2, "0")}/${ano}`;
}

function hasDivergencia(row: BudgetAuditRow) {
  return Math.abs(row.discrepancia ?? 0) > CENTAVO;
}

function countDivergencias(rows: BudgetAuditRow[] | undefined) {
  return (rows ?? []).filter(hasDivergencia).length;
}

function toPeriodInput(period: BudgetPeriod) {
  return `${period.year}-${String(period.month).padStart(2, "0")}`;
}

function fromPeriodInput(value: string): BudgetPeriod | null {
  const [ano, mes] = value.split("-").map(Number);
  if (!ano || !mes) return null;
  return { year: ano, month: mes };
}

/** Abre na competência mais recente que o usuário pode ver, para a tela não nascer vazia. */
function useBudgetAuditData() {
  const { user } = useAuth();
  const [period, setPeriod] = React.useState<BudgetPeriod | null>(null);

  const {
    data: latestPeriod,
    isLoading: isLoadingPeriod,
    error: periodError,
  } = useQuery({
    queryKey: [BUDGET_AUDIT_QUERY_KEY, user?.id, "ultima-competencia"],
    queryFn: () => sicoobBudgetService.getLatestBudgetAuditPeriod(),
    staleTime: 60_000,
  });

  const effectivePeriod = period ?? latestPeriod ?? null;

  const {
    data: rows,
    isLoading: isLoadingRows,
    error,
  } = useQuery({
    queryKey: [BUDGET_AUDIT_QUERY_KEY, user?.id, effectivePeriod?.year, effectivePeriod?.month],
    queryFn: () => sicoobBudgetService.listBudgetAudit(effectivePeriod as BudgetPeriod),
    enabled: effectivePeriod !== null,
  });

  return {
    rows,
    error: (error ?? periodError) as Error | null,
    isLoading: isLoadingPeriod || isLoadingRows,
    period: effectivePeriod,
    setPeriod,
  };
}

function CompetenciaPicker({
  period,
  onChange,
}: {
  period: BudgetPeriod | null;
  onChange: (period: BudgetPeriod) => void;
}) {
  return (
    <Input
      type="month"
      aria-label="Competência da conciliação de verba"
      className="w-40"
      value={period ? toPeriodInput(period) : ""}
      onChange={(event) => {
        const next = fromPeriodInput(event.target.value);
        if (next) onChange(next);
      }}
    />
  );
}

function DiscrepanciaBadge({ row }: { row: BudgetAuditRow }) {
  if (!hasDivergencia(row)) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-status-delivered/20 bg-status-delivered/10 text-status-delivered"
      >
        <CheckCircle2 className="h-3 w-3" />
        Conciliado
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      {formatCurrency(row.discrepancia ?? 0)}
    </Badge>
  );
}

function BudgetAuditTable({
  rows,
  onDetalhar,
}: {
  rows: BudgetAuditRow[];
  onDetalhar: (row: BudgetAuditRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>PA</TableHead>
          <TableHead>Competência</TableHead>
          <TableHead>Verba total</TableHead>
          <TableHead>Registrada</TableHead>
          <TableHead>Calculado nos pedidos</TableHead>
          <TableHead>Situação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={`${row.pa_id}-${row.ano}-${row.mes}`}
            className={hasDivergencia(row) ? "bg-destructive/5 cursor-pointer hover:bg-destructive/10" : "cursor-pointer"}
            onClick={() => onDetalhar(row)}
            title="Ver os lançamentos que compõem este saldo"
          >
            <TableCell className="font-medium">{row.pa_nome ?? "PA sem nome"}</TableCell>
            <TableCell>{formatCompetencia(row.ano, row.mes)}</TableCell>
            <TableCell>{formatCurrency(row.verba_total ?? 0)}</TableCell>
            <TableCell>{formatCurrency(row.verba_registrada ?? 0)}</TableCell>
            <TableCell>{formatCurrency(row.verba_calculada_pedidos ?? 0)}</TableCell>
            <TableCell className="flex items-center gap-1">
              <DiscrepanciaBadge row={row} />
              <Search className="h-3 w-3 text-muted-foreground" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BudgetAuditStatus({
  isLoading,
  error,
  rows,
}: {
  isLoading: boolean;
  error: Error | null;
  rows: BudgetAuditRow[] | undefined;
}) {
  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Não foi possível carregar a conciliação</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <Alert>
        <Scale className="h-4 w-4" />
        <AlertTitle>Sem verba registrada nesta competência</AlertTitle>
        <AlertDescription>
          Use o seletor de competência para conferir outro mês ou aguarde o lançamento da verba dos PAs.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

function DivergenciaAlert({ count }: { count: number }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>
        {count} PA(s) com divergência entre verba registrada e pedidos confirmados
      </AlertTitle>
      <AlertDescription>
        Conferir os pedidos do mês antes de liberar novo compromisso de verba.
      </AlertDescription>
    </Alert>
  );
}

function DetalheDaVerba({ linha, aoFechar }: { linha: BudgetAuditRow | null; aoFechar: () => void }) {
  if (!linha?.pa_id) return null;
  return (
    <BudgetEntriesDialog
      aberto
      aoMudarAbertura={(aberto) => {
        if (!aberto) aoFechar();
      }}
      paId={linha.pa_id}
      paNome={linha.pa_nome}
      ano={linha.ano ?? 0}
      mes={linha.mes ?? 0}
    />
  );
}

export function BudgetAuditCard() {
  const { rows, error, isLoading, period, setPeriod } = useBudgetAuditData();
  const [detalhe, setDetalhe] = React.useState<BudgetAuditRow | null>(null);
  const divergentes = countDivergencias(rows);
  const temLinhas = Boolean(rows && rows.length > 0);

  return (
    <Card className="border-[1.5px]">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-sicoob-green" />
            Conciliação de Verba
          </CardTitle>
          <CardDescription>
            Compara o consumo registrado na verba com a soma dos pedidos confirmados no mês.
          </CardDescription>
        </div>
        <CompetenciaPicker period={period} onChange={setPeriod} />
      </CardHeader>
      <CardContent className="space-y-4">
        <BudgetAuditStatus isLoading={isLoading} error={error} rows={rows} />
        {temLinhas && divergentes > 0 && <DivergenciaAlert count={divergentes} />}
        {temLinhas && !isLoading && !error && (
          <BudgetAuditTable rows={rows ?? []} onDetalhar={setDetalhe} />
        )}
      </CardContent>
      <DetalheDaVerba linha={detalhe} aoFechar={() => setDetalhe(null)} />
    </Card>
  );
}

export default BudgetAuditCard;
