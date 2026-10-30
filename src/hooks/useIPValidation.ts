import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IPValidationResult {
  isAllowed: boolean;
  currentIP: string | null;
  hasRestrictions: boolean;
  error?: string;
  reason?: string;
  details?: Record<string, unknown>;
}

interface AccessValidationResponse {
  allowed: boolean;
  reason: string;
  details?: Record<string, unknown>;
}

function valueOr<T>(value: T | null | undefined | false | "" | 0, fallback: T): T {
  return value ? value as T : fallback;
}

function accessDenialMessage(result: AccessValidationResponse, currentIP: string): string {
  const details = valueOr(result.details, {});
  if (result.reason === 'ip_not_whitelisted') {
    return `Seu IP (${currentIP}) não está autorizado para acessar o sistema.`;
  }
  if (result.reason === 'city_not_whitelisted') {
    return `Acesso negado: sua localização (${valueOr(details.detected_city, 'desconhecida')}) não está autorizada.`;
  }
  if (result.reason === 'too_many_attempts') {
    return `IP bloqueado temporariamente por excesso de tentativas. Tente novamente em ${valueOr(details.lockout_minutes, 15)} minutos.`;
  }
  return 'Acesso negado';
}

function accessValidationResult(data: unknown, currentIP: string): IPValidationResult {
  if (!data) return { isAllowed: true, currentIP, hasRestrictions: false };
  const result = data as AccessValidationResponse;
  if (result.allowed) {
    return {
      isAllowed: true,
      currentIP,
      hasRestrictions: result.reason !== 'no_settings',
    };
  }
  return {
    isAllowed: false,
    currentIP,
    hasRestrictions: true,
    error: accessDenialMessage(result, currentIP),
    reason: result.reason,
    details: result.details,
  };
}

export function useIPValidation() {
  const [isValidating, setIsValidating] = useState(false);

  // Buscar IP atual do usuário
  const fetchCurrentIP = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error fetching current IP:', error);
      return null;
    }
  }, []);

  // Validar IP para um usuário específico (por email) - pré-login
  const validateIPForUser = useCallback(async (_email: string): Promise<IPValidationResult> => {
    try {
      const currentIP = await fetchCurrentIP();
      return {
        isAllowed: true, // Validação completa acontece após login via edge function
        currentIP,
        hasRestrictions: false
      };
    } catch (error: unknown) {
      return {
        isAllowed: false,
        currentIP: null,
        hasRestrictions: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }, [fetchCurrentIP]);

  // Validar IP e cidade para usuário autenticado via edge function
  const validateIPForAuthenticatedUser = useCallback(async (_userId: string): Promise<IPValidationResult> => {
    setIsValidating(true);
    
    try {
      const currentIP = await fetchCurrentIP();
      
      if (!currentIP) {
        return {
          isAllowed: false,
          currentIP: null,
          hasRestrictions: false,
          error: 'Não foi possível identificar seu IP'
        };
      }

      // Chamar edge function validate-access
      const { data, error } = await supabase.functions.invoke('validate-access', {
        body: {
          ip: currentIP,
          userAgent: navigator.userAgent,
        },
      });

      if (error) {
        console.error('Error calling validate-access:', error);
        // Em caso de erro na validação, permitir acesso (fail-open)
        return {
          isAllowed: true,
          currentIP,
          hasRestrictions: false,
          error: error.message
        };
      }

      return accessValidationResult(data, currentIP);
    } catch (error: unknown) {
      console.error('Error in IP validation:', error);
      // Fail-open: se não conseguir validar, permite
      return {
        isAllowed: true,
        currentIP: null,
        hasRestrictions: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    } finally {
      setIsValidating(false);
    }
  }, [fetchCurrentIP]);

  // Registrar tentativa de login
  const logLoginAttempt = useCallback(async (
    email: string,
    userId: string | null,
    success: boolean,
    failureReason?: string
  ): Promise<void> => {
    try {
      const currentIP = await fetchCurrentIP();
      
      await supabase.functions.invoke('log-login-attempt', {
        body: {
          email,
          user_id: userId,
          ip_address: currentIP || 'unknown',
          success,
          failure_reason: failureReason || null,
          user_agent: navigator.userAgent,
        },
      });
    } catch (error) {
      console.error('Error logging login attempt:', error);
    }
  }, [fetchCurrentIP]);

  return {
    isValidating,
    fetchCurrentIP,
    validateIPForUser,
    validateIPForAuthenticatedUser,
    logLoginAttempt
  };
}
