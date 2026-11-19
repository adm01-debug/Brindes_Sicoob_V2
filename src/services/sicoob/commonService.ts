import { supabase } from "@/integrations/supabase/client";

export const sicoobCommonService = {
  async listPostosAtendimento() {
    const { data, error } = await supabase.from("postos_atendimento").select("id, nome");
    if (error) throw error;
    return data || [];
  },

  async listCooperativas() {
    const { data, error } = await supabase.from("cooperativas").select("id, nome");
    if (error) throw error;
    return data || [];
  },

  /**
   * Um canal por montagem, nunca um nome fixo compartilhado.
   *
   * Dois consumidores assinam este mesmo feed (`OrdersKanbanPage` e
   * `OrdersPage`) e, em desenvolvimento, o StrictMode monta cada um duas
   * vezes. Com nome fixo, essas inscrições caem todas no mesmo tópico do
   * Realtime e passam a depender do que o `removeChannel` de uma faz com a
   * inscrição da outra — acoplamento sem razão para existir. O sufixo
   * aleatório isola cada inscrição; o `postgres_changes` continua idêntico,
   * então o servidor entrega o mesmo evento a todas.
   *
   * NÃO VERIFICADO: perda de atualização na tela em produção. As duas páginas
   * estão em rotas distintas, logo não coexistem montadas na mesma aba, e cada
   * aba tem seu próprio cliente Supabase. A janela que sobra é a navegação
   * entre as duas rotas; não foi reproduzida. A troca entra pelo isolamento,
   * que é barato e verificável, não por um defeito medido.
   */
  subscribeToOrders(callback: () => void) {
    const channel = supabase
      .channel(`sicoob-orders-realtime:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sicoob_orders' },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
};
