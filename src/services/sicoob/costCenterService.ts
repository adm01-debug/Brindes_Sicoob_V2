import { supabase } from '@/integrations/supabase/client';

export interface CostCenter {
  id: string;
  cooperativa_id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export interface OrderAllocation {
  id: string;
  order_id: string;
  cost_center_id: string | null;
  valor: number;
  percentual: number;
}

export const costCenterService = {
  async list(cooperativaId?: string | null) {
    let query = supabase
      .from('cost_centers')
      .select('id, cooperativa_id, codigo, nome, ativo, created_at')
      .order('codigo');
    if (cooperativaId) query = query.eq('cooperativa_id', cooperativaId);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as CostCenter[];
  },

  async create(input: { cooperativa_id: string; codigo: string; nome: string }) {
    const { data, error } = await supabase
      .from('cost_centers')
      .insert({ ...input, ativo: true })
      .select()
      .single();
    if (error) throw error;
    return data as CostCenter;
  },

  async update(id: string, input: { codigo?: string; nome?: string; ativo?: boolean }) {
    const { data, error } = await supabase
      .from('cost_centers')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as CostCenter;
  },

  async remove(id: string) {
    const { error } = await supabase.from('cost_centers').delete().eq('id', id);
    if (error) throw error;
  },

  async listAllocations(orderId: string) {
    const { data, error } = await supabase
      .from('pa_budget_allocations')
      .select('id, order_id, cost_center_id, valor, percentual')
      .eq('order_id', orderId);
    if (error) throw error;
    return (data ?? []) as OrderAllocation[];
  },

  /**
   * Substitui o rateio do pedido de uma vez.
   * A validacao, o delete e o insert rodam na mesma transacao na RPC
   * `pa_budget_replace_allocations`: antes eram tres round-trips, e um delete
   * que falhasse deixava o rateio anterior pela metade.
   */
  async replaceAllocations(
    orderId: string,
    rows: Array<{ cost_center_id: string; valor: number; percentual: number }>,
  ) {
    const duplicado = new Set(rows.map((row) => row.cost_center_id));
    if (duplicado.size !== rows.length) {
      throw new Error('Cada centro de custo pode aparecer uma unica vez no rateio.');
    }

    const { data, error } = await supabase.rpc(
      'pa_budget_replace_allocations' as never,
      { p_order_id: orderId, p_rows: rows } as never,
    );
    if (error) throw error;

    return (data ?? []) as OrderAllocation[];
  },
};
