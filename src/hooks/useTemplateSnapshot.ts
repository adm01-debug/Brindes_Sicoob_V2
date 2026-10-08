/**
 * useTemplateSnapshot — Captura o estado atual do Kit Builder e persiste como kit_template (admin).
 * Útil para "Salvar como template do sistema" diretamente do builder.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { KitState } from '@/lib/kit-builder';

export interface SnapshotInput {
  kitState: KitState;
  templateId?: string;
  category?: string;
  overrideName?: string;
}

function templateIdentity(identity: KitState['identity']) {
  return {
    description: identity?.description ?? null,
    color: identity?.color ?? '#3B82F6',
    icon: identity?.icon ?? 'Package',
    tag: identity?.tag ?? null,
  };
}

function buildTemplatePayload(input: SnapshotInput) {
  const { kitState, category, overrideName } = input;
  return {
    name: overrideName || kitState.name || 'Template sem nome',
    category: category || 'Geral',
    ...templateIdentity(kitState.identity),
    box_data: kitState.box ? JSON.parse(JSON.stringify(kitState.box)) : null,
    items_data: JSON.parse(JSON.stringify(kitState.items)),
    personalization_data: JSON.parse(JSON.stringify(kitState.personalization)),
    total_price: kitState.totalPrice,
    volume_usage_percent: kitState.volumeUsagePercent,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
}

async function persistTemplate(input: SnapshotInput) {
  const payload = buildTemplatePayload(input);
  if (input.templateId) {
    const { data, error } = await supabase
      .from('kit_templates')
      .update(payload as never)
      .eq('id', input.templateId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('kit_templates')
    .insert(payload as never)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function useTemplateSnapshot() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: persistTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kit-templates'] });
      queryClient.invalidateQueries({ queryKey: ['kit-templates'] });
      toast.success('Template do sistema salvo!');
    },
    onError: (err: Error) => toast.error(`Erro ao salvar template: ${err.message}`),
  });

  return {
    saveAsTemplate: mutation.mutateAsync,
    isSavingTemplate: mutation.isPending,
  };
}
