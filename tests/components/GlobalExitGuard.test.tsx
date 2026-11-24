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
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalExitGuard } from '@/components/routing/GlobalExitGuard';
import { completeQuoteSave } from '@/hooks/useQuoteBuilderState';
import { useScreenDirtyState } from '@/hooks/useScreenDirtyState';
import {
  agendarAposSaida,
  autorizarSaida,
  limparRegistroDeRotas,
  rotaEstaSuja,
} from '@/lib/navigation/dirty-registry';

function Moldura() {
  return <><GlobalExitGuard /><Outlet /></>;
}

function Formulario({ sujo, aoDescartar }: { sujo: boolean; aoDescartar?: () => void }) {
  useScreenDirtyState(
    sujo,
    'O kit tem itens que ainda não foram gravados.',
    undefined,
    aoDescartar,
  );
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

function montar(opcoes: {
  sujo: boolean;
  declara?: boolean;
  comHistorico?: boolean;
  aoDescartar?: () => void;
}) {
  const { sujo, declara = true, comHistorico = false, aoDescartar } = opcoes;
  const router = createMemoryRouter(
    [
      {
        element: <Moldura />,
        children: [
          {
            path: '/formulario',
            element: declara ? (
              <Formulario sujo={sujo} aoDescartar={aoDescartar} />
            ) : (
              <FormularioSemDeclaracao />
            ),
          },
          { path: '/outra', element: <OutraTela /> },
        ],
      },
    ],
    comHistorico
      ? { initialEntries: ['/origem', '/formulario'], initialIndex: 1 }
      : { initialEntries: ['/formulario'] },
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

  it('"Sair sem salvar" descarta o trabalho local da tela', async () => {
    const aoDescartar = vi.fn();
    const router = montar({ sujo: true, aoDescartar });
    await esperarDeclaracao(true);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair sem salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'));
    expect(aoDescartar).toHaveBeenCalledTimes(1);
  });

  it('"Continuar editando" preserva o trabalho local da tela', async () => {
    const aoDescartar = vi.fn();
    const router = montar({ sujo: true, aoDescartar });
    await esperarDeclaracao(true);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar editando' }));

    await waitFor(() => expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/formulario');
    expect(aoDescartar).not.toHaveBeenCalled();
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

describe('voltar do navegador com histórico de verdade', () => {
  it('segue avisando mesmo depois de a tela reescrever o histórico (importação de carrinho)', async () => {
    // useQuoteInitialization.ts:351 faz window.history.replaceState({}, title)
    // ao importar um carrinho, o que apaga o state da entrada do histórico.
    // O voltar seguinte tem de continuar caindo no aviso.
    window.history.replaceState({}, '', '/origem');
    const router = createBrowserRouter([
      {
        element: <Moldura />,
        children: [
          { path: '/origem', element: <OutraTela /> },
          { path: '/formulario', element: <Formulario sujo /> },
        ],
      },
    ]);
    render(<RouterProvider router={router} />);
    await router.navigate('/formulario');
    await esperarDeclaracao(true);

    // A entrada atual passa a existir sem state nenhum, como depois da
    // importacao de carrinho.
    window.history.replaceState({}, document.title);
    expect(window.history.state).toEqual({});
    await router.navigate(-1);

    expect(await screen.findByText('Alterações não salvas')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/formulario');

    await userEvent.click(screen.getByRole('button', { name: 'Sair sem salvar' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/origem'));
  });
});

describe('voltar do navegador com trabalho pendente', () => {
  it('confirmar a volta pelo navegador sai de fato, sem reabrir o aviso', async () => {
    const router = montar({ sujo: true, comHistorico: true });
    await esperarDeclaracao(true);

    await router.navigate(-1);

    expect(await screen.findByText('Alterações não salvas')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/formulario');

    await userEvent.click(screen.getByRole('button', { name: 'Sair sem salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/origem'));
    await waitFor(() => expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument());
  });
});

describe('saída depois de salvar o orçamento', () => {
  const resultado = { id: 'orc-1', row_version: 3 } as never;

  function concluirSalvamento(haEdicaoPosteriorAoEnvio: boolean) {
    completeQuoteSave({
      result: resultado,
      isEditMode: false,
      expectedRowVersion: null,
      finalStatus: 'draft',
      transitionApplied: true,
      saltosDeVersao: 0,
      statusVigente: null,
      setExpectedRowVersion: () => {},
      setStatusDaTela: () => {},
      haEdicaoPosteriorAoEnvio: () => haEdicaoPosteriorAoEnvio,
      navigate: () => {},
    });
  }

  it('edição feita durante a gravação volta a pedir confirmação', async () => {
    const router = montar({ sujo: true });
    await esperarDeclaracao(true);

    concluirSalvamento(true);
    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));

    expect(await screen.findByText('Alterações não salvas')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/formulario');
  });

  it('salvamento sem edição pendente sai direto', async () => {
    const router = montar({ sujo: true });
    await esperarDeclaracao(true);

    concluirSalvamento(false);
    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'));
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument();
  });
});

describe('efeito colateral da saída', () => {
  it('só acontece quando o usuário confirma', async () => {
    montar({ sujo: true });
    await esperarDeclaracao(true);
    const apagarCarrinho = vi.fn();
    agendarAposSaida(apagarCarrinho);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar editando' }));

    expect(apagarCarrinho).not.toHaveBeenCalled();
  });

  it('acontece junto com a saída confirmada', async () => {
    const router = montar({ sujo: true });
    await esperarDeclaracao(true);
    const apagarCarrinho = vi.fn();
    agendarAposSaida(apagarCarrinho);

    await userEvent.click(screen.getByRole('link', { name: 'Outra tela' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Sair sem salvar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/outra'));
    expect(apagarCarrinho).toHaveBeenCalledTimes(1);
  });
});
