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

  it('não apaga quando o pedido não foi feito', () => {
    const descartar = vi.fn();
    const { unmount } = montar(descartar);

    unmount();

    expect(descartar).not.toHaveBeenCalled();
  });
});
