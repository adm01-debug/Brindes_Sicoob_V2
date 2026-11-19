/**
 * Filtros da lista de orçamentos persistidos na querystring.
 *
 * Recuperado da PR #100 (`devin/1791190000-ux-onda1`), fechada sem merge: a
 * `main` nunca recebeu esta parte da entrega. Sem ela o vendedor perde o filtro
 * toda vez que entra num orçamento e volta, e refiltra a cada consulta.
 *
 * O caso que mais importa aqui é o do "voltar": navegar para a mesma rota com
 * outra query NÃO remonta o componente, então o estado exibido precisa adotar a
 * URL — e a adoção não pode ser desfeita pelo efeito que escreve de volta.
 */
import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import * as React from 'react';
import { useFiltrosNaUrl } from '@/pages/QuotesListPage';

/** Renderiza o hook sob uma rota real, expondo `navigate` para simular o voltar. */
function renderizarEm(entrada: string) {
  let navegar: ReturnType<typeof useNavigate> | null = null;
  const url = { atual: '' };
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route
          path="/orcamentos"
          element={
            <Capturar
              onNavigate={(fn) => {
                navegar = fn;
              }}
              onLocation={(busca) => {
                url.atual = busca;
              }}
            >
              {children}
            </Capturar>
          }
        />
      </Routes>
    </MemoryRouter>
  );
  const resultado = renderHook(() => useFiltrosNaUrl(), { wrapper });
  return {
    ...resultado,
    irPara: (destino: string) => navegar?.(destino),
    /** Querystring que o usuário veria na barra de endereço. */
    query: () => url.atual.replace(/^\?/, ''),
  };
}

function Capturar({
  children,
  onNavigate,
  onLocation,
}: {
  children: React.ReactNode;
  onNavigate: (fn: ReturnType<typeof useNavigate>) => void;
  onLocation: (busca: string) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  onNavigate(navigate);
  onLocation(location.search);
  return <>{children}</>;
}

describe('filtros da lista de orçamentos na URL', () => {
  it('lê o estado inicial da querystring', () => {
    const { result } = renderizarEm('/orcamentos?q=acme&status=sent&ordem=highest');

    expect(result.current.searchTerm).toBe('acme');
    expect(result.current.statusFilter).toBe('sent');
    expect(result.current.sortBy).toBe('highest');
  });

  it('ordenação desconhecida na URL volta ao padrão, não quebra a lista', () => {
    const { result } = renderizarEm('/orcamentos?ordem=qualquer-coisa');

    expect(result.current.sortBy).toBe('newest');
  });

  it('escreve na querystring só o que difere do padrão', async () => {
    const { result, query } = renderizarEm('/orcamentos');

    await act(async () => {
      result.current.setStatusFilter('draft');
    });

    expect(query()).toBe('status=draft');
  });

  it('voltar para a mesma rota com outra query ressincroniza os filtros exibidos', async () => {
    const { result, irPara, query } = renderizarEm('/orcamentos?q=acme&status=sent');

    expect(result.current.searchTerm).toBe('acme');

    await act(async () => {
      irPara('/orcamentos?q=beta');
    });

    // Afirma estado E querystring: o estado converge mesmo quando a URL é
    // revertida, então olhar só o estado deixaria passar o caso em que o
    // vendedor vê a lista filtrada por "beta" num endereço que diz "acme".
    //
    // NÃO VERIFICADO: a guarda `adotandoRef` do hook é defesa contra o efeito
    // de escrita devolver a query antiga na mesma renderização. Removê-la NÃO
    // derruba nenhum caso deste arquivo — em jsdom, com `act`, os efeitos
    // assentam antes de a reversão aparecer. A guarda foi mantida porque veio
    // da entrega original (PR #100) e protege o navegador real, mas eu não
    // consegui escrever o caso que a prova.
    expect(result.current.searchTerm).toBe('beta');
    expect(result.current.statusFilter).toBe('all');
    expect(query()).toBe('q=beta');
  });

  it('limpar o filtro esvazia a query em vez de deixar chave vazia', async () => {
    const { result, query } = renderizarEm('/orcamentos?q=acme');

    expect(result.current.searchTerm).toBe('acme');

    await act(async () => {
      result.current.setSearchTerm('');
    });

    expect(result.current.searchTerm).toBe('');
    expect(query()).toBe('');
  });
});
