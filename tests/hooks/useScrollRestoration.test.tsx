import { act, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

function HookMount() {
  useScrollRestoration();
  return null;
}

function HomePage() {
  const navigate = useNavigate();
  return (
    <>
      <HookMount />
      <button onClick={() => navigate('/lista')}>ir</button>
    </>
  );
}

function ListPage() {
  const navigate = useNavigate();
  return (
    <>
      <HookMount />
      <button onClick={() => navigate(-1)}>voltar</button>
    </>
  );
}

describe('useScrollRestoration', () => {
  const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  beforeEach(() => {
    scrollToSpy.mockClear();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  });

  it('restaura o scroll da window ao voltar (POP)', () => {
    const pathRef = { current: '' };
    function Spy() {
      pathRef.current = useLocation().pathname;
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/inicio', '/lista']} initialIndex={0}>
        <Spy />
        <Routes>
          <Route path="/inicio" element={<HomePage />} />
          <Route path="/lista" element={<ListPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // usuário rola em /inicio
    act(() => {
      (window as unknown as { scrollY: number }).scrollY = 640;
      document.dispatchEvent(new Event('scroll'));
      (window as unknown as { scrollY: number }).scrollY = 0;
    });

    act(() => {
      screen.getByText('ir').click();
    });
    expect(pathRef.current).toBe('/lista');

    // navegação nova (PUSH) não pode restaurar scroll antigo
    expect(scrollToSpy).not.toHaveBeenCalledWith(0, 640);

    act(() => {
      screen.getByText('voltar').click();
    });
    expect(pathRef.current).toBe('/inicio');
    expect(scrollToSpy).toHaveBeenCalledWith(0, 640);
  });

  it('restaura scrollTop de contêiner marcado com data-scroll-restore', () => {
    const container = document.createElement('div');
    container.dataset.scrollRestore = 'grade';
    document.body.appendChild(container);

    renderHook(() => useScrollRestoration(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={['/lista']}>{children}</MemoryRouter>
      ),
    });

    act(() => {
      container.scrollTop = 320;
      container.dispatchEvent(new Event('scroll', { bubbles: false }));
    });

    document.body.removeChild(container);
    // o primeiro mount é PUSH — apenas registra, sem restaurar para si mesmo
    expect(container.scrollTop).toBe(320);
  });
});
