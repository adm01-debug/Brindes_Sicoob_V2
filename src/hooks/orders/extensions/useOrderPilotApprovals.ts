import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderPilotApproval {
  id: string;
  version: number;
  status: 'pending' | 'approved' | 'rejected' | 'revision';
  photo_url: string | null;
  feedback: string | null;
  identity_snapshot: Record<string, unknown>;
  is_latest: boolean;
}

export function useOrderPilotApprovals(orderId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['sicoob-order-artwork', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sicoob_order_artwork_versions')
        .select('id, version, status, file_path, feedback, identity_snapshot, is_latest')
        .eq('order_id', orderId!)
        .order('version', { ascending: false });
      if (error) throw error;

      return Promise.all((data || []).map(async artwork => {
        const { data: signed, error: signedError } = await supabase.storage
          .from('sicoob-order-documents').createSignedUrl(artwork.file_path, 300);
        if (signedError) throw signedError;
        return { ...artwork, photo_url: signed.signedUrl } as OrderPilotApproval;
      }));
    },
    enabled: Boolean(orderId),
    staleTime: 4 * 60_000,
    refetchInterval: 4 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const updateApprovalStatus = useMutation({
    mutationFn: async (payload: { id: string; status: 'approved' | 'rejected' | 'revision'; feedback?: string }) => {
      const { error } = await supabase.rpc('decide_sicoob_order_artwork', {
        p_artwork_id: payload.id,
        p_status: payload.status,
        p_feedback: payload.feedback?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sicoob-order-artwork', orderId] });
      toast.success('Decisão da arte registrada');
    },
    onError: (error: Error) => toast.error('Não foi possível decidir a arte', { description: error.message }),
  });

  return { approvals: query.data, isLoading: query.isLoading, error: query.error, updateApprovalStatus };
}
