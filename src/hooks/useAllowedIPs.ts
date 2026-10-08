import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { diagnostics } from '@/lib/diagnostics';
import { reportError } from '@/lib/error-reporter';
import { type Database } from '@/integrations/supabase/types';

type AllowedIP = Database['public']['Tables']['ip_whitelist']['Row'];

const UNKNOWN_ERROR_MESSAGE = 'Erro desconhecido';

export function useAllowedIPs(targetUserId?: string) {
  const { user } = useAuth();
  const [allowedIPs, setAllowedIPs] = useState<AllowedIP[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIP, setCurrentIP] = useState<string | null>(null);

  const userId = targetUserId || user?.id;

  // Buscar IP atual do usuário
  const fetchCurrentIP = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setCurrentIP(data.ip);
    } catch (error) {
      console.error('Error fetching current IP:', error);
    }
  }, []);

  const fetchAllowedIPs = useCallback(async () => {
    if (!userId) {
      setAllowedIPs([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ip_whitelist')
        .select('*')
        .or(`created_by.eq.${userId},created_by.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllowedIPs(data || []);
    } catch (error) {
      diagnostics.log('error', 'useAllowedIPs', `Erro ao buscar IPs: ${error instanceof Error ? error.message : String(error)}`);
      reportError(error instanceof Error ? error : new Error(String(error)), { context: 'fetchAllowedIPs', userId });
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCurrentIP();
    fetchAllowedIPs();
  }, [fetchCurrentIP, fetchAllowedIPs]);

  const addIP = useCallback(async (
    ipAddress: string, 
    label?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!userId || !user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .insert({
          created_by: userId,
          ip_address: ipAddress,
          label: label || null,
        });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Este IP já está cadastrado' };
        }
        throw error;
      }

      await fetchAllowedIPs();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE };
    }
  }, [userId, user, fetchAllowedIPs]);

  const removeIP = useCallback(async (
    ipId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .delete()
        .eq('id', ipId);

      if (error) throw error;

      await fetchAllowedIPs();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE };
    }
  }, [fetchAllowedIPs]);

  const toggleIP = useCallback(async (
    ipId: string, 
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('ip_whitelist')
        .update({ is_active: isActive })
        .eq('id', ipId);

      if (error) throw error;

      await fetchAllowedIPs();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE };
    }
  }, [fetchAllowedIPs]);

  const isIPAllowed = useCallback((ip: string): boolean => {
    // Se não há IPs configurados, permitir todos
    if (allowedIPs.length === 0) return true;
    
    // Verificar se o IP está na lista de permitidos ativos
    return allowedIPs.some(
      allowedIP => allowedIP.is_active && allowedIP.ip_address === ip
    );
  }, [allowedIPs]);

  const hasIPRestriction = allowedIPs.filter(ip => ip.is_active).length > 0;

  return {
    allowedIPs,
    isLoading,
    currentIP,
    hasIPRestriction,
    addIP,
    removeIP,
    toggleIP,
    isIPAllowed,
    refetch: fetchAllowedIPs,
  };
}
