import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  costCenterService,
  type CostCenter,
  type OrderAllocation,
} from '@/services/sicoob/costCenterService';
import { buildAllocationPayload } from '@/lib/sicoob/orderCostCenterAllocation';

interface Row {
  cost_center_id: string;
  valor: string;
}

interface Props {
  orderId: string;
  orderTotal: number;
  orderStatus?: string | null;
  cooperativeId?: string | null;
  paId?: string | null;
}

// Status que ja comprometem verba: o rateio nao pode ficar defasado neles,
// senao o livro aponta para um centro e o pedido consome em outro.
const STATUS_EM_VERBA = [
  'waiting_approval',
  'escalated_to_board',
  'confirmed',
  'logistic',
  'in_production',
  'in_separation',
  'in_transit',
  'delivered',
  'completed',
];

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Erro desconhecido';

const toRows = (allocations: OrderAllocation[]): Row[] =>
  allocations.map((a) => ({ cost_center_id: a.cost_center_id ?? '', valor: String(a.valor) }));

const totalOf = (rows: Row[]) => rows.reduce((sum, row) => sum + (Number(row.valor) || 0), 0);

const buildPayload = buildAllocationPayload;

// eslint-disable-next-line max-lines-per-function -- linha de rateio com tres campos e acoes; extrair pioraria a leitura
function AllocationRow({
  row,
  index,
  costCenters,
  onChange,
  onRemove,
}: {
  row: Row;
  index: number;
  costCenters: CostCenter[];
  onChange: (index: number, patch: Partial<Row>) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Label className="text-xs">Centro de custo</Label>
        <Select
          value={row.cost_center_id}
          onValueChange={(value) => onChange(index, { cost_center_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {costCenters.map((cc) => (
              <SelectItem key={cc.id} value={cc.id}>
                {cc.codigo} — {cc.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-32 space-y-1">
        <Label className="text-xs">Valor (R$)</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={row.valor}
          onChange={(e) => onChange(index, { valor: e.target.value })}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        aria-label="Remover linha de rateio"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AllocationFooter({
  rows,
  orderTotal,
  totalAlocado,
  fecha100,
  canSave,
  isSaving,
  onAdd,
  onSave,
}: {
  rows: Row[];
  orderTotal: number;
  totalAlocado: number;
  fecha100: boolean;
  canSave: boolean;
  isSaving: boolean;
  onAdd: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-t pt-2 text-xs">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="mr-1 h-3 w-3" /> Adicionar
          </Button>
          {rows.length > 0 && (
            <Badge variant={fecha100 ? 'default' : 'destructive'} className="gap-1">
              {fecha100 ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              R$ {totalAlocado.toLocaleString('pt-BR')} de R$ {orderTotal.toLocaleString('pt-BR')}
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={onSave} disabled={isSaving || !canSave}>
          {isSaving ? 'Salvando…' : 'Salvar rateio'}
        </Button>
      </div>
      {rows.length > 0 && !fecha100 && (
        <p className="text-[11px] text-destructive">
          Ajuste os valores para somar o total do pedido antes de salvar.
        </p>
      )}
    </>
  );
}

/**
 * A cooperativa do pedido e historica: quando o PA e transferido para outra
 * Singular, o pedido antigo guarda a cooperativa de origem e o servidor (que
 * valida pela cooperativa atual do PA) recusaria todos esses centros.
 */
function useCooperativaDoPa(paId: string | null | undefined, fallback: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['pa_cooperativa', paId ?? 'sem-pa'],
    queryFn: () => costCenterService.cooperativaDoPa(paId as string),
    enabled: Boolean(paId),
  });
  return data ?? fallback;
}

// eslint-disable-next-line max-lines-per-function -- componente preexistente de 93 linhas; esta PR acrescenta validacao de linha
export function OrderCostCenterAllocation({
  orderId,
  orderTotal,
  orderStatus,
  cooperativeId,
  paId,
}: Props) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);

  const cooperativaReferencia = useCooperativaDoPa(paId, cooperativeId);

  const { data: costCenters } = useQuery({
    queryKey: ['cost_centers', cooperativaReferencia ?? 'todas'],
    queryFn: () => costCenterService.list(cooperativaReferencia),
  });

  const { data: allocations, isLoading } = useQuery({
    queryKey: ['pa_budget_allocations', orderId],
    queryFn: () => costCenterService.listAllocations(orderId),
  });

  useEffect(() => {
    if (allocations) setRows(toRows(allocations));
  }, [allocations]);

  const totalAlocado = totalOf(rows);
  const fecha100 = Math.abs(totalAlocado - orderTotal) <= 0.01;
  const centrosAtivos = (costCenters ?? []).filter((cc) => cc.ativo);
  const pedidoConfirmado = Boolean(orderStatus && STATUS_EM_VERBA.includes(orderStatus));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!fecha100) {
        throw new Error(
          `O rateio soma R$ ${totalAlocado.toLocaleString('pt-BR')}, mas o pedido vale R$ ${orderTotal.toLocaleString('pt-BR')}.`,
        );
      }
      return costCenterService.replaceAllocations(orderId, buildPayload(orderTotal, rows));
    },
    onSuccess: () => {
      toast.success('Rateio salvo');
      void queryClient.invalidateQueries({ queryKey: ['pa_budget_allocations', orderId] });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const atualizar = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          <Building2 className="h-4 w-4" /> Rateio por Centro de Custo
        </CardTitle>
        <CardDescription>
          A verba consumida por este pedido é alocada entre centros de custo. O rateio precisa
          fechar o valor total.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando rateio…</p>
        ) : (
          <>
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Sem rateio: o pedido fica integralmente no centro de custo do PA.
              </p>
            )}
            {rows.map((row, index) => (
              <AllocationRow
                key={index}
                row={row}
                index={index}
                costCenters={centrosAtivos}
                onChange={atualizar}
                onRemove={(i) => setRows((prev) => prev.filter((_, idx) => idx !== i))}
              />
            ))}
            <AllocationFooter
              rows={rows}
              orderTotal={orderTotal}
              totalAlocado={totalAlocado}
              fecha100={fecha100}
              canSave={
                rows.length === 0 || (fecha100 && rows.every((row) => Boolean(row.cost_center_id)))
              }
              isSaving={saveMutation.isPending}
              onAdd={() => setRows((prev) => [...prev, { cost_center_id: '', valor: '' }])}
              onSave={() => saveMutation.mutate()}
            />
            {pedidoConfirmado && (
              <p className="text-[11px] text-muted-foreground">
                Pedido já confirmado: alterar o rateio revalida a soma no servidor.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
