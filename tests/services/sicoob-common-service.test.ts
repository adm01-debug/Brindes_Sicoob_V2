/**
 * O feed de pedidos do Sicoob é assinado por mais de um consumidor
 * (`OrdersKanbanPage` e `OrdersPage`) e, em desenvolvimento, o StrictMode monta
 * cada um duas vezes. Com nome de canal fixo, todas essas inscrições caem no
 * mesmo tópico do Realtime e a limpeza de uma remove o canal da outra.
 *
 * Este teste exercita duas inscrições simultâneas e verifica que elas não
 * compartilham tópico e que cada limpeza remove o seu próprio canal. O que ele
 * NÃO cobre é o comportamento do servidor diante de dois `join` no mesmo
 * tópico: isso exigiria um Realtime de verdade.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { canal, removeChannel } = vi.hoisted(() => ({
  canal: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { channel: canal, removeChannel },
}));

import { sicoobCommonService } from '@/services/sicoob/commonService';

/** Canal fake que registra o tópico e devolve a si mesmo na cadeia. */
function canalFake(topico: string) {
  const objeto: Record<string, unknown> = { topic: topico };
  objeto.on = vi.fn(() => objeto);
  objeto.subscribe = vi.fn(() => objeto);
  return objeto;
}

describe('sicoobCommonService.subscribeToOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canal.mockImplementation((nome: string) => canalFake(nome));
  });

  it('duas inscricoes simultaneas nao dividem o mesmo topico', () => {
    const cancelaA = sicoobCommonService.subscribeToOrders(() => undefined);
    const cancelaB = sicoobCommonService.subscribeToOrders(() => undefined);

    const [nomeA] = canal.mock.calls[0] as [string];
    const [nomeB] = canal.mock.calls[1] as [string];
    expect(nomeA).not.toBe(nomeB);
    expect(nomeA.startsWith('sicoob-orders-realtime:')).toBe(true);
    expect(nomeB.startsWith('sicoob-orders-realtime:')).toBe(true);

    cancelaA();
    cancelaB();
  });

  it('a limpeza de uma inscricao remove o canal dela, nao o da outra', () => {
    const cancelaA = sicoobCommonService.subscribeToOrders(() => undefined);
    const cancelaB = sicoobCommonService.subscribeToOrders(() => undefined);

    const canalA = canal.mock.results[0]?.value as { topic: string };
    const canalB = canal.mock.results[1]?.value as { topic: string };

    cancelaA();

    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(removeChannel).toHaveBeenCalledWith(canalA);
    // Cada limpeza carrega o seu próprio canal: a primeira não toca na segunda.
    expect(removeChannel).not.toHaveBeenCalledWith(canalB);

    cancelaB();
    expect(removeChannel).toHaveBeenLastCalledWith(canalB);
  });

  it('cada inscricao escuta o mesmo postgres_changes', () => {
    sicoobCommonService.subscribeToOrders(() => undefined)();

    const criado = canal.mock.results[0]?.value as { on: { mock: { calls: unknown[][] } } };
    expect(criado.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sicoob_orders' },
      expect.any(Function),
    );
  });
});
