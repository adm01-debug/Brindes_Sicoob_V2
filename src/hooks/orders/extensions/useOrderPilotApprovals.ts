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
  file_path: string;
}

const ARTWORK_BUCKET = 'sicoob-order-documents';
const artworkQueryKey = (orderId?: string) => ['sicoob-order-artwork', orderId] as const;
const MAX_ARTWORK_BYTES = 20 * 1024 * 1024;
const ALLOWED_ARTWORK_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
const ALLOWED_ARTWORK_EXTENSIONS = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp']);

function buildArtworkPath(orderId: string, file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_ARTWORK_EXTENSIONS.has(extension) || !ALLOWED_ARTWORK_TYPES.has(file.type)) {
    throw new Error('Envie uma arte em PDF, PNG, JPG ou WebP.');
  }
  if (file.size <= 0 || file.size > MAX_ARTWORK_BYTES) {
    throw new Error('A arte precisa ter conteúdo e no máximo 20 MB.');
  }
  const baseName = file.name
    .slice(0, -(extension.length + 1))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'arte';
  return `${orderId}/artwork/${crypto.randomUUID()}-${baseName}.${extension}`;
}

export function useOrderPilotApprovals(orderId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: artworkQueryKey(orderId),
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
      queryClient.invalidateQueries({ queryKey: artworkQueryKey(orderId) });
      toast.success('Decisão da arte registrada');
    },
    onError: (error: Error) => toast.error('Não foi possível decidir a arte', { description: error.message }),
  });

  const uploadArtwork = useMutation({
    mutationFn: async (file: File) => {
      if (!orderId) throw new Error('Pedido não informado.');
      const filePath = buildArtworkPath(orderId, file);
      const { error: uploadError } = await supabase.storage
        .from(ARTWORK_BUCKET)
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const registration = await supabase.functions.invoke('sicoob-artwork-register', {
        body: { orderId, filePath },
      });
      if (registration.error) {
        await supabase.storage.from(ARTWORK_BUCKET).remove([filePath]);
        throw registration.error;
      }
      return registration.data as { artworkId: string; sha256: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artworkQueryKey(orderId) });
      toast.success('Nova versão da arte enviada para aprovação');
    },
    onError: (uploadError: Error) => toast.error('Não foi possível enviar a arte', {
      description: uploadError.message,
    }),
  });

  return {
    approvals: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateApprovalStatus,
    uploadArtwork,
  };
}
