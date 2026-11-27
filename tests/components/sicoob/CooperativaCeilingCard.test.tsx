/**
 * O teto da cooperativa existia so no banco: `cooperativa_budgets` tinha tabela,
 * policies e unique, nenhuma tela e nenhum consumidor. O card e a unica forma de
 * o gestor ver o teto contra o que ja foi distribuido aos PAs e de altera-lo.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadCeiling = vi.fn();
const loadDistributedTotal = vi.fn();
const saveCeiling = vi.fn();

vi.mock('@/services/sicoob/cooperativaBudgetService', () => ({
  COOPERATIVA_CEILING_QUERY_KEY: 'cooperativa-ceiling',
  cooperativaCeilingQueryKey: (cooperativaId?: string) =>
    cooperativaId ? ['cooperativa-ceiling', cooperativaId] : ['cooperativa-ceiling'],
  loadCeiling: (...args: unknown[]) => loadCeiling(...args),
  loadDistributedTotal: (...args: unknown[]) => loadDistributedTotal(...args),
  saveCeiling: (...args: unknown[]) => saveCeiling(...args),
}));

const mockAuth: Record<string, unknown> = {};
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => mockAuth }));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { success: (m: string) => toastSuccess(m), error: (...a: unknown[]) => toastError(...a) } }));

import { CooperativaCeilingCard, competenceLabel } from '@/components/sicoob/CooperativaCeilingCard';

function renderizar(no: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{no}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.keys(mockAuth).forEach((k) => delete mockAuth[k]);
  mockAuth.cooperativaId = 'coop-1';
  mockAuth.isGestorCompras = true;
  mockAuth.isDev = false;
  mockAuth.isSupervisor = false;
  loadCeiling.mockResolvedValue({ verbaTotal: 10_000, limiteAlcada: null });
  loadDistributedTotal.mockResolvedValue(4_000);
  saveCeiling.mockResolvedValue(undefined);
});

describe('teto da cooperativa', () => {
  it('mostra teto, distribuído e disponível da competência', async () => {
    renderizar(<CooperativaCeilingCard />);

    expect(await screen.findByText(/10\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/4\.000,00/)).toBeInTheDocument();
    expect(screen.getByText(/6\.000,00/)).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    expect(loadCeiling).toHaveBeenCalledWith('coop-1', expect.any(Number), expect.any(Number));
  });

  it('avisa quando as verbas dos PAs passam do teto', async () => {
    loadDistributedTotal.mockResolvedValue(12_000);
    renderizar(<CooperativaCeilingCard />);

    expect(await screen.findByText('Verbas acima do teto')).toBeInTheDocument();
    expect(screen.getByText(/2\.000,00\s*acima/)).toBeInTheDocument();
  });

  it('sem teto definido, deixa o gestor definir o valor', async () => {
    loadCeiling.mockResolvedValue(null);
    renderizar(<CooperativaCeilingCard />);

    expect(await screen.findByText('não definido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar teto' })).toBeInTheDocument();
  });

  it('salva o teto digitado na competência exibida', async () => {
    renderizar(<CooperativaCeilingCard />);

    const campo = await screen.findByLabelText('Teto mensal (R$)');
    fireEvent.change(campo, { target: { value: '15000.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teto' }));

    await waitFor(() => expect(saveCeiling).toHaveBeenCalledTimes(1));
    expect(saveCeiling).toHaveBeenCalledWith({
      cooperativaId: 'coop-1',
      ano: expect.any(Number),
      mes: expect.any(Number),
      verbaTotal: 15_000.5,
    });
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Teto da cooperativa salvo'));
  });

  it('quem não é gestor vê o teto, mas não edita', async () => {
    mockAuth.isGestorCompras = false;
    renderizar(<CooperativaCeilingCard />);

    expect(await screen.findByText('Distribuído aos PAs')).toBeInTheDocument();
    expect(screen.getByText('Somente o gestor da cooperativa define o teto.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Salvar teto' })).not.toBeInTheDocument();
  });

  it('sem cooperativa vinculada não consulta nada', async () => {
    mockAuth.cooperativaId = null;
    renderizar(<CooperativaCeilingCard />);

    expect(await screen.findByText(/não está vinculada a uma cooperativa/)).toBeInTheDocument();
    expect(loadCeiling).not.toHaveBeenCalled();
  });

  it('não envia teto vazio como R$ 0', async () => {
    renderizar(<CooperativaCeilingCard />);

    const campo = await screen.findByLabelText('Teto mensal (R$)');
    fireEvent.change(campo, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar teto' }));

    expect(saveCeiling).not.toHaveBeenCalled();
    expect(await screen.findByText(/Informe o teto em reais/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar teto' })).toBeDisabled();
  });

  it('ao voltar para uma competência já carregada, o campo mostra o teto daquele mês', async () => {
    loadCeiling.mockImplementation((_id: string, _ano: number, mes: number) =>
      Promise.resolve({ verbaTotal: mes * 100, limiteAlcada: null }));

    renderizar(<CooperativaCeilingCard />);
    const inicial = new Date().getMonth() + 1;

    await waitFor(() => expect(screen.getByLabelText('Teto mensal (R$)')).toHaveValue(inicial * 100));

    fireEvent.click(screen.getByRole('button', { name: 'Próxima competência' }));
    await waitFor(() =>
      expect(screen.getByLabelText('Teto mensal (R$)')).toHaveValue(((inicial % 12) + 1) * 100),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Competência anterior' }));
    await waitFor(() => expect(screen.getByLabelText('Teto mensal (R$)')).toHaveValue(inicial * 100));
  });

  it('rotula a competência em pt-BR', () => {
    expect(competenceLabel(2026, 12)).toBe('dezembro/2026');
    expect(competenceLabel(2027, 1)).toBe('janeiro/2027');
  });
});
