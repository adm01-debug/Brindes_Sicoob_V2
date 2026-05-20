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
  }
};
