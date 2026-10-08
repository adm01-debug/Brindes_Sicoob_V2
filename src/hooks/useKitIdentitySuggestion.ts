/**
 * useKitIdentitySuggestion — invoca a edge function `kit-identity-suggest`
 * para gerar tag/cor/ícone a partir do nome + itens do kit.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IdentitySuggestion {
  tag: string;
  color: string;
  icon: string;
  rationale?: string;
}

interface Input {
  name: string;
  items: Array<{ name?: string; sku?: string }>;
  description?: string | null;
}

function parseSuggestion(data: unknown): IdentitySuggestion {
  const response = data as { error?: string; suggestion?: IdentitySuggestion } | null;
  if (response?.error) throw new Error(response.error);
  const suggestion = response?.suggestion;
  const complete = suggestion?.tag && suggestion.color && suggestion.icon;
  if (!complete) throw new Error('Sugestão incompleta');
  return suggestion;
}

export function useKitIdentitySuggestion() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<IdentitySuggestion | null>(null);

  const suggest = useCallback(async (input: Input): Promise<IdentitySuggestion | null> => {
    if (!input.name && input.items.length === 0) return null;
    setIsLoading(true);
    setSuggestion(null);
    try {
      const { data, error } = await supabase.functions.invoke('kit-identity-suggest', {
        body: input,
      });
      if (error) throw error;
      const s = parseSuggestion(data);
      setSuggestion(s);
      return s;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao sugerir identidade');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { suggest, suggestion, isLoading, clear: () => setSuggestion(null) };
}
