import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScrollLockFix } from "@/hooks/useScrollLockFix";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export interface LancamentoDeVerba {
  id: string;
  competencia_ano: number;
  competencia_mes: number;
  tipo: string;
  estado: string;
  valor: number;
  motivo: string | null;
  order_id: string | null;
  created_at: string;
}

export interface ReconciliacaoDeVerba {
  pa_budget_id: string | null;
  planejado: number;
  reservado_agregado: number;
  reservado_livro: number;
  comprometido_agregado: number;
  comprometido_livro: number;
  consumido_agregado: number;
  consumido_livro: number;
  divergente: boolean;
}

const numeroOuZero = (valor: unknown) => {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
};

/**
 * O saldo em `pa_budgets` e um agregado; `pa_budget_entries` e o livro que o
 * compoe. Sem esta comparacao, um consumo lancado sem pedido atribuivel
 * aparece no saldo sem nenhuma linha que o explique.
 */
export function normalizarReconciliacao(bruto: unknown): ReconciliacaoDeVerba | null {
  if (!bruto || typeof bruto !== "object") return null;
  const r = bruto as Record<string, unknown>;
  return {
    pa_budget_id: typeof r.pa_budget_id === "string" ? r.pa_budget_id : null,
    planejado: numeroOuZero(r.planejado),
    reservado_agregado: numeroOuZero(r.reservado_agregado),
    reservado_livro: numeroOuZero(r.reservado_livro),
    comprometido_agregado: numeroOuZero(r.comprometido_agregado),
    comprometido_livro: numeroOuZero(r.comprometido_livro),
    consumido_agregado: numeroOuZero(r.consumido_agregado),
    consumido_livro: numeroOuZero(r.consumido_livro),
    divergente: r.divergente === true,
  };
}

export function totalDoLivro(lancamentos: LancamentoDeVerba[], estado: string): number {
  return lancamentos
    .filter((l) => l.estado === estado)
    .reduce((soma, l) => soma + numeroOuZero(l.valor), 0);
}

export function origemDoLancamento(lancamento: LancamentoDeVerba): string {
  return lancamento.order_id ? "Pedido" : "Sem pedido atribuível";
}

/** Lancamentos sem pedido sao os que a conciliacao por pedidos nao consegue explicar. */
export function lancamentosSemPedido(lancamentos: LancamentoDeVerba[]): LancamentoDeVerba[] {
  return lancamentos.filter((l) => !l.order_id);
}

export function competenciaDoLancamento(lancamento: LancamentoDeVerba): string {
  const mes = String(lancamento.competencia_mes).padStart(2, "0");
  return `${mes}/${lancamento.competencia_ano}`;
}

function SeloDeConciliacao({ reconciliacao }: { reconciliacao: ReconciliacaoDeVerba | null }) {
  if (!reconciliacao) {
    return (
      <span className="text-xs text-muted-foreground">
        Não foi possível conciliar o saldo com o livro de lançamentos.
      </span>
    );
  }
  if (!reconciliacao.divergente) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-status-delivered">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Saldo confere com o livro de lançamentos
      </span>
    );
  }
  return (
    <span className="flex items-start gap-1.5 text-xs text-destructive font-medium">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>
        Saldo divergente do livro — reservado {formatCurrency(reconciliacao.reservado_agregado)} (livro{" "}
        {formatCurrency(reconciliacao.reservado_livro)}) · comprometido{" "}
        {formatCurrency(reconciliacao.comprometido_agregado)} (livro{" "}
        {formatCurrency(reconciliacao.comprometido_livro)}) · consumido{" "}
        {formatCurrency(reconciliacao.consumido_agregado)} (livro{" "}
        {formatCurrency(reconciliacao.consumido_livro)})
      </span>
    </span>
  );
}

function TabelaDoLivro({ lancamentos }: { lancamentos: LancamentoDeVerba[] }) {
  if (lancamentos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhum lançamento nesta competência.
      </p>
    );
  }
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quando</TableHead>
            <TableHead>Competência</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lancamentos.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="whitespace-nowrap text-xs">
                {new Date(l.created_at).toLocaleDateString("pt-BR")}
              </TableCell>
              <TableCell className="whitespace-nowrap text-xs">{competenciaDoLancamento(l)}</TableCell>
              <TableCell>
                <Badge variant={l.estado === "consumido" ? "default" : "secondary"}>{l.estado}</Badge>
              </TableCell>
              <TableCell className="text-xs">{origemDoLancamento(l)}</TableCell>
              <TableCell className="text-xs max-w-[22rem]">{l.motivo || "—"}</TableCell>
              <TableCell className="text-right font-medium whitespace-nowrap">
                {formatCurrency(numeroOuZero(l.valor))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ResumoDosTotais({
  lancamentos,
  semPedido,
  reconciliacao,
}: {
  lancamentos: LancamentoDeVerba[];
  semPedido: LancamentoDeVerba[];
  reconciliacao: ReconciliacaoDeVerba | null;
}) {
  const totalSemPedido = semPedido
    .filter((l) => l.estado === "consumido")
    .reduce((soma, l) => soma + numeroOuZero(l.valor), 0);
  const existeDivergencia = reconciliacao?.divergente === true;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs text-muted-foreground">Consumido no livro</div>
          <div className="font-semibold">{formatCurrency(totalDoLivro(lancamentos, "consumido"))}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Comprometido no livro</div>
          <div className="font-semibold">{formatCurrency(totalDoLivro(lancamentos, "comprometido"))}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Reservado no livro</div>
          <div className="font-semibold">{formatCurrency(totalDoLivro(lancamentos, "reservado"))}</div>
        </div>
      </div>
      {totalSemPedido > 0 && (
        <p className="text-xs text-muted-foreground">
          {formatCurrency(totalSemPedido)} de consumo não vem de nenhum pedido.{" "}
          {existeDivergencia
            ? "É o que explica a maior parte da discrepância na coluna “Calculado nos pedidos”."
            : "O livro e o agregado conferem, mas esse valor justifica a diferença na coluna “Calculado nos pedidos”."}
        </p>
      )}
    </div>
  );
}

