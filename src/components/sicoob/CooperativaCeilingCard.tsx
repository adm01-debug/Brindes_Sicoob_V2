import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/format';
import {
  COOPERATIVA_CEILING_QUERY_KEY,
  cooperativaCeilingQueryKey,
  loadCeiling,
  loadDistributedTotal,
  saveCeiling,
} from '@/services/sicoob/cooperativaBudgetService';

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

export function competenceLabel(ano: number, mes: number): string {
  return `${MESES[(mes - 1) % 12] ?? String(mes)}/${ano}`;
}

function shiftCompetence(ano: number, mes: number, delta: number): { ano: number; mes: number } {
  const index = ano * 12 + (mes - 1) + delta;
  return { ano: Math.floor(index / 12), mes: (index % 12) + 1 };
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

interface TetoFormProps {
  cooperativaId: string;
  ano: number;
  mes: number;
  atual: number | null;
}

function TetoForm({ cooperativaId, ano, mes, atual }: TetoFormProps) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState(atual === null ? '' : String(atual));
  const valorNumerico = parseAmount(valor);

  const mutation = useMutation({
    mutationFn: (verbaTotal: number) => saveCeiling({ cooperativaId, ano, mes, verbaTotal }),
    onSuccess: async () => {
      toast.success('Teto da cooperativa salvo');
      await queryClient.invalidateQueries({ queryKey: cooperativaCeilingQueryKey() });
    },
    onError: (error: unknown) => {
      toast.error('Não foi possível salvar o teto', { description: errorMessage(error) });
    },
  });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground" htmlFor="teto-cooperativa">
          Teto mensal (R$)
        </label>
        <Input
          id="teto-cooperativa"
          type="number"
          min="0"
          step="0.01"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          aria-invalid={valorNumerico === null}
          aria-describedby={valorNumerico === null ? 'teto-cooperativa-erro' : undefined}
          className="w-40"
        />
      </div>
      <Button
        size="sm"
        onClick={() => valorNumerico !== null && mutation.mutate(valorNumerico)}
        disabled={mutation.isPending || valorNumerico === null}
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar teto'}
      </Button>
      {valorNumerico === null && (
        <p id="teto-cooperativa-erro" className="text-xs text-destructive">
          Informe o teto em reais. Use 0 para bloquear novas verbas na competência.
        </p>
      )}
    </div>
  );
}

interface CeilingBodyProps {
  cooperativaId: string;
  ano: number;
  mes: number;
  podeEditar: boolean;
}

function useTetoData(cooperativaId: string, ano: number, mes: number) {
  const tetoQuery = useQuery({
    queryKey: [COOPERATIVA_CEILING_QUERY_KEY, cooperativaId, ano, mes],
    queryFn: () => loadCeiling(cooperativaId, ano, mes),
    refetchOnMount: 'always',
  });
  const distribuidoQuery = useQuery({
    queryKey: [COOPERATIVA_CEILING_QUERY_KEY, cooperativaId, ano, mes, 'distribuido'],
    queryFn: () => loadDistributedTotal(cooperativaId, ano, mes),
    refetchOnMount: 'always',
  });

  return {
    isLoading: tetoQuery.isLoading || distribuidoQuery.isLoading,
    erro: tetoQuery.error ?? distribuidoQuery.error,
    teto: tetoQuery.data?.verbaTotal ?? null,
    distribuido: distribuidoQuery.data ?? 0,
  };
}

function ErroAlert({ erro }: { erro: unknown }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Não foi possível carregar o teto</AlertTitle>
      <AlertDescription>{errorMessage(erro)}</AlertDescription>
    </Alert>
  );
}

function Resumo({ teto, distribuido }: { teto: number | null; distribuido: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Teto" value={teto === null ? 'não definido' : formatCurrency(teto)} />
      <Stat label="Distribuído aos PAs" value={formatCurrency(distribuido)} />
      <Stat label="Disponível" value={teto === null ? '—' : formatCurrency(teto - distribuido)} />
    </div>
  );
}

function ExcessoAlert({ teto, distribuido }: { teto: number; distribuido: number }) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Verbas acima do teto</AlertTitle>
      <AlertDescription>
        As verbas dos PAs somam {formatCurrency(distribuido)}, {formatCurrency(distribuido - teto)}{' '}
        acima do teto de {formatCurrency(teto)}. Reduza a verba de algum PA ou aumente o teto.
      </AlertDescription>
    </Alert>
  );
}

function CeilingBody({ cooperativaId, ano, mes, podeEditar }: CeilingBodyProps) {
  const { isLoading, erro, teto, distribuido } = useTetoData(cooperativaId, ano, mes);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (erro) return <ErroAlert erro={erro} />;

  const excedido = teto !== null && distribuido > teto;

  return (
    <>
      <Resumo teto={teto} distribuido={distribuido} />
      {excedido && <ExcessoAlert teto={teto ?? 0} distribuido={distribuido} />}
      {podeEditar ? (
        <TetoForm
          key={`${cooperativaId}-${ano}-${mes}`}
          cooperativaId={cooperativaId}
          ano={ano}
          mes={mes}
          atual={teto}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Somente o gestor da cooperativa define o teto.
        </p>
      )}
    </>
  );
}

function TetoHeader({
  competencia,
  onShift,
}: {
  competencia: { ano: number; mes: number };
  onShift: (delta: number) => void;
}) {
  return (
    <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <CardTitle>Teto da cooperativa</CardTitle>
        <CardDescription>
          Limite mensal que a soma das verbas dos PAs não pode ultrapassar ·{' '}
          {competenceLabel(competencia.ano, competencia.mes)}
        </CardDescription>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Competência anterior"
          onClick={() => onShift(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Próxima competência"
          onClick={() => onShift(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </CardHeader>
  );
}

export function CooperativaCeilingCard() {
  const { cooperativaId, isGestorCompras, rolesRaw } = useAuth();
  const hoje = new Date();
  const [competencia, setCompetencia] = useState({
    ano: hoje.getFullYear(),
    mes: hoje.getMonth() + 1,
  });
  // Mesma regra das policies de escrita de cooperativa_budgets: papel estrito
  // `admin` (rolesRaw, sem a normalização admin→supervisor) ou gestor de compras.
  const podeEditar =
    Boolean(cooperativaId) && (Boolean(isGestorCompras) || (rolesRaw ?? []).includes('admin'));

  return (
    <Card>
      <TetoHeader
        competencia={competencia}
        onShift={(delta) =>
          setCompetencia(shiftCompetence(competencia.ano, competencia.mes, delta))
        }
      />
      <CardContent className="space-y-4">
        {cooperativaId ? (
          <CeilingBody
            cooperativaId={cooperativaId}
            ano={competencia.ano}
            mes={competencia.mes}
            podeEditar={podeEditar}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Sua conta não está vinculada a uma cooperativa, então não há teto a definir.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default CooperativaCeilingCard;
