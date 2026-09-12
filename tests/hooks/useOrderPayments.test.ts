import { describe, expect, it } from 'vitest';
import { getSicoobFinancialDate } from '@/hooks/orders/extensions/useOrderPayments';

describe('getSicoobFinancialDate', () => {
  it('mantém o dia financeiro de Brasília antes da meia-noite local', () => {
    expect(getSicoobFinancialDate(new Date('2026-09-13T00:30:00.000Z'))).toBe('2026-09-12');
  });

  it('avança o dia depois da meia-noite em Brasília', () => {
    expect(getSicoobFinancialDate(new Date('2026-09-13T03:30:00.000Z'))).toBe('2026-09-13');
  });
});
