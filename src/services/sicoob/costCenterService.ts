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
   * O upsert roda antes do delete: se a unicidade ou o trigger rejeitarem, o
   * rateio anterior continua no banco em vez de virar um pedido sem rateio.
   */
  async replaceAllocations(
    orderId: string,
    rows: Array<{ cost_center_id: string; valor: number; percentual: number }>,
  ) {
    const duplicado = new Set(rows.map((row) => row.cost_center_id));
    if (duplicado.size !== rows.length) {
      throw new Error('Cada centro de custo pode aparecer uma unica vez no rateio.');
    }

    if (rows.length > 0) {
      const { error: upsertError } = await supabase.from('pa_budget_allocations').upsert(
        rows.map((row) => ({ ...row, order_id: orderId })),
        { onConflict: 'order_id,cost_center_id' },
      );
      if (upsertError) throw upsertError;
    }

    const mantidos = rows.map((row) => row.cost_center_id);
    let deleteQuery = supabase.from('pa_budget_allocations').delete().eq('order_id', orderId);
    if (mantidos.length > 0) {
      deleteQuery = deleteQuery.not('cost_center_id', 'in', `(${mantidos.join(',')})`);
    }
    const { error: delError } = await deleteQuery;
    if (delError) throw delError;

    return this.listAllocations(orderId);
  },
};
