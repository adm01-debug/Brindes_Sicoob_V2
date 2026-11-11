import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useAiUsage', () => ({
  useAiQuotas: () => ({
    data: [
      { id: 'quota-dev', role: 'dev', monthly_limit: 500, is_unlimited: false },
      { id: 'quota-supervisor', role: 'supervisor', monthly_limit: 300, is_unlimited: false },
      { id: 'quota-vendedor', role: 'vendedor', monthly_limit: 100, is_unlimited: false },
    ],
    isLoading: false,
  }),
  useUpdateQuota: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { AiQuotaManager } from '@/pages/admin/ai-usage/AiQuotaManager';

describe('gestão de quotas de IA', () => {
  it('associa um nome acessível ao campo de limite de cada papel', () => {
    render(<AiQuotaManager />);

    expect(screen.getByRole('spinbutton', { name: 'Dev limite mensal de requisições de IA' })).toHaveValue(500);
    expect(screen.getByRole('spinbutton', { name: 'Supervisor limite mensal de requisições de IA' })).toHaveValue(300);
    expect(screen.getByRole('spinbutton', { name: 'Agente limite mensal de requisições de IA' })).toHaveValue(100);
  });
});
