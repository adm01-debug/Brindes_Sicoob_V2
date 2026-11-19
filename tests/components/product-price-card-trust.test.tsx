/**
 * Guarda a LIGAÇÃO: o cartão de preço tem de alimentar os selos com o produto.
 * Se alguém voltar a passar uma constante vazia, este teste cai.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/products/QuickAddToQuote', () => ({ QuickAddToQuote: () => null }));
vi.mock('@/components/catalog/BulkVariantWizard', () => ({ BulkVariantWizard: () => null }));
vi.mock('@/components/products/PriceFreshnessBadge', () => ({ PriceFreshnessBadge: () => null }));
vi.mock('@/components/products/PriceFreshnessThresholdEditor', () => ({ PriceFreshnessThresholdEditor: () => null }));
vi.mock('@/stores/useComparisonStore', () => ({ useComparisonStore: () => false }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { ProductPriceCard } from '@/pages/product-detail/ProductDetailHeroSections';

const produto = {
  id: 'p1', name: 'Caneca', sku: 'CN-1', price: 10, stock: 5, images: [],
  variations: [], leadTimeDays: 3, newArrival: false, onSale: false, featured: false,
  minQuantity: 1, description: null, priceUpdatedAt: null,
} as never;

describe('ProductPriceCard alimenta os selos com o produto', () => {
  it('mostra o prazo do catálogo', () => {
    render(<TooltipProvider><ProductPriceCard
      product={produto} id="p1" selectedVariation={null} onSelectVariation={() => undefined}
      minQuantity={1} thresholdDays={30} stockLabelClass="" wizardOpen={false}
      setWizardOpen={() => undefined} favorite={false} onToggleFavorite={() => undefined} viewCount={0}
    /></TooltipProvider>);
    expect(screen.getByText('Entrega rápida')).toBeTruthy();
  });

  it('com prazo zero diz "Consultar prazo" e não anuncia entrega rápida', () => {
    render(<TooltipProvider><ProductPriceCard
      product={{ ...(produto as object), leadTimeDays: 0 } as never} id="p1" selectedVariation={null}
      onSelectVariation={() => undefined} minQuantity={1} thresholdDays={30} stockLabelClass=""
      wizardOpen={false} setWizardOpen={() => undefined} favorite={false}
      onToggleFavorite={() => undefined} viewCount={0}
    /></TooltipProvider>);
    expect(screen.getByText('Consultar prazo')).toBeTruthy();
    expect(screen.queryByText('Entrega rápida')).toBeNull();
  });
});
