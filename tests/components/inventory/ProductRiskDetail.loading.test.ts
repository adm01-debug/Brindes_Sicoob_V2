import { describe, expect, it } from 'vitest';
import { shouldShowProductRiskLoading } from '@/components/inventory/risk/ProductRiskDetail';

describe('estado de carregamento dos dados de risco', () => {
  it('mantém o skeleton enquanto alguma fonte ainda carrega e nenhuma retornou dados', () => {
    expect(shouldShowProductRiskLoading(false, [false, true, true])).toBe(true);
  });

  it('não substitui dados já carregados por skeleton de outra fonte', () => {
    expect(shouldShowProductRiskLoading(true, [false, true, true])).toBe(false);
  });

  it('mostra estado vazio apenas após todas as fontes terminarem sem dados', () => {
    expect(shouldShowProductRiskLoading(false, [false, false, false])).toBe(false);
  });
});
