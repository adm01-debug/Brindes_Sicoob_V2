import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useDescartarRascunhoAoDesmontar } from '@/hooks/useDescartarRascunhoAoDesmontar';

type Api = { marcar: () => void; ir: (destino: string) => void };

function Sonda({ descartar, api }: { descartar: () => void; api: { current: Api | null } }) {
  const marcar = useDescartarRascunhoAoDesmontar(descartar);
  const navigate = useNavigate();
  useEffect(() => {
    api.current = { marcar, ir: (destino: string) => navigate(destino) };
  }, [api, marcar, navigate]);
  return <p>formulario</p>;
}

function montar(descartar: () => void) {
  const api: { current: Api | null } = { current: null };
  const { unmount } = render(
    <MemoryRouter initialEntries={['/formulario']}>
      <Routes>
        <Route path="/formulario" element={<Sonda descartar={descartar} api={api} />} />
        <Route path="/outra" element={<p>outra tela</p>} />
      </Routes>
    </MemoryRouter>,
  );
  return { api, unmount };
}

function Editor({ id, apagados, api }: { id: string; apagados: string[]; api: { current: Api | null } }) {
  const marcar = useDescartarRascunhoAoDesmontar(() => apagados.push(id));
  const navigate = useNavigate();
  useEffect(() => {
    marcar();
    api.current = { marcar, ir: (destino: string) => navigate(destino) };
  }, [api, marcar, navigate]);
  return <p>editor {id}</p>;
}

describe('useDescartarRascunhoAoDesmontar', () => {
  it('apaga o rascunho quando a tela sai de verdade', () => {
    const descartar = vi.fn();
    const { api, unmount } = montar(descartar);

    api.current!.marcar();
    unmount();

    expect(descartar).toHaveBeenCalledTimes(1);
  });

  it('apaga o rascunho do editor antigo ao trocar de orçamento na mesma rota', () => {
    // A animação de transição mantém o editor anterior montado: o descarte
    // precisa valer no desmonte dele, não ser cancelado pela URL nova.
    const descartar = vi.fn();
    const { api, unmount } = montar(descartar);

    api.current!.marcar();
    act(() => api.current!.ir('/formulario?orcamento=2'));

    expect(descartar).not.toHaveBeenCalled();
    unmount();
    expect(descartar).toHaveBeenCalledTimes(1);
  });

  it('não apaga enquanto a tela continua montada (entradas idênticas no histórico)', () => {
    const descartar = vi.fn();
    const { api } = montar(descartar);

    api.current!.marcar();
    act(() => api.current!.ir('/formulario'));
    act(() => api.current!.ir('/formulario'));

    expect(descartar).not.toHaveBeenCalled();
  });

  it('apaga só o rascunho do editor que saiu ao trocar entre caminhos distintos', () => {
    // Dois orçamentos abertos pela mesma rota de edição, com caminhos
    // diferentes: a transição desmonta o editor anterior e apenas o rascunho
    // dele pode ser apagado.
    const apagados: string[] = [];
    const api: { current: Api | null } = { current: null };
    render(
      <MemoryRouter initialEntries={['/orcamentos/1']}>
        <Routes>
          <Route path="/orcamentos/1" element={<Editor key="orc-1" id="orc-1" apagados={apagados} api={api} />} />
          <Route path="/orcamentos/2" element={<Editor key="orc-2" id="orc-2" apagados={apagados} api={api} />} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => api.current!.ir('/orcamentos/2'));

    expect(apagados).toEqual(['orc-1']);
  });

  it('não apaga quando o pedido não foi feito', () => {
    const descartar = vi.fn();
    const { unmount } = montar(descartar);

    unmount();

    expect(descartar).not.toHaveBeenCalled();
  });
});
