import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

/** Estado do fator TOTP confirmado pelo Supabase Auth para a própria sessão. */
export function use2FA(targetUserId?: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId || (targetUserId && targetUserId !== userId)) {
      setIs2FAEnabled(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setIs2FAEnabled(data.totp.some((factor) => factor.status === 'verified'));
      setError(null);
    } catch (cause) {
      console.error('Erro ao consultar MFA:', cause);
      setIs2FAEnabled(false);
      setError(cause instanceof Error ? cause.message : 'Falha ao consultar MFA.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, targetUserId]);

  useEffect(() => { void refetch(); }, [refetch]);

  return { is2FAEnabled, isLoading, error, refetch };
}
