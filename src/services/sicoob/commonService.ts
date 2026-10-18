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

  subscribeToOrders(callback: () => void) {
    const channelName = `sicoob-orders-realtime:${crypto.randomUUID()}`;
    const channel = supabase
      .channel(channelName)
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
