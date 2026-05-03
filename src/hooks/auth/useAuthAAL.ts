import { useState, useCallback } from 'react';
import { authService } from '@/services/authService';

export function useAuthAAL() {
  const [currentAAL, setCurrentAAL] = useState<'aal1' | 'aal2' | null>(null);
  const [nextAAL, setNextAAL] = useState<'aal1' | 'aal2' | null>(null);
  const [hasMFA, setHasMFA] = useState(false);

  const fetchAAL = useCallback(async () => {
    try {
      const data = await authService.fetchAAL();
      setCurrentAAL(data.currentLevel);
      setNextAAL(data.nextLevel);
      setHasMFA(data.hasMFA);
    } catch (e) {
      // Fail silently in background
    }
  }, []);

  const clearAAL = useCallback(() => {
    setCurrentAAL(null);
    setNextAAL(null);
    setHasMFA(false);
  }, []);

  return { currentAAL, nextAAL, hasMFA, fetchAAL, clearAAL };
}
