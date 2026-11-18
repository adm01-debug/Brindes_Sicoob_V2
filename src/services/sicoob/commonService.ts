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
   * Duas telas assinam este mesmo feed (`OrdersKanbanPage` e `OrdersPage`) e o
   * StrictMode monta cada uma duas vezes em desenvolvimento. Com nome fixo,
   * todas disputam o mesmo tópico do Realtime: o `removeChannel` de uma
   * derruba a inscrição da outra e o Kanban para de receber atualização ao
   * vivo — sem erro na tela, só silêncio. O sufixo aleatório isola cada
   * inscrição; o `postgres_changes` continua idêntico, então o servidor
   * entrega o mesmo evento a todas.
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
