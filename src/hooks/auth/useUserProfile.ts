import { useState, useCallback } from 'react';
import { type Profile } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';
import { authDebugError } from '@/lib/auth/auth-debug';

export function useUserProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await authService.fetchProfile(userId);
      if (error) throw error;
      
      if (data) {
        setProfile(data as Profile);
        
        // Non-blocking update of last_login_at
        supabase
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("user_id", userId)
          .catch(() => {});
      }
    } catch (error) {
      authDebugError("useUserProfile", "Failed to fetch profile", error);
    }
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
  }, []);

  return { profile, fetchProfile, clearProfile };
}
