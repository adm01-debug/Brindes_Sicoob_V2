/**
 * O portão de saída do portal.
 *
 * O registro de rota suja já existia, mas só o voltar o consultava: menu e
 * link chamavam `navigate` direto e levavam o formulário preenchido embora.
 * Estes testes exercitam a navegação de verdade num data router — o clique no
 * link, o diálogo, o "Sair sem salvar" e a autorização de quem já respondeu.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Outlet, RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalExitGuard } from '@/components/routing/GlobalExitGuard';
import { useScreenDirtyState } from '@/hooks/useScreenDirtyState';
import {
  autorizarSaida,
  limparRegistroDeRotas,
  rotaEstaSuja,
} from '@/lib/navigation/dirty-registry';

function Moldura() {
  return <><GlobalExitGuard /><Outlet /></>;
}

function Formulario({ sujo }: { sujo: boolean }) {
  useScreenDirtyState(sujo, 'O kit tem itens que ainda não foram gravados.');
  return (
    <>
      <p>Formulário</p>
      <Link to="/outra">Outra tela</Link>
    </>
  );
}

function FormularioSemDeclaracao() {
  return (
    <>
      <p>Formulário</p>
      <Link to="/outra">Outra tela</Link>
    </>
  );
}

function OutraTela() {
  return <p>Outra tela</p>;
}

function montar(opcoes: { sujo: boolean; declara?: boolean }) {
  const { sujo, declara = true } = opcoes;
  const router = createMemoryRouter(
    [
      {
        element: <Moldura />,
        children: [
          {
            path: '/formulario',
            element: declara ? <Formulario sujo={sujo} /> : <FormularioSemDeclaracao />,
          },
          { path: '/outra', element: <OutraTela /> },
        ],
      },
    ],
    { initialEntries: ['/formulario'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

async function esperarDeclaracao(sujo: boolean) {
  await waitFor(() => expect(rotaEstaSuja('/formulario')).toBe(sujo));
}

beforeEach(() => limparRegistroDeRotas());
afterEach(() => {
  vi.restoreAllMocks();
  limparRegistroDeRotas();
});

describe('aviso global de saída', () => {
  it('segura a navegação quando a tela declarou trabalho pendente', async () => {
    const router = montar({ sujo: true });
    await esperarDeclaracao(true);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));

    expect(await screen.findByText('Alterações não salvas')).toBeInTheDocument();
    expect(screen.getByText('O kit tem itens que ainda não foram gravados.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/formulario');
    expect(screen.queryByText('Outra tela', { selector: 'p' })).not.toBeInTheDocument();
  });

  it('"Sair sem salvar" completa a navegação', async () => {
    const router = montar({ sujo: true });
    await esperarDeclaracao(true);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair sem salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'));
  });

  it('"Continuar editando" mantém o usuário na tela', async () => {
    const router = montar({ sujo: true });
    await esperarDeclaracao(true);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar editando' }));

    await waitFor(() => expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/formulario');
  });

  it('tela limpa sai sem ser interrogada', async () => {
    const router = montar({ sujo: false });
    await esperarDeclaracao(false);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'));
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument();
  });

  it('rota que não declarou estado continua sem aviso — não é este guard que muda isso', async () => {
    const router = montar({ sujo: false, declara: false });

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'));
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument();
  });

  it('quem já confirmou a saída não é perguntado de novo', async () => {
    const router = montar({ sujo: true });
    await esperarDeclaracao(true);

    autorizarSaida();
    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'));
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument();
  });

  it('autorização vencida volta a pedir confirmação', async () => {
    montar({ sujo: true });
    await esperarDeclaracao(true);

    const agora = Date.now();
    autorizarSaida();
    const relogio = vi.spyOn(Date, 'now').mockReturnValue(agora + 60_000);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));

    expect(await screen.findByText('Alterações não salvas')).toBeInTheDocument();
    relogio.mockRestore();
  });
});
