import { useState, useCallback } from 'react';
import { type Profile } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';
import { authDebugError } from '@/lib/auth/auth-debug';

export function useUserProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const { data, error } = await authService.fetchProfile(userId);
      if (error) throw error;
      
      if (data) {
        setProfile(prev => {
          if (prev?.user_id === data.user_id && prev?.updated_at === data.updated_at) return prev;
          return data as Profile;
        });
        
        // Background update of last_login_at
        authService.updateLastLogin(userId).catch(() => {});
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