export interface PropsDoDetalhe {
  aberto: boolean;
  aoMudarAbertura: (aberto: boolean) => void;
  paId: string;
  paNome: string | null;
  ano: number;
  mes: number;
  /** Botão que abriu o detalhe; recebe o foco de volta quando o diálogo fecha. */
  gatilhoAtual?: HTMLElement | null;
}

function AvisosDeFalha({
  reconciliacao,
  lancamentos,
}: {
  reconciliacao: ReturnType<typeof useQuery>;
  lancamentos: ReturnType<typeof useQuery>;
}) {
  return (
    <>
      {reconciliacao.isError && (
        <p className="text-xs text-destructive">
          Falha ao conciliar: {(reconciliacao.error as Error)?.message ?? "erro desconhecido"}
        </p>
      )}
      {lancamentos.isError && (
        <p className="text-xs text-destructive">
          Falha ao ler os lançamentos: {(lancamentos.error as Error)?.message ?? "erro desconhecido"}
        </p>
      )}
    </>
  );
}

function ConteudoDoLivro({
  reconciliacao,
  lancamentos,
}: {
  reconciliacao: ReconciliacaoDeVerba | null;
  lancamentos: LancamentoDeVerba[];
}) {
  return (
    <>
      <SeloDeConciliacao reconciliacao={reconciliacao} />
      <ResumoDosTotais
        lancamentos={lancamentos}
        semPedido={lancamentosSemPedido(lancamentos)}
        reconciliacao={reconciliacao}
      />
      <TabelaDoLivro lancamentos={lancamentos} />
    </>
  );
}

export function BudgetEntriesDialog({ aberto, aoMudarAbertura, paId, paNome, ano, mes, gatilhoAtual }: PropsDoDetalhe) {
  const lancamentosQuery = useQuery({
    queryKey: ["pa_budget_entries", paId, ano, mes],
    enabled: aberto && !!paId,
    refetchOnMount: "always",
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pa_budget_entries")
        .select("id, competencia_ano, competencia_mes, tipo, estado, valor, motivo, order_id, created_at")
        .eq("pa_id", paId)
        .eq("competencia_ano", ano)
        .eq("competencia_mes", mes)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LancamentoDeVerba[];
    },
  });

  const reconciliacaoQuery = useQuery({
    queryKey: ["pa_budget_reconcile", paId, ano, mes],
    enabled: aberto && !!paId,
    refetchOnMount: "always",
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("pa_budget_reconcile", {
        p_pa_id: paId,
        p_ano: ano,
        p_mes: mes,
      });
      if (error) throw error;
      const primeira = Array.isArray(data) ? data[0] : data;
      return normalizarReconciliacao(primeira);
    },
  });

  const lancamentos = lancamentosQuery.data ?? [];
  const carregando = lancamentosQuery.isLoading || reconciliacaoQuery.isLoading;
  const competencia = `${String(mes).padStart(2, "0")}/${ano}`;
  // onCloseAutoFocus sobrescreve a limpeza do DialogContent, entao a rolagem
  // fica a cargo do hook, que respeita outras sobreposicoes abertas.
  useScrollLockFix();

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAbertura}>
      <DialogContent
        className="max-w-4xl"
        onCloseAutoFocus={(evento) => {
          if (!gatilhoAtual) return;
          // Só o foco é redirecionado; a limpeza de rolagem continua sendo feita
          // pelo DialogContent, que executa este callback antes do próprio handler.
          gatilhoAtual.focus();
          evento.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Lançamentos da verba — {paNome || "PA"}</DialogTitle>
          <DialogDescription>
            Competência {competencia}. Cada linha é um evento que compôs o saldo consumido, reservado ou
            comprometido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <AvisosDeFalha reconciliacao={reconciliacaoQuery} lancamentos={lancamentosQuery} />
          {carregando ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando lançamentos…
            </div>
          ) : lancamentosQuery.isError || reconciliacaoQuery.isError ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Não foi possível ler o livro desta competência. Os totais ficam ocultos até a leitura
              funcionar — ausência de lançamentos não foi confirmada.
            </p>
          ) : (
            <ConteudoDoLivro
              reconciliacao={reconciliacaoQuery.data ?? null}
              lancamentos={lancamentos}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}