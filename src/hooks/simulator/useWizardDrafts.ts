/**
 * useWizardDrafts - Save/load simulator wizard drafts to database
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SimulatorWizardState, SelectedProduct, Personalization } from '@/types/domain/simulator-wizard';
import type { Json } from '@/integrations/supabase/types';

const WIZARD_DRAFTS_QUERY_KEY = ['wizard-drafts'] as const;

export interface WizardDraft {
  id: string;
  title: string;
  product_data: SelectedProduct;
  quantity: number;
  personalizations: Personalization[];
  wizard_step: string;
  created_at: string;
  updated_at: string;
}

export function useWizardDrafts() {
  const queryClient = useQueryClient();

  const { data: drafts, isLoading } = useQuery({
    queryKey: WIZARD_DRAFTS_QUERY_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('simulator_wizard_drafts')
        .select('id, title, product_data, quantity, personalizations, wizard_step, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        product_data: d.product_data as unknown as SelectedProduct,
        personalizations: d.personalizations as unknown as Personalization[],
      })) as WizardDraft[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const saveDraftMutation = useMutation({
    mutationFn: async ({ title, state }: { title: string; state: SimulatorWizardState }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');
      if (!state.selectedProduct) throw new Error('Nenhum produto selecionado');

      const { error } = await supabase
        .from('simulator_wizard_drafts')
        .insert({
          user_id: user.id,
          title,
          product_data: state.selectedProduct as unknown as Json,
          quantity: state.quantity,
          personalizations: state.personalizations as unknown as Json,
          wizard_step: state.currentStep,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WIZARD_DRAFTS_QUERY_KEY });
      toast.success('Rascunho salvo!');
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('simulator_wizard_drafts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WIZARD_DRAFTS_QUERY_KEY });
      toast.success('Rascunho excluído');
    },
  });

  const saveDraft = useCallback((title: string, state: SimulatorWizardState) => {
    saveDraftMutation.mutate({ title, state });
  }, [saveDraftMutation]);

  return {
    drafts: drafts || [],
    isLoading,
    saveDraft,
    saveDraftPending: saveDraftMutation.isPending,
    deleteDraft: deleteDraftMutation.mutate,
    deleteDraftPending: deleteDraftMutation.isPending,
  };
}
