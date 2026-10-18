import { useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { getUxMetrics, resetUxMetrics } from '@/lib/uxMetrics';

vi.useFakeTimers();

function HookMount() {
  useScrollRestoration();
  return null;
}

function HomePage() {
  const navigate = useNavigate();
  return <><HookMount /><button onClick={() => navigate('/lista')}>ir</button></>;
}

function ListPage() {
  const navigate = useNavigate();
  return <><HookMount /><button onClick={() => navigate(-1)}>voltar</button></>;
}

function GridPage() {
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  return <><HookMount /><div ref={ref} data-testid="grade" data-scroll-restore="grade" />
    <button onClick={() => navigate('/detalhe')}>abrir detalhe</button></>;
}

function DetailPage() {
  const navigate = useNavigate();
  return <><HookMount /><button onClick={() => navigate(-1)}>voltar à grade</button></>;
}

describe('useScrollRestoration', () => {
  const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);

  beforeEach(() => {
    scrollToSpy.mockClear();
    resetUxMetrics();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.clearAllTimers();
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  });

  it('restaura o scroll da janela somente ao voltar', () => {
    const pathRef = { current: '' };
    function PathSpy() {
      pathRef.current = useLocation().pathname;
      return null;
    }

    render(
      <MemoryRouter initialEntries={['/inicio', '/lista']} initialIndex={0}>
        <PathSpy />
        <Routes>
          <Route path="/inicio" element={<HomePage />} />
          <Route path="/lista" element={<ListPage />} />
        </Routes>
      </MemoryRouter>,
    );

    act(() => {
      (window as typeof window & { scrollY: number }).scrollY = 640;
      document.dispatchEvent(new Event('scroll'));
      (window as typeof window & { scrollY: number }).scrollY = 0;
      screen.getByText('ir').click();
    });
    expect(pathRef.current).toBe('/lista');
    expect(scrollToSpy).not.toHaveBeenCalledWith(0, 640);

    act(() => screen.getByText('voltar').click());
    expect(pathRef.current).toBe('/inicio');
    act(() => vi.runAllTimers());
    expect(scrollToSpy).toHaveBeenCalledWith(0, 640);
  });

  it('restaura um contêiner recriado ao voltar e registra a restauração', () => {
    render(
      <MemoryRouter initialEntries={['/grade']}>
        <Routes>
          <Route path="/grade" element={<GridPage />} />
          <Route path="/detalhe" element={<DetailPage />} />
        </Routes>
      </MemoryRouter>,
    );
    const firstGrid = screen.getByTestId('grade');
    act(() => {
      firstGrid.scrollTop = 320;
      firstGrid.dispatchEvent(new Event('scroll', { bubbles: true }));
      screen.getByText('abrir detalhe').click();
    });
    expect(screen.queryByTestId('grade')).toBeNull();

    act(() => screen.getByText('voltar à grade').click());
    const restoredGrid = screen.getByTestId('grade');
    expect(restoredGrid).not.toBe(firstGrid);
    act(() => vi.runAllTimers());
    expect(restoredGrid.scrollTop).toBe(320);
    expect(getUxMetrics()['nav.scroll-restore']).toBe(1);
  });
});
