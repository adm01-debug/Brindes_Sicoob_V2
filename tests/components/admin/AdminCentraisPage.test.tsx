import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../render-helpers';
import { supabase } from '@/integrations/supabase/client';
import AdminCentraisPage from '@/pages/admin/AdminCentraisPage';
import { toast } from 'sonner';

// O cliente Supabase compartilhado em render-helpers devolve um thenable que
// não chama o callback de resolução; aqui usamos um encadeável de verdade
// para exercitar o fluxo de leitura/escrita da tela.
const harness = vi.hoisted(() => {
  type Call = { op: string; args: unknown[] };
  const calls: Call[] = [];
  const estado: { rows: Array<Record<string, unknown>>; erro: unknown } = { rows: [], erro: null };

  const criarBuilder = () => {
    const builder: Record<string, unknown> = {};
    const registro = (op: string) => (...args: unknown[]) => {
      calls.push({ op, args });
      return builder;
    };
    builder.select = registro('select');
    builder.order = registro('order');
    builder.insert = registro('insert');
    builder.update = registro('update');
    builder.delete = registro('delete');
    builder.eq = registro('eq');
    builder.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: estado.rows, error: estado.erro }).then(resolve);
    return builder;
  };

  return {
    calls,
    estado,
    from: (table: string) => {
      calls.push({ op: 'from', args: [table] });
      return criarBuilder();
    },
    askConfirm: vi.fn(async () => true),
  };
});

vi.mock('@/stores/useConfirmDialogStore', () => ({ askConfirm: harness.askConfirm }));

const CENTRAL = {
  id: 'central-1',
  name: 'Central Rio Grande do Sul',
  code: 'SC-RS',
  region: 'Sul',
  logo_url: null,
  primary_color: '#123456',
};

function operacoes() {
  return harness.calls.map((call) => call.op);
}

describe('AdminCentraisPage', () => {
  beforeEach(() => {
    harness.calls.length = 0;
    harness.askConfirm.mockClear();
    vi.spyOn(toast, 'error').mockImplementation(() => 0);
    harness.estado.rows = [CENTRAL];
    harness.estado.erro = null;
    (supabase as unknown as { from: unknown }).from = harness.from;
  });

  it('lista as Centrais cadastradas com código e região', async () => {
    renderWithProviders(<AdminCentraisPage />);

    const nome = await screen.findByText('Central Rio Grande do Sul');
    const linha = nome.closest('tr');
    expect(linha?.textContent).toContain('SC-RS');
    expect(linha?.textContent).toContain('Sul');
  });

  it('cadastra uma Central enviando nome e código ao banco', async () => {
    renderWithProviders(<AdminCentraisPage />);
    await screen.findByText('Central Rio Grande do Sul');

    fireEvent.click(screen.getByRole('button', { name: /Nova Central/i }));
    fireEvent.change(screen.getByLabelText(/Nome da Central/i), {
      target: { value: 'Central Brasília' },
    });
    fireEvent.change(screen.getByLabelText(/Abreviatura/i), {
      target: { value: 'BSB' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Central/i }));

    await waitFor(() => expect(operacoes()).toContain('insert'));
    const insert = harness.calls.find((call) => call.op === 'insert');
    expect(insert?.args[0]).toMatchObject({ name: 'Central Brasília', code: 'BSB' });
  });

  it('exclui a Central somente depois da confirmação', async () => {
    renderWithProviders(<AdminCentraisPage />);
    await screen.findByText('Central Rio Grande do Sul');

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Central Rio Grande do Sul' }));

    await waitFor(() => expect(harness.askConfirm).toHaveBeenCalled());
    await waitFor(() => expect(operacoes()).toContain('delete'));
    const eq = harness.calls.find((call) => call.op === 'eq');
    expect(eq?.args).toEqual(['id', 'central-1']);
  });

  it('não exclui quando a confirmação é recusada', async () => {
    harness.askConfirm.mockResolvedValueOnce(false);
    renderWithProviders(<AdminCentraisPage />);
    await screen.findByText('Central Rio Grande do Sul');

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Central Rio Grande do Sul' }));

    await waitFor(() => expect(harness.askConfirm).toHaveBeenCalled());
    expect(operacoes()).not.toContain('delete');
  });

  it('explica o vínculo quando o banco recusa a exclusão da Central', async () => {
    // cooperativas.central_id e pa_singularidades.central_id não têm ON DELETE:
    // o banco devolve 23503 e o usuário precisa saber o que fazer, não ver
    // "Erro ao excluir Central".
    renderWithProviders(<AdminCentraisPage />);
    await screen.findByText('Central Rio Grande do Sul');
    harness.estado.erro = { code: '23503', message: 'update or delete on table "sicoob_centrais" violates foreign key constraint' };

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Central Rio Grande do Sul' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(
      'Central com Singulares ou Cooperativas vinculadas: reatribua os vínculos antes de excluir',
    );
  });

  it('avisa no diálogo que vínculos impedem a exclusão', async () => {
    renderWithProviders(<AdminCentraisPage />);
    await screen.findByText('Central Rio Grande do Sul');

    fireEvent.click(screen.getByRole('button', { name: 'Excluir Central Rio Grande do Sul' }));

    await waitFor(() => expect(harness.askConfirm).toHaveBeenCalled());
    expect(harness.askConfirm.mock.calls[0][0]).toMatchObject({
      description: expect.stringContaining('Singulares ou Cooperativas vinculadas impedem a exclusão'),
    });
  });
});
