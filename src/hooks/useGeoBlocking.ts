import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { diagnostics } from '@/lib/diagnostics';
import { reportError } from '@/lib/error-reporter';
import { type Database } from '@/integrations/supabase/types';

type AllowedCountry = Database['public']['Tables']['city_whitelist']['Row'];

const UNKNOWN_ERROR_MESSAGE = 'Erro desconhecido';

interface GeoBlockingSettings {
  enabled: boolean;
  mode: 'whitelist' | 'blacklist';
}

export function useGeoBlocking() {
  const { user } = useAuth();
  const [countries, setCountries] = useState<AllowedCountry[]>([]);
  const [settings, setSettings] = useState<GeoBlockingSettings>({ enabled: false, mode: 'whitelist' });
  const [isLoading, setIsLoading] = useState(true);
  const [currentCountry, setCurrentCountry] = useState<{ code: string; name: string } | null>(null);

  const fetchCurrentCountry = useCallback(async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setCurrentCountry({
        code: data.country_code,
        name: data.country_name,
      });
    } catch (error) {
      console.error('Error fetching current country:', error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [countriesRes, settingsRes] = await Promise.all([
        supabase
          .from('city_whitelist')
          .select('*')
          .order('city_name'),
        supabase
          .from('access_security_settings')
          .select('*')
          .limit(1)
          .single(),
      ]);

      if (countriesRes.error) throw countriesRes.error;
      setCountries(countriesRes.data || []);

      if (settingsRes.data) {
        setSettings({
          enabled: settingsRes.data.city_whitelist_enabled,
          mode: 'whitelist'
        });
      }
    } catch (error) {
      diagnostics.log('error', 'useGeoBlocking', `Erro ao buscar dados de geo-blocking: ${error instanceof Error ? error.message : String(error)}`);
      reportError(error instanceof Error ? error : new Error(String(error)), { context: 'fetchData' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentCountry();
    fetchData();
  }, [fetchCurrentCountry, fetchData]);

  const toggleEnabled = useCallback(async (enabled: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('access_security_settings')
        .update({ 
          city_whitelist_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .not('id', 'is', null); // Atualiza qualquer registro (deve haver apenas um)

      if (error) throw error;
      setSettings(prev => ({ ...prev, enabled }));
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE };
    }
  }, []);

  const addCountry = useCallback(async (
    countryCode: string,
    countryName: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'Usuário não autenticado' };
    }

    try {
      const { error } = await supabase
        .from('city_whitelist')
        .insert({
          city_name: countryName, // Temporariamente usando countryName como city_name para compatibilidade de UI
          country_code: countryCode.toUpperCase(),
          created_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          return { success: false, error: 'Este país já está cadastrado' };
        }
        throw error;
      }

      await fetchData();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE };
    }
  }, [user, fetchData]);

  const removeCountry = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('city_whitelist')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE };
    }
  }, [fetchData]);

  const toggleCountry = useCallback(async (
    id: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('city_whitelist')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchData();
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE };
    }
  }, [fetchData]);

  const isCountryAllowed = useCallback((countryCode: string): boolean => {
    if (!settings.enabled) return true;
    
    const activeCountries = countries.filter(c => c.is_active);
    if (activeCountries.length === 0) return true;
    
    return activeCountries.some(c => c.country_code.toUpperCase() === countryCode.toUpperCase());
  }, [settings.enabled, countries]);

  return {
    countries,
    settings,
    isLoading,
    currentCountry,
    isEnabled: settings.enabled,
    toggleEnabled,
    addCountry,
    removeCountry,
    toggleCountry,
    isCountryAllowed,
    refetch: fetchData,
  };
}
