/**
 * O logout tem de apagar do navegador o que é de um vendedor só.
 *
 * O caso que motivou o teste: `navigation-history` guarda até 20 títulos de
 * páginas visitadas — nomes de orçamentos, kits e clientes — e sobrevivia ao
 * logout, aparecendo para o próximo vendedor na mesma máquina.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SENSITIVE_LOCAL_STORAGE_KEYS,
  clearSensitiveBrowserData,
} from '@/lib/auth/sensitive-browser-data';
import { useNavigationStore } from '@/stores/useNavigationStore';

describe('clearSensitiveBrowserData', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useNavigationStore.setState({ history: [], direction: 'forward' });
  });

  it('apaga o histórico de navegação do armazenamento e do store', () => {
    useNavigationStore.getState().push({
      pathname: '/orcamentos/abc',
      search: '',
      title: 'Orçamento Cooperativa Sicoob Centro',
      timestamp: 1,
    });
    expect(localStorage.getItem('navigation-history')).toContain('Cooperativa Sicoob Centro');

    clearSensitiveBrowserData();

    expect(localStorage.getItem('navigation-history')).toBeNull();
    expect(useNavigationStore.getState().history).toEqual([]);
  });

  it('apaga todas as chaves por usuário e limpa a sessão', () => {
    SENSITIVE_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.setItem(key, 'x'));
    localStorage.setItem('tema-preferido', 'escuro');
    sessionStorage.setItem('passo-do-tour', '3');

    clearSensitiveBrowserData();

    SENSITIVE_LOCAL_STORAGE_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
    expect(sessionStorage.getItem('passo-do-tour')).toBeNull();
    // Preferência que não identifica ninguém continua de pé.
    expect(localStorage.getItem('tema-preferido')).toBe('escuro');
  });

  it('não propaga erro quando o armazenamento está bloqueado', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => {
      throw new Error('storage bloqueado');
    };

    expect(() => clearSensitiveBrowserData()).not.toThrow();
    expect(aviso).toHaveBeenCalled();

    Storage.prototype.removeItem = original;
    aviso.mockRestore();
  });
});
