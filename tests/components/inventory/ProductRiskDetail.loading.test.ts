import { describe, expect, it } from 'vitest';
import { shouldShowProductRiskLoading } from '@/components/inventory/risk/ProductRiskDetail';

describe('estado de carregamento dos dados de risco', () => {
  it('mantém o skeleton enquanto alguma fonte ainda carrega e nenhuma retornou dados', () => {
    expect(shouldShowProductRiskLoading([true, true, true])).toBe(true);
  });

  it('não apresenta métricas finais enquanto outra fonte ainda está pendente', () => {
    expect(shouldShowProductRiskLoading([false, true, true])).toBe(true);
  });

  it('mostra estado vazio apenas após todas as fontes terminarem sem dados', () => {
    expect(shouldShowProductRiskLoading([false, false, false])).toBe(false);
  });
});
