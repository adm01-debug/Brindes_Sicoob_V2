/**
 * Custom Kit Persistence Hook
 * CRUD para a tabela custom_kits (banco local)
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { KitState } from '@/lib/kit-builder';
import { buildCustomKitPayload, createKitPersistenceSnapshot } from '@/lib/kit-builder/persistence';

// ============================================
// TYPES
// ============================================

export interface CustomKitRow {
  id: string;
  user_id: string;
  name: string;
  status: string;
  box_data: Record<string, unknown> | null;
  items_data: Record<string, unknown>[];
  personalization_data: Record<string, unknown>;
  kit_quantity: number;
  box_price: number;
  items_price: number;
  personalization_price: number;
  total_price: number;
  volume_usage_percent: number;
  color: string;
  icon: string;
  tag: string | null;
  description: string | null;
  is_favorite: boolean;
  is_pinned: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['custom-kits'] as const;

export class CustomKitConflictError extends Error {
  constructor() {
    super('Este kit foi alterado em outra aba. Atualize a lista antes de salvar novamente.');
    this.name = 'CustomKitConflictError';
  }
}

function buildKitPayload(userId: string, kitState: KitState, kitQuantity: number) {
  return buildCustomKitPayload(userId, createKitPersistenceSnapshot(kitState, kitQuantity));
}

async function persistCustomKit(
  userId: string,
  kitId: string | undefined,
  expectedUpdatedAt: string | undefined,
  payload: ReturnType<typeof buildKitPayload>,
) {
  if (kitId) {
    if (!expectedUpdatedAt) {
      throw new CustomKitConflictError();
    }

    // Garante que a gravação produza uma versão diferente, mesmo em duas
    // gravações iniciadas no mesmo milissegundo.
    const nextUpdatedAt = new Date().toISOString();
    payload.updated_at = nextUpdatedAt <= expectedUpdatedAt
      ? new Date(new Date(expectedUpdatedAt).getTime() + 1).toISOString()
      : nextUpdatedAt;
    const { data, error } = await supabase
      .from('custom_kits')
      .update(payload)
      .eq('id', kitId)
      .eq('user_id', userId)
      .eq('updated_at', expectedUpdatedAt)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new CustomKitConflictError();
    return data;
  }
  const { data, error } = await supabase.from('custom_kits').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ============================================
// HOOK
// ============================================

export function useCustomKitPersistence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Lista os kits do usuário
  const { data: savedKits = [], isLoading: isLoadingKits } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('custom_kits')
        .select('id, user_id, name, status, box_data, items_data, personalization_data, kit_quantity, box_price, items_price, personalization_price, total_price, volume_usage_percent, color, icon, tag, description, is_favorite, is_pinned, last_used_at, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as CustomKitRow[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Salvar kit (insert ou update)
  const saveMutation = useMutation({
    mutationFn: async ({ kitId, expectedUpdatedAt, kitState, kitQuantity }: {
      kitId?: string;
      expectedUpdatedAt?: string;
      kitState: KitState;
      kitQuantity: number;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const cachedKit = kitId
        ? queryClient.getQueryData<CustomKitRow[]>(QUERY_KEY)?.find((kit) => kit.id === kitId)
        : undefined;
      return persistCustomKit(
        user.id,
        kitId,
        expectedUpdatedAt ?? cachedKit?.updated_at,
        buildKitPayload(user.id, kitState, kitQuantity),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Kit salvo com sucesso!');
    },
    onError: (err: Error) => {
      if (err instanceof CustomKitConflictError) {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      }
      toast.error(`Erro ao salvar kit: ${err.message}`);
    },
  });

  // Deletar kit
  const deleteMutation = useMutation({
    mutationFn: async (kitId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      const { error } = await supabase
        .from('custom_kits')
        .delete()
        .eq('id', kitId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Kit removido');
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });

  const saveKit = useCallback(
    (kitState: KitState, kitQuantity: number, kitId?: string, expectedUpdatedAt?: string) =>
      saveMutation.mutateAsync({ kitId, expectedUpdatedAt, kitState, kitQuantity }),
    [saveMutation]
  );

  const deleteKit = useCallback(
    (kitId: string) => deleteMutation.mutateAsync(kitId),
    [deleteMutation]
  );

  /** Marca o kit como recém-usado (best-effort). */
  const bumpLastUsed = useCallback(async (kitId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('custom_kits')
        .update({ last_used_at: new Date().toISOString() } as never)
        .eq('id', kitId)
        .eq('user_id', user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    } catch {
      /* best-effort */
    }
  }, [user?.id, queryClient]);

  /** Fixa/desfixa kit em destaque (apenas 1 por usuário). */
  const togglePinned = useCallback(async (kitId: string, value: boolean) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.rpc('set_custom_kit_pinned', {
        p_kit_id: kitId,
        p_pinned: value,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(value ? 'Kit fixado em destaque' : 'Kit desafixado');
    } catch {
      toast.error('Erro ao alterar destaque');
    }
  }, [user?.id, queryClient]);

  return {
    savedKits,
    isLoadingKits,
    saveKit,
    deleteKit,
    bumpLastUsed,
    togglePinned,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
