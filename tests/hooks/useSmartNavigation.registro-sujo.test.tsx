/**
 * Integração entre o "voltar" e o registro de estado sujo por rota.
 *
 * As catracas do registro são isoladas: exercitam `declararEstadoDaRota` /
 * `rotaEstaSuja` direto. Se `useSmartNavigation` parasse de consultar o
 * registro — voltando a decidir só pelo pathname — aquelas catracas
 * continuariam verdes e a regra desta PR morreria em silêncio. Estes testes
 * fecham isso: exercitam o voltar DE VERDADE em `/simulador` (rota crítica)
 * nos três estados que importam — tela limpa, tela alterada, e depois do
 * desmonte.
 */
import type { ReactNode } from 'react';
import { act, render, renderHook } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { useScreenDirtyState } from '@/hooks/useScreenDirtyState';
import { useConfirmDialogStore } from '@/stores/useConfirmDialogStore';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { declararEstadoDaRota, limparRegistroDeRotas } from '@/lib/navigation/dirty-registry';

const ROTA_CRITICA = '/simulador';

function montarVoltar(rota: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[rota]}>{children}</MemoryRouter>
  );
  const localizacao = { current: '' };
  const { result, unmount } = renderHook(
    () => {
      localizacao.current = useLocation().pathname;
      return useSmartNavigation();
    },
    { wrapper },
  );
  return { result, localizacao, unmount };
}

/** Tela que declara o próprio estado pelo hook, como as telas reais fazem. */
function TelaQueDeclara({ sujo, mensagem }: { sujo: boolean; mensagem?: string }) {
  useScreenDirtyState(sujo, mensagem);
  return null;
}

function montarTela(rota: string, props: { sujo: boolean; mensagem?: string }) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <TelaQueDeclara {...props} />
    </MemoryRouter>,
  );
}

async function clicarVoltar(result: { current: ReturnType<typeof useSmartNavigation> }) {
  await act(async () => {
    result.current.goBack();
    await Promise.resolve();
  });
}

function pedidoDeConfirmacao() {
  return useConfirmDialogStore.getState().request;
}

async function responder(sair: boolean) {
  await act(async () => {
    const pendente = pedidoDeConfirmacao();
    useConfirmDialogStore.getState().resolve(pendente?.id, sair);
    await Promise.resolve();
  });
}

describe('voltar x registro de estado sujo', () => {
  beforeEach(() => {
    useNavigationStore.setState({ history: [], direction: 'forward' });
    useConfirmDialogStore.setState({ request: null });
    limparRegistroDeRotas();
  });

  afterEach(() => {
    limparRegistroDeRotas();
    document.body.innerHTML = '';
  });

  it('tela LIMPA que declarou estado sai sem perguntar, mesmo em rota crítica', async () => {
    declararEstadoDaRota(ROTA_CRITICA, false);
    const { result, localizacao } = montarVoltar(ROTA_CRITICA);

    await clicarVoltar(result);

    expect(pedidoDeConfirmacao()).toBeNull();
    expect(localizacao.current).toBe('/');
  });

  it('tela ALTERADA pergunta, e "continuar aqui" não navega', async () => {
    declararEstadoDaRota(ROTA_CRITICA, true);
    const { result, localizacao } = montarVoltar(ROTA_CRITICA);

    await clicarVoltar(result);
    expect(pedidoDeConfirmacao()).not.toBeNull();

    await responder(false);
    expect(localizacao.current).toBe(ROTA_CRITICA);
  });

  it('a tela escolhe o texto do aviso, em vez do genérico', async () => {
    declararEstadoDaRota(ROTA_CRITICA, true, 'A simulação em andamento será descartada.');
    const { result } = montarVoltar(ROTA_CRITICA);

    await clicarVoltar(result);

    expect(pedidoDeConfirmacao()?.description).toBe('A simulação em andamento será descartada.');
  });

  it('tela montada DE VERDADE declara pelo hook, e o voltar obedece', async () => {
    // Exercita `useScreenDirtyState`, não o registro direto: é o caminho que as
    // telas reais usam.
    const tela = montarTela(ROTA_CRITICA, { sujo: false });
    const { result } = montarVoltar(ROTA_CRITICA);

    await clicarVoltar(result);
    expect(pedidoDeConfirmacao()).toBeNull();

    tela.unmount();
  });

  it('DEPOIS do desmonte da tela, volta a valer a regra antiga da rota crítica', async () => {
    // O desmonte tem de ser o da TELA, não `esquecerRota` na mão: remover o
    // cleanup de `useScreenDirtyState` precisa derrubar este caso.
    const tela = montarTela(ROTA_CRITICA, { sujo: false });
    await act(async () => {
      tela.unmount();
      await Promise.resolve();
    });

    const { result, localizacao } = montarVoltar(ROTA_CRITICA);
    await clicarVoltar(result);

    // Sem declaração, rota crítica pergunta — é a troca conservadora do registro.
    expect(pedidoDeConfirmacao()).not.toBeNull();
    await responder(true);
    expect(localizacao.current).toBe('/');
  });

  it('rota NÃO crítica sem declaração continua saindo sem perguntar', async () => {
    const { result, localizacao } = montarVoltar('/pedidos/123');

    await clicarVoltar(result);

    expect(pedidoDeConfirmacao()).toBeNull();
    expect(localizacao.current).toBe('/pedidos');
  });
});
