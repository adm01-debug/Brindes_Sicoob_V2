import { describe, expect, it } from 'vitest';
import {
  parseOrderQuery,
  parseQuoteQuery,
  parseSicoobOrderQuery,
  reconcileSicoobReferences,
  toApiDateRange,
  writeOrderQuery,
  writeQuoteQuery,
  writeSicoobOrderQuery,
} from '@/lib/navigation/filter-query';
import { ORDER_IN_PROGRESS_STATUSES, ORDER_STATUS_COLORS, ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from '@/constants/orders';

describe('filtros persistidos na URL', () => {
  it('mantém labels, cores e estados em andamento alinhados ao funil de pedidos', () => {
    expect(Object.keys(ORDER_STATUS_LABELS)).toEqual(ORDER_STATUS_FLOW);
    expect(Object.keys(ORDER_STATUS_COLORS)).toEqual(ORDER_STATUS_FLOW);
    expect([...ORDER_IN_PROGRESS_STATUSES]).toEqual(ORDER_STATUS_FLOW.slice(1, -2));
  });

  it('valida e canoniza filtros de pedidos sem apagar parâmetros desconhecidos', () => {
    const original = new URLSearchParams(
      'search=%20caneca%20&status=invalido&page=-2&from=2026-02-30&extra=1',
    );
    const parsed = parseOrderQuery(original);

    expect(parsed).toMatchObject({ search: ' caneca ', status: 'all', page: 1 });
    expect(parsed.dateRange).toBeUndefined();

    const canonical = writeOrderQuery(original, parsed);
    expect(canonical.get('search')).toBe(' caneca ');
    expect(canonical.get('status')).toBeNull();
    expect(canonical.get('page')).toBeNull();
    expect(canonical.get('from')).toBeNull();
    expect(canonical.get('extra')).toBe('1');
  });

  it('restaura página, status e datas válidas de pedidos', () => {
    const parsed = parseOrderQuery(
      new URLSearchParams('status=em_transporte&page=3&from=2026-10-01&to=2026-10-16'),
    );

    expect(parsed.status).toBe('em_transporte');
    expect(parsed.page).toBe(3);
    expect(parsed.dateRange?.from?.getFullYear()).toBe(2026);
    expect(parsed.dateRange?.to?.getDate()).toBe(16);
  });

  it('inclui o dia final inteiro no intervalo enviado ao banco', () => {
    const range = toApiDateRange({
      from: new Date(2026, 9, 1, 14, 30),
      to: new Date(2026, 9, 16, 8, 15),
    });

    expect(new Date(range.startDate!).getHours()).toBe(0);
    expect(new Date(range.endDateExclusive!).getDate()).toBe(17);
    expect(new Date(range.endDateExclusive!).getHours()).toBe(0);
    expect(new Date(range.endDateExclusive!).getMinutes()).toBe(0);
  });

  it('preserva parâmetros desconhecidos já na primeira alteração de orçamento', () => {
    const original = new URLSearchParams('extra=1');
    const next = writeQuoteQuery(original, {
      ...parseQuoteQuery(original),
      searchTerm: 'cooperativa',
    });

    expect(next.toString()).toContain('extra=1');
    expect(next.get('q')).toBe('cooperativa');
  });

  it('preserva o espaço final enquanto o usuário digita uma busca composta', () => {
    const first = writeQuoteQuery(new URLSearchParams(), {
      ...parseQuoteQuery(new URLSearchParams()), searchTerm: 'caneca ',
    });
    const second = writeQuoteQuery(first, { ...parseQuoteQuery(first), searchTerm: 'caneca verde' });

    expect(parseQuoteQuery(first).searchTerm).toBe('caneca ');
    expect(parseQuoteQuery(second).searchTerm).toBe('caneca verde');
  });

  it('torna visível a data final isolada e canoniza intervalos invertidos', () => {
    const onlyTo = parseOrderQuery(new URLSearchParams('to=2026-10-16'));
    const inverted = parseOrderQuery(new URLSearchParams('from=2026-10-20&to=2026-10-01'));

    expect(onlyTo.dateRange?.from?.getDate()).toBe(16);
    expect(onlyTo.dateRange?.to?.getDate()).toBe(16);
    expect(inverted.dateRange?.from?.getDate()).toBe(1);
    expect(inverted.dateRange?.to?.getDate()).toBe(20);
  });

  it('rejeita paginação fora do limite operacional', () => {
    expect(parseOrderQuery(new URLSearchParams('page=10001')).page).toBe(1);
  });

  it('rejeita status e ordenação inválidos de orçamento', () => {
    const original = new URLSearchParams('q=%20teste%20&status=apagado&order=aleatorio&extra=1');
    const parsed = parseQuoteQuery(original);
    const canonical = writeQuoteQuery(original, parsed);

    expect(parsed).toEqual({ searchTerm: ' teste ', statusFilter: 'all', sortBy: 'newest' });
    expect(canonical.get('status')).toBeNull();
    expect(canonical.get('order')).toBeNull();
    expect(canonical.get('extra')).toBe('1');
  });

  it.each(['viewed', 'revision', 'approved_singular', 'converted'])(
    'aceita o status real de orçamento %s',
    (status) => expect(parseQuoteQuery(new URLSearchParams(`status=${status}`)).statusFilter).toBe(status),
  );

  it('canoniza filtros Sicoob e mantém identificadores válidos de PA e Singular', () => {
    const original = new URLSearchParams(
      'status=confirmed&pa=pa-7&singular=singular-2&page=4&extra=sim',
    );
    const parsed = parseSicoobOrderQuery(original);
    const canonical = writeSicoobOrderQuery(original, parsed);

    expect(parsed).toMatchObject({
      statusFilter: 'confirmed',
      paFilter: 'pa-7',
      singularFilter: 'singular-2',
      page: 4,
    });
    expect(canonical.get('extra')).toBe('sim');
  });

  it('remove referências Sicoob inexistentes somente depois de carregar as opções', () => {
    const filters = parseSicoobOrderQuery(new URLSearchParams('pa=pa-inexistente&singular=singular-ok&page=4'));

    expect(reconcileSicoobReferences(filters)).toBe(filters);
    expect(reconcileSicoobReferences(filters, new Set(['pa-ok']), new Set(['singular-ok']))).toMatchObject({
      paFilter: 'all', singularFilter: 'singular-ok', page: 1,
    });
  });
});
