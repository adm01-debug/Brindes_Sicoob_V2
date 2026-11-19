/**
 * Regra travada (recuperada da PR #157, fechada sem merge): a tela /instalar
 * só oferece o botão "Instalar Aplicativo" quando existe convite nativo do
 * navegador, e esse botão dispara o prompt de verdade. Sem convite, a página
 * cai nas instruções manuais em português (iOS e Android) em vez de exibir um
 * botão que não instala nada.
 *
 * O hook `usePWAInstall` tem catraca própria em tests/hooks/usePWAInstall.test.tsx;
 * aqui ele é dublado para travar a fiação da página.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/seo/PageSEO', () => ({ PageSEO: () => null }));
vi.mock('@/hooks/usePWAInstall', () => ({ usePWAInstall: vi.fn() }));

import { usePWAInstall } from '@/hooks/usePWAInstall';
import PWAInstallPage from '@/pages/PWAInstallPage';

const usePWAInstallMock = vi.mocked(usePWAInstall);

describe('página /instalar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('com convite nativo, o botão dispara o prompt do navegador', () => {
    const install = vi.fn();
    usePWAInstallMock.mockReturnValue({ isInstallable: true, isInstalled: false, install });

    render(<PWAInstallPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Instalar Aplicativo' }));

    expect(install).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Como Instalar Manualmente')).toBeNull();
  });

  it('sem convite nativo, mostra instruções manuais e nenhum botão de instalar', () => {
    usePWAInstallMock.mockReturnValue({
      isInstallable: false,
      isInstalled: false,
      install: vi.fn(),
    });

    render(<PWAInstallPage />);

    expect(screen.getByText('Como Instalar Manualmente')).toBeTruthy();
    expect(screen.getByText('No iPhone (iOS / Safari)')).toBeTruthy();
    expect(screen.getByText('No Android (Chrome)')).toBeTruthy();
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Instalar Aplicativo' })).toBeNull();
  });

  it('já instalado, não repete a oferta de instalação', () => {
    usePWAInstallMock.mockReturnValue({
      isInstallable: true,
      isInstalled: true,
      install: vi.fn(),
    });

    render(<PWAInstallPage />);

    expect(screen.getByText('Aplicativo Instalado!')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Instalar Aplicativo' })).toBeNull();
    expect(screen.queryByText('Como Instalar Manualmente')).toBeNull();
  });
});
