/**
 * O selo de prazo de entrega na ficha do produto tem de sair do catálogo.
 *
 * A tela passava `EMPTY_SUPPLIER_TRUST = { isVerified: false, deliveryDays: null,
 * avgRating: null }` fixo, então a seção de confiança existia e nunca mostrava
 * nada. Sete branches diferentes apontaram essa perda.
 */
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DynamicTrustBadges } from '@/components/common/SocialProof';

function renderComTooltip(node: ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

const semSinal = { newArrival: false, onSale: false, featured: false, minQuantity: undefined };

describe('DynamicTrustBadges com dado do catálogo', () => {
  it('mostra o prazo real quando o produto tem lead time', () => {
    renderComTooltip(
      <DynamicTrustBadges
        trust={{ isVerified: false, deliveryDays: 2, avgRating: null }}
        productFlags={semSinal}
      />,
    );

    expect(screen.getByText('Entrega rápida')).toBeTruthy();
  });

  it('não mostra selo nenhum quando o catálogo não tem prazo', () => {
    const { container } = renderComTooltip(
      <DynamicTrustBadges
        trust={{ isVerified: false, deliveryDays: null, avgRating: null }}
        productFlags={semSinal}
      />,
    );

    // Era este o estado permanente da ficha antes da correção.
    expect(container.firstChild).toBeNull();
  });

  it('não inventa fornecedor verificado nem avaliação', () => {
    renderComTooltip(
      <DynamicTrustBadges
        trust={{ isVerified: false, deliveryDays: 3, avgRating: null }}
        productFlags={semSinal}
      />,
    );

    expect(screen.queryByText('Fornecedor verificado')).toBeNull();
    expect(screen.queryByText('Alta qualidade')).toBeNull();
  });
});
