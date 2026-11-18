/**
 * Dado do usuário que o logout tem de apagar do navegador.
 *
 * Tudo aqui é por usuário e fica em `localStorage`, que sobrevive ao logout:
 * sem a limpeza, o próximo vendedor a entrar na mesma máquina vê o que o
 * anterior fez. `sessionStorage` é limpo inteiro porque nada nele precisa
 * sobreviver à sessão.
 */
import { useNavigationStore } from '@/stores/useNavigationStore';

export const SENSITIVE_LOCAL_STORAGE_KEYS = [
  'product-favorites',
  'product-comparison',
  'recently-viewed-products',
  'duplicate_product',
  // Histórico de navegação: guarda até 20 entradas com o TÍTULO da página
  // visitada (useNavigationStore), ou seja, nomes de orçamentos, de kits e de
  // clientes. Ficava para trás no logout e aparecia para o vendedor seguinte.
  'navigation-history',
] as const;

export function clearSensitiveBrowserData(): void {
  try {
    sessionStorage.clear();
    // O store vem primeiro: remover a chave não esvazia o que já está hidratado
    // nesta aba — o menu de histórico continuaria mostrando as páginas do
    // usuário anterior até alguém recarregar. E `clear()` regrava a chave pelo
    // middleware de persistência, então ele tem de rodar ANTES do removeItem,
    // senão a chave volta.
    useNavigationStore.getState().clear();
    SENSITIVE_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Falha ao limpar armazenamento local no logout', error);
  }
}
