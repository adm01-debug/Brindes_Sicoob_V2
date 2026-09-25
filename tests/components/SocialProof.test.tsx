import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { DynamicTrustBadges } from '@/components/common/SocialProof';
import { TooltipProvider } from '@/components/ui/tooltip';

const SEM_CONFIANCA_DE_FORNECEDOR = {
  isVerified: false,
  deliveryDays: null,
  avgRating: null,
};

function renderBadges(node: ReactNode) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

describe('DynamicTrustBadges', () => {
  it('não apresenta confiança de fornecedor sem dados auditáveis', () => {
    renderBadges(<DynamicTrustBadges trust={SEM_CONFIANCA_DE_FORNECEDOR} />);

    expect(screen.queryByText(/Fornecedor verificado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Entrega rápida/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Alta qualidade/i)).not.toBeInTheDocument();
  });

  it('mantém os selos factuais do produto', () => {
    renderBadges(<DynamicTrustBadges trust={SEM_CONFIANCA_DE_FORNECEDOR} productFlags={{ newArrival: true, onSale: true }} />);

    expect(screen.getByText('Novidade')).toBeInTheDocument();
    expect(screen.getByText('Promoção')).toBeInTheDocument();
  });
});
