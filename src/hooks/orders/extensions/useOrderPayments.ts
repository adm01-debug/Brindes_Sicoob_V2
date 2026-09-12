import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderPayment {
  id: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled' | 'refunded';
  installment_number: number;
  amount: number;
  due_date: string;
  paid_at: string | null;
  refunded_at: string | null;
  refunded_by: string | null;
  refund_reason: string | null;
  payment_method: string | null;
  external_reference: string | null;
  updated_at: string;
}

export interface RecordOrderPaymentInput {
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'cancelled';
  invoiceId?: string | null;
  paymentMethod?: string | null;
  externalReference?: string | null;
  expectedUpdatedAt?: string | null;
}

export function useOrderPayments(orderId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['sicoob-order-payments', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sicoob_order_payments')
        .select('id, status, installment_number, amount, due_date, paid_at, refunded_at, refunded_by, refund_reason, payment_method, external_reference, updated_at')
        .eq('order_id', orderId!)
        .order('installment_number');
      if (error) throw error;
      const today = new Date().toISOString().slice(0, 10);
      return (data || []).map(payment => ({
        ...payment,
        status: payment.status === 'pending' && payment.due_date < today ? 'overdue' : payment.status,
      })) as OrderPayment[];
    },
    enabled: Boolean(orderId),
  });

  const recordPayment = useMutation({
    mutationFn: async (input: RecordOrderPaymentInput) => {
      if (!orderId) throw new Error('Pedido não identificado.');
      const { data, error } = await supabase.rpc('record_sicoob_order_payment', {
        p_order_id: orderId,
        p_installment_number: input.installmentNumber,
        p_amount: input.amount,
        p_due_date: input.dueDate,
        p_status: input.status,
        p_invoice_id: input.invoiceId ?? null,
        p_payment_method: input.paymentMethod ?? null,
        p_external_reference: input.externalReference ?? null,
        p_expected_updated_at: input.expectedUpdatedAt ?? null,
      });
      if (error) throw error;
      if (!data) throw new Error('O banco não confirmou o registro financeiro.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sicoob-order-payments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-audit', orderId] });
      toast.success('Parcela registrada');
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Não foi possível registrar a parcela.');
    },
  });

  const refundPayment = useMutation({
    mutationFn: async (input: { paymentId: string; reason: string; expectedUpdatedAt: string }) => {
      const { error } = await supabase.rpc('refund_sicoob_order_payment', {
        p_payment_id: input.paymentId,
        p_reason: input.reason,
        p_expected_updated_at: input.expectedUpdatedAt,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sicoob-order-payments', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-audit', orderId] });
      toast.success('Estorno registrado com rastreabilidade');
    },
    onError: (mutationError) => {
      toast.error(mutationError instanceof Error ? mutationError.message : 'Não foi possível estornar a parcela.');
    },
  });

  return { payments: query.data, isLoading: query.isLoading, error: query.error, recordPayment, refundPayment };
}
