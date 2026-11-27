/**
 * McpAccessViolationsPanel — a tabela `mcp_access_violations` acumulou ~2.060
 * tentativas recusadas sem nenhuma leitura na UI. O painel precisa listar,
 * traduzir o motivo e não quebrar quando não há evento.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const ordem = vi.fn();
const limite = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) return Promise.resolve({ count: 2060, error: null });
        return {
          order: () => ({ limit: (n: number) => { limite(n); return ordem(); } }),
        };
      },
    }),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

import { McpAccessViolationsPanel } from '@/components/admin/connections/McpAccessViolationsPanel';

const violacao = {
  id: 'v1',
  reason: 'missing_jwt',
  source: 'mcp-keys-issue',
  operation: 'issue',
  ip_address: '20.51.199.4',
  user_agent: 'node',
  created_at: '2026-10-15T12:51:35.567Z',
};

describe('McpAccessViolationsPanel', () => {
  beforeEach(() => {
    ordem.mockReset();
    limite.mockReset();
  });

  it('lista a violação com motivo traduzido e origem', async () => {
    ordem.mockResolvedValue({ data: [violacao], error: null });

    render(<McpAccessViolationsPanel />);

    expect(await screen.findByText('Sem token')).toBeInTheDocument();
    expect(screen.getByText('mcp-keys-issue')).toBeInTheDocument();
    expect(screen.getByText(/20\.51\.199\.4/)).toBeInTheDocument();
    expect(limite).toHaveBeenCalledWith(50);
  });

  it('mostra o total de eventos no cabeçalho', async () => {
    ordem.mockResolvedValue({ data: [violacao], error: null });

    render(<McpAccessViolationsPanel />);

    expect(await screen.findByText('2.060')).toBeInTheDocument();
  });

  it('mostra estado vazio quando não há tentativa registrada', async () => {
    ordem.mockResolvedValue({ data: [], error: null });

    render(<McpAccessViolationsPanel />);

    expect(
      await screen.findByText('Nenhuma tentativa recusada registrada.'),
    ).toBeInTheDocument();
  });
});
