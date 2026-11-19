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
import { supplierTrustFromProduct } from '@/pages/product-detail/ProductDetailHeroSections';

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

describe('supplierTrustFromProduct — a ligação que se perdeu', () => {
  it('leva o prazo do catálogo para o selo', () => {
    expect(supplierTrustFromProduct({ leadTimeDays: 5 }).deliveryDays).toBe(5);
  });

  it('trata prazo zero como prazo não informado, igual ao cartão de preço', () => {
    // O cartão escreve "Consultar prazo" quando leadTimeDays é 0; sem isto o
    // selo anunciaria "Entrega rápida" com tooltip de "0 dias úteis".
    expect(supplierTrustFromProduct({ leadTimeDays: 0 }).deliveryDays).toBeNull();
  });

  it('não produz fornecedor verificado nem avaliação, que o catálogo não tem', () => {
    const trust = supplierTrustFromProduct({ leadTimeDays: 5 });
    expect(trust.isVerified).toBe(false);
    expect(trust.avgRating).toBeNull();
  });

  it('o selo renderizado a partir do produto é o do catálogo, não uma constante vazia', () => {
    renderComTooltip(
      <DynamicTrustBadges
        trust={supplierTrustFromProduct({ leadTimeDays: 3 })}
        productFlags={semSinal}
      />,
    );

    expect(screen.getByText('Entrega rápida')).toBeTruthy();
  });

  it('produto sem prazo no catálogo não ganha selo inventado', () => {
    const { container } = renderComTooltip(
      <DynamicTrustBadges
        trust={supplierTrustFromProduct({ leadTimeDays: 0 })}
        productFlags={semSinal}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
