/**
 * O convite de instalação (`beforeinstallprompt`) dispara uma vez só. Enquanto
 * ele vivia no estado de cada instância do hook, quem montasse depois — a
 * página /instalar, aberta pelo menu — não o recebia e oferecia apenas
 * instruções manuais, com um botão "Instalar App" que não instalava.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePWAInstall } from '@/hooks/usePWAInstall';

function dispararConvite() {
  const evento = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  };
  evento.prompt = vi.fn().mockResolvedValue(undefined);
  evento.userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });
  act(() => { window.dispatchEvent(evento); });
  return evento;
}

describe('usePWAInstall', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  it('quem monta depois do convite continua podendo instalar', async () => {
    // cabeçalho montado quando o convite chega
    const cabecalho = renderHook(() => usePWAInstall());
    dispararConvite();
    expect(cabecalho.result.current.isInstallable).toBe(true);

    // o usuário navega para /instalar: outra instância, montada depois
    const pagina = renderHook(() => usePWAInstall());
    expect(pagina.result.current.isInstallable).toBe(true);

    await act(async () => { await pagina.result.current.install(); });
    // instalado: o convite some das duas instâncias, não só da que instalou
    expect(pagina.result.current.isInstallable).toBe(false);
    expect(cabecalho.result.current.isInstallable).toBe(false);
  });

  it('sem convite do navegador, nao se oferece a instalar', () => {
    const { result } = renderHook(() => usePWAInstall());
    expect(result.current.isInstallable).toBe(false);
  });
});
